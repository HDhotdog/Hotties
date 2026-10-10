import {parseGermanStockInput} from './german-stock-input';

describe('German stock input', () => {
  it.each([
    ['Eine Brezel', 'Brezel', 1],
    ['Brezel', 'Brezel', 1],
    ['zwei Brezeln', 'Brezeln', 2],
    ['3 Stück Tomaten', 'Tomaten', 3],
    ['11 Äpfel', 'Äpfel', 11],
    ['elf Eier', 'Eier', 11],
    ['Kichererbsen', 'Kichererbsen', 1],
  ])('parses %s', (input, name, count) => {
    expect(parseGermanStockInput(input)).toEqual({name, count});
  });

  it('requires correction for an invalid count', () => {
    expect(parseGermanStockInput('0 Brezeln')).toEqual({name: 'Brezeln', count: null});
    expect(parseGermanStockInput('2,5 Äpfel')).toEqual({name: 'Äpfel', count: null});
    expect(parseGermanStockInput('ein paar Möhren')).toEqual({name: 'Möhren', count: null});
  });
});
