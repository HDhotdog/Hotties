import en from '../../assets/i18n/en.json';
import de from '../../assets/i18n/de.json';
import {LanguagePack} from '../i18n/language-pack';
import {parseStockInput} from './stock-input';

describe('Localized stock input', () => {
  it.each([
    ['Three tomatoes', 'Tomatoes', 3], ['one piece Onion', 'Onion', 1], ['2 apples', 'apples', 2],
    ['some potatoes', 'potatoes', null], ['a few apples', 'apples', null], ['one and a half apples', 'apples', null],
    ['1.5 apples', 'apples', null], ['0 apples', 'apples', null], ['1000 apples', 'apples', null],
  ])('parses English %s conservatively', (raw, name, count) => {
    const result = parseStockInput(raw, en as LanguagePack);
    expect(result.name.toLowerCase()).toBe(name.toLowerCase()); expect(result.count).toBe(count);
  });
  it.each([
    ['Drei Tomaten', 'Tomaten', 3], ['Eine Brezel', 'Brezel', 1], ['2 Stück Äpfel', 'Äpfel', 2],
    ['ein paar Äpfel', 'Äpfel', null], ['1,5 Äpfel', 'Äpfel', null],
  ])('parses German %s conservatively', (raw, name, count) => {
    expect(parseStockInput(raw, de as LanguagePack)).toEqual({name, count});
  });
});
