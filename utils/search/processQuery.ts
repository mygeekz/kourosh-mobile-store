// utils/search/processQuery.ts
import { normalizeFaQuery } from './faNormalize';
import { correctQueryTokens } from './faSpell';
import { expandSynonyms } from './synonyms';

export type ProcessedQuery = {
  raw: string;
  normalized: string;
  final: string;
  suggestion?: string;
  expanded?: string;
};

const looksLikeExactCodeToken = (token: string) => /[a-zA-Z]/.test(token) && /\d/.test(token);
const shouldSkipSpellCorrection = (tokens: string[]) => tokens.some((token) => {
  if (!token) return false;
  if (looksLikeExactCodeToken(token)) return true;
  if (/\d/.test(token)) return true;
  if (token.length <= 2) return true;
  return false;
});

export function processQuery(input: string): ProcessedQuery {
  const raw = input ?? '';
  const normalized = normalizeFaQuery(raw);
  const tokens = normalized.split(' ').filter(Boolean);

  const skipCorrection = shouldSkipSpellCorrection(tokens);
  const { corrected, changed } = skipCorrection
    ? { corrected: tokens, changed: false }
    : correctQueryTokens(tokens);
  const correctedStr = corrected.join(' ');

  const final = changed ? correctedStr : normalized;
  const expanded = expandSynonyms(corrected).join(' ');

  return { raw, normalized, final, suggestion: changed ? correctedStr : undefined, expanded };
}
