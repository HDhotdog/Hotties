import {TestBed} from '@angular/core/testing';
import {RxDatabase} from 'rxdb';
import {DatabaseService} from '../database/database';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {OpenFoodFactsService, ProductLookupError} from './open-food-facts.service';
import {OFF_CACHE_TTL_MS, OffProductCacheService} from './off-product-cache.service';

describe('OffProductCacheService', () => {
  let db: RxDatabase;
  let cache: OffProductCacheService;
  let getProduct: jest.Mock;
  const product = {barcode: '1234567890123', name: 'Oat milk', brand: null, packageQuantity: '1 l'};

  beforeEach(async () => {
    const testDb = await createTestDatabase(false);
    db = testDb.db;
    getProduct = jest.fn().mockResolvedValue(product);
    TestBed.configureTestingModule({providers: [
      {provide: DatabaseService, useValue: testDb.accessor},
      {provide: OpenFoodFactsService, useValue: {getProduct}},
    ]});
    cache = TestBed.inject(OffProductCacheService);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await db.close();
  });

  it('uses persistent hits until 28 days have passed', async () => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    expect(await cache.lookup(product.barcode)).toEqual(product);
    expect(await cache.lookup(product.barcode)).toEqual(product);
    expect(getProduct).toHaveBeenCalledTimes(1);
    (Date.now as jest.Mock).mockReturnValue(now + OFF_CACHE_TTL_MS);
    await cache.lookup(product.barcode);
    expect(getProduct).toHaveBeenCalledTimes(2);
  });

  it('caches confirmed misses but allows an explicit retry', async () => {
    getProduct.mockRejectedValueOnce(new ProductLookupError('not-found', 'Missing'));
    await expect(cache.lookup(product.barcode)).rejects.toMatchObject({code: 'not-found'});
    await expect(cache.lookup(product.barcode)).rejects.toMatchObject({code: 'not-found'});
    expect(getProduct).toHaveBeenCalledTimes(1);
    await expect(cache.lookup(product.barcode, true)).resolves.toEqual(product);
    expect(getProduct).toHaveBeenCalledTimes(2);
  });

  it('rechecks a confirmed miss when it expires', async () => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    getProduct.mockRejectedValueOnce(new ProductLookupError('not-found', 'Missing'));
    await expect(cache.lookup(product.barcode)).rejects.toMatchObject({code: 'not-found'});
    (Date.now as jest.Mock).mockReturnValue(now + OFF_CACHE_TTL_MS);
    await expect(cache.lookup(product.barcode)).resolves.toEqual(product);
    expect(getProduct).toHaveBeenCalledTimes(2);
  });

  it('records a declined refresh review for the current cache version', async () => {
    await cache.lookup(product.barcode);
    const original = await cache.getEntry(product.barcode);
    expect(original?.reviewedAt).toBeNull();
    await cache.markReviewed(product.barcode);
    expect((await cache.getEntry(product.barcode))?.reviewedAt).toBe(original?.fetchedAt);
  });

  it('deduplicates concurrent lookups and never caches transient failures', async () => {
    const [a, b] = await Promise.all([cache.lookup(product.barcode), cache.lookup(product.barcode)]);
    expect([a, b]).toEqual([product, product]);
    expect(getProduct).toHaveBeenCalledTimes(1);
    getProduct.mockRejectedValueOnce(new ProductLookupError('network', 'Offline'));
    await expect(cache.lookup('1234567890124')).rejects.toMatchObject({code: 'network'});
    expect(await cache.getEntry('1234567890124')).toBeNull();
    getProduct.mockRejectedValueOnce(new ProductLookupError('rate-limited', 'Wait'));
    await expect(cache.lookup('1234567890125')).rejects.toMatchObject({code: 'rate-limited'});
    expect(await cache.getEntry('1234567890125')).toBeNull();
  });

  it.each(['2012345678901', '2812345678901', '2914374003049', '2914374'])
  ('never sends %s to OFF, even for a forced retry', async barcode => {
    await expect(cache.lookup(barcode, true)).rejects.toMatchObject({code: 'internal-barcode'});
    expect(getProduct).not.toHaveBeenCalled();
  });
});
