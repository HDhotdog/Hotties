export interface GermanStockInput {
  name: string;
  count: number | null;
}

const COUNT_WORDS: Record<string, number> = {
  ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eins: 1,
  zwei: 2, drei: 3, vier: 4, fuenf: 5, fünf: 5,
  sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  elf: 11, zwölf: 12, zwoelf: 12, dreizehn: 13, vierzehn: 14,
  fünfzehn: 15, fuenfzehn: 15, sechzehn: 16, siebzehn: 17,
  achtzehn: 18, neunzehn: 19, zwanzig: 20,
};

const UNCERTAIN_QUANTITY = /^(?:ein\s+paar|einige|mehrere|etliche|viele|halbe?|anderthalb|eineinhalb|dutzend)\s+/iu;

/** Parses a short German product utterance without guessing an unknown amount. */
export function parseGermanStockInput(raw: string): GermanStockInput {
  const text = raw.trim().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
  const uncertain = text.match(UNCERTAIN_QUANTITY);
  if (uncertain) return {name: text.slice(uncertain[0].length), count: null};
  const match = text.match(/^([^\s]+)\s+(.+)$/u);
  if (!match) return {name: text, count: text ? 1 : null};

  const first = match[1].toLocaleLowerCase('de-DE');
  const numeric = /^[-+]?\d+(?:[,.]\d+)?$/.test(first);
  const count = numeric ? Number(first.replace(',', '.')) : COUNT_WORDS[first];
  if (count === undefined) return {name: text, count: 1};
  if (!Number.isSafeInteger(count) || count < 1 || count > 999) {
    return {name: match[2], count: null};
  }

  return {name: match[2].replace(/^st[üu]ck\s+/iu, ''), count};
}
