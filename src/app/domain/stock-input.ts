import {LanguagePack} from '../i18n/language-pack';
export interface StockInput {name: string; count: number | null}

/** Interpret only explicit whole counts. Ambiguous amounts always require review. */
export function parseStockInput(raw: string, pack: LanguagePack): StockInput {
  const text = raw.trim().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
  const lower = text.toLocaleLowerCase(pack.meta.locale);
  const uncertain = pack.input.uncertainPrefixes.slice().sort((a, b) => b.length - a.length)
    .find(prefix => lower.startsWith(prefix.toLocaleLowerCase(pack.meta.locale) + ' '));
  if (uncertain) return {name: text.slice(uncertain.length).trim(), count: null};
  const match = text.match(/^([^\s]+)\s+(.+)$/u);
  if (!match) return {name: text, count: text ? 1 : null};
  const first = match[1].toLocaleLowerCase(pack.meta.locale);
  const numeric = /^[-+]?\d+(?:[,.]\d+)?$/.test(first);
  const count = numeric ? Number(first.replace(',', '.')) : pack.input.countWords[first];
  if (count === undefined) return {name: text, count: 1};
  let name = match[2];
  const piece = pack.input.pieceWords.find(word => name.toLocaleLowerCase(pack.meta.locale).startsWith(word + ' '));
  if (piece) name = name.slice(piece.length).trim();
  return {name, count: Number.isSafeInteger(count) && count >= 1 && count <= 999 ? count : null};
}
