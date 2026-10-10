import {Capacitor, CapacitorHttp} from '@capacitor/core';
import {OpenFoodFactsService, ProductLookupError} from './open-food-facts.service';

jest.mock('@capacitor/core', () => {
  const actual = jest.requireActual('@capacitor/core');
  return {
    ...actual,
    Capacitor: {...actual.Capacitor, isNativePlatform: jest.fn()},
    CapacitorHttp: {get: jest.fn()},
  };
});

describe('OpenFoodFactsService', () => {
  let service: OpenFoodFactsService;
  let get: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    get = CapacitorHttp.get as jest.Mock;
    get.mockResolvedValue({
      status: 200,
      data: {product: {product_name: 'Oat milk', brands: 'Oatly', quantity: '1 l'}},
      headers: {}, url: '',
    });
    service = new OpenFoodFactsService();
  });

  afterEach(() => jest.clearAllMocks());

  it('requests only relevant v3 fields with app identification and maps product details', async () => {
    await expect(service.getProduct('1234567890123')).resolves.toEqual({
      barcode: '1234567890123', name: 'Oat milk', brand: 'Oatly', packageQuantity: '1 l',
    });
    expect(get).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://world.openfoodfacts.org/api/v3/product/1234567890123',
      params: {fields: 'code,product_name,generic_name,brands,quantity'},
      headers: expect.objectContaining({'User-Agent': expect.stringContaining('Hotties/')})
    }));
  });

  it('enforces a rolling limit before the 15th read', async () => {
    for (let i = 0; i < 14; i++) {
      await service.getProduct(String(10000000 + i));
    }
    await expect(service.getProduct('10000014')).rejects.toMatchObject({code: 'rate-limited'});
    expect(get).toHaveBeenCalledTimes(14);
  });

  it('does not request unsupported barcodes or browser requests', async () => {
    await expect(service.getProduct('abc')).rejects.toBeInstanceOf(ProductLookupError);
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
    await expect(service.getProduct('12345678')).rejects.toMatchObject({code: 'native-only'});
    expect(get).not.toHaveBeenCalled();
  });

  it('distinguishes unknown products and server throttling', async () => {
    get.mockResolvedValueOnce({status: 404, data: {}, headers: {}, url: ''});
    await expect(service.getProduct('12345678')).rejects.toMatchObject({code: 'not-found'});
    get.mockResolvedValueOnce({status: 429, data: {}, headers: {}, url: ''});
    await expect(service.getProduct('12345679')).rejects.toMatchObject({code: 'rate-limited'});
    await expect(service.getProduct('12345670')).rejects.toMatchObject({code: 'rate-limited'});
    expect(get).toHaveBeenCalledTimes(2);
  });
});
