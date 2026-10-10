import {Injectable} from '@angular/core';
import {Capacitor, CapacitorHttp} from '@capacitor/core';
import {VERSION} from '../../environments/version';
import {isInternalBarcode} from './internal-barcode';

export interface FoodProduct {
  barcode: string;
  name: string;
  brand: string | null;
  packageQuantity: string | null;
}

export type ProductLookupErrorCode =
  'invalid-barcode'
  | 'internal-barcode'
  | 'native-only'
  | 'rate-limited'
  | 'not-found'
  | 'network'
  | 'invalid-response';

export class ProductLookupError extends Error {
  constructor(public readonly code: ProductLookupErrorCode, message: string) {
    super(message);
  }
}

const REQUEST_HISTORY_KEY = 'hotties:off-product-requests';
const COOLDOWN_KEY = 'hotties:off-product-cooldown';
const WINDOW_MS = 60_000;
// OFF allows 15 product reads/minute/IP. Leave one request of headroom for clock drift.
const MAX_REQUESTS_PER_WINDOW = 14;
const USER_AGENT = `Hotties/${VERSION} (https://github.com/HDhotdog/Hotties)`;

@Injectable({providedIn: 'root'})
export class OpenFoodFactsService {
  private fallbackHistory: number[] = [];
  private fallbackCooldown = 0;

  public async getProduct(barcode: string): Promise<FoodProduct> {
    if (isInternalBarcode(barcode)) {
      throw new ProductLookupError('internal-barcode', 'Internal barcodes are handled locally.');
    }
    if (!/^\d{8,14}$/.test(barcode)) {
      throw new ProductLookupError('invalid-barcode', 'Enter a valid 8–14 digit food barcode.');
    }
    // Browsers forbid setting User-Agent. Native HTTP sends the identification OFF requests.
    if (!Capacitor.isNativePlatform()) {
      throw new ProductLookupError('native-only', 'Product lookup is available in the installed mobile app.');
    }

    this.reserveRequest();
    let response;
    try {
      response = await CapacitorHttp.get({
        url: `https://world.openfoodfacts.org/api/v3/product/${barcode}`,
        params: {fields: 'code,product_name,generic_name,brands,quantity'},
        headers: {'User-Agent': USER_AGENT, Accept: 'application/json'},
        connectTimeout: 10_000,
        readTimeout: 10_000,
      });
    } catch {
      throw new ProductLookupError('network', 'Could not connect to Open Food Facts. Check your internet connection and try again.');
    }

    if (response.status === 429 || response.status === 503) {
      this.setCooldown(Date.now() + WINDOW_MS);
      throw new ProductLookupError('rate-limited', 'Open Food Facts is busy. Please try again in about a minute.');
    }
    if (response.status === 404) {
      throw new ProductLookupError('not-found', 'This barcode is not in Open Food Facts.');
    }
    if (response.status !== 200) {
      throw new ProductLookupError('network', 'Open Food Facts could not return this product. Please try again.');
    }

    const body = typeof response.data === 'string' ? this.parseJson(response.data) : response.data;
    const product = body?.product;
    const name = this.optionalText(product?.product_name) ?? this.optionalText(product?.generic_name);
    if (!name) {
      throw new ProductLookupError('invalid-response', 'This product has no name in Open Food Facts.');
    }
    return {
      barcode,
      name: name.slice(0, 255),
      brand: this.optionalText(product?.brands),
      packageQuantity: this.optionalText(product?.quantity),
    };
  }

  private reserveRequest(): void {
    const now = Date.now();
    const storedCooldown = this.readNumber(COOLDOWN_KEY, this.fallbackCooldown);
    if (storedCooldown > now) {
      throw new ProductLookupError('rate-limited', 'Please wait before scanning another new product.');
    }
    const history = this.readHistory().filter((time) => time > now - WINDOW_MS && time <= now);
    if (history.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new ProductLookupError('rate-limited', 'Too many new product lookups. Please try again in a minute.');
    }
    history.push(now);
    this.fallbackHistory = history;
    this.writeStorage(REQUEST_HISTORY_KEY, JSON.stringify(history));
  }

  private readHistory(): number[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(REQUEST_HISTORY_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((time): time is number => typeof time === 'number') : [];
    } catch {
      return this.fallbackHistory;
    }
  }

  private readNumber(key: string, fallback: number): number {
    try {
      return Number(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  private setCooldown(until: number): void {
    this.fallbackCooldown = until;
    this.writeStorage(COOLDOWN_KEY, String(until));
  }

  private writeStorage(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch { /* In-memory limit still applies in this session. */
    }
  }

  private parseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private optionalText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
