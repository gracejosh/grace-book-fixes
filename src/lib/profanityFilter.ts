import { Filter } from 'glin-profanity';

const MAX_BAD_WORDS = 3;
const REPLACE_WITH = '****';

const filter = new Filter({
  languages: ['english'],
  replaceWith: REPLACE_WITH,
});

export interface ProfanityResult {
  cleaned: string;
  hasProfanity: boolean;
  blocked: boolean;
  badWordCount: number;
}

export function filterText(text: string): ProfanityResult {
  const result = filter.checkProfanity(text);

  const badWordCount = result.profaneWords.length;
  return {
    cleaned: result.processedText ?? text,
    hasProfanity: result.containsProfanity,
    blocked: badWordCount >= MAX_BAD_WORDS,
    badWordCount,
  };
}
