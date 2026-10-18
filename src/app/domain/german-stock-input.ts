import de from '../../assets/i18n/de.json';
import {LanguagePack} from '../i18n/language-pack';
import {parseStockInput, StockInput} from './stock-input';
export type GermanStockInput = StockInput;
export function parseGermanStockInput(raw: string): GermanStockInput {return parseStockInput(raw, de as LanguagePack);}
