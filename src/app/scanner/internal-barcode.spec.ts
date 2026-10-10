import {decodeWeightedBarcode, isInternalBarcode} from './internal-barcode';

describe('internal barcode routing', () => {
  it('decodes the supplied weight examples', () => {
    expect(decodeWeightedBarcode('2914374003049')).toEqual({productCode: '14374', grams: 304});
    expect(decodeWeightedBarcode('2917369006841')).toEqual({productCode: '17369', grams: 684});
  });

  it.each(['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'])
  ('classifies %s as internal before any lookup', prefix => {
    expect(isInternalBarcode(`${prefix}12345678901`)).toBe(true);
  });

  it.each(['2914374003048', '2914374000000', '2914374', '2814374003049'])
  ('rejects an invalid or unsupported format: %s', barcode => {
    expect(() => decodeWeightedBarcode(barcode)).toThrow();
  });
});
