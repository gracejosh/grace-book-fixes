import { checkProfanity } from 'glin-profanity';

const MAX_BAD_WORDS = 3;
const REPLACE_WITH = '****';

export interface ProfanityResult {
  cleaned: string;
  hasProfanity: boolean;
  blocked: boolean;
  badWordCount: number;
}

export function filterText(text: string): ProfanityResult {
  const result = checkProfanity(text, {
    languages: ['english'],
    detectLeetspeak: true,
    normalizeUnicode: true,
    autoReplace: true,
    replaceWith: REPLACE_WITH,
  });

  const badWordCount = result.profaneWords.length;
  return {
    cleaned: result.autoReplaced,
    hasProfanity: result.containsProfanity,
    blocked: badWordCount >= MAX_BAD_WORDS,
    badWordCount,
  };
}
