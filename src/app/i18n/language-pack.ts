export interface LanguagePack {
  meta: {code: string; nativeName: string; locale: string; direction: 'ltr' | 'rtl'; firstDayOfWeek: number};
  messages: Record<string, string>;
  input: {countWords: Record<string, number>; uncertainPrefixes: string[]; pieceWords: string[]; nameSuffixes: {suffix: string; replacement: string}[]};
}

export interface MessageRef {key: string; params: Record<string, string | number>}
export type Message = string | MessageRef;
export function message(key: string, params: MessageRef['params']): MessageRef { return {key, params}; }

/** Stable presentation key plus an English diagnostic for logs and tooling. */
export class AppError extends Error {
  constructor(public readonly translationKey: string, diagnostic: string, public readonly params: MessageRef['params'] = {}) {
    super(diagnostic);
    this.name = 'AppError';
  }
}
