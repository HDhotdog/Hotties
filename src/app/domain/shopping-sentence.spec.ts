import {parseShoppingSentenceResult} from './shopping-sentence';

describe('shopping sentence model output', () => {
  it('accepts German quantities and keeps an unspecified unit for review', () => {
    expect(parseShoppingSentenceResult(JSON.stringify([
      {name: 'Kartoffeln', amount: 1, unit: 'kg'},
      {name: 'Eier', amount: 1, unit: 'Packung'},
      {name: 'Tomaten', amount: 3, unit: null}
    ]))).toEqual([
      {name: 'Kartoffeln', amount: 1, unit: 'kg'},
      {name: 'Eier', amount: 1, unit: 'package'},
      {name: 'Tomaten', amount: 3, unit: null}
    ]);
  });

  it('rejects invalid JSON, invented units, and invalid quantities', () => {
    expect(() => parseShoppingSentenceResult('Here are your items')).toThrow();
    expect(() => parseShoppingSentenceResult('[{"name":"Eier","amount":1,"unit":"Kiste"}]')).toThrow(/unknown unit/);
    expect(() => parseShoppingSentenceResult('[{"name":"Eier","amount":-1,"unit":null}]')).toThrow(/invalid amount/);
  });
});
