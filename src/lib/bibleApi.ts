export interface BibleVerseData {
  text: string;
  reference: string;
  referenceAm?: string;
  translation?: string;
}

/**
 * Fetch a random Bible verse from labs.bible.org (no API key needed).
 */
export async function fetchRandomVerse(): Promise<BibleVerseData | null> {
  try {
    const res = await fetch('https://labs.bible.org/api/?passage=random&type=json');
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const v = data[0];
      return {
        text: v.text.replace(/<[^>]+>/g, ''),
        reference: `${v.bookname} ${v.chapter}:${v.verse}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch a specific verse from bible-api.com (no API key needed).
 * Example: fetchEnglishVerse('john', '3:16')
 */
export async function fetchEnglishVerse(book: string, chapterVerse: string): Promise<BibleVerseData | null> {
  try {
    const res = await fetch(`https://bible-api.com/${book}+${chapterVerse}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.text) {
      return {
        text: data.text.trim(),
        reference: data.reference,
        translation: data.translation_name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch a specific verse in Amharic from getbible.net (no API key needed).
 * Example: fetchAmharicVerse('john', '3', '16')
 */
export async function fetchAmharicVerse(book: string, chapter: string, verse: string): Promise<BibleVerseData | null> {
  try {
    const res = await fetch(`https://getbible.net/v2/amharic/${book}/${chapter}/${verse}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.verses && data.verses.length > 0) {
      const v = data.verses[0];
      const bookName = data.book?.name ?? book;
      return {
        text: v.text.trim(),
        reference: `${bookName} ${chapter}:${verse}`,
        referenceAm: `${bookName} ${chapter}:${verse}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch a verse in the specified language, with automatic fallback.
 */
export async function fetchVerseForLang(lang: 'en' | 'am', book: string, chapter: string, verse: string): Promise<BibleVerseData | null> {
  if (lang === 'am') {
    const am = await fetchAmharicVerse(book, chapter, verse);
    if (am) return am;
  }
  return fetchEnglishVerse(book, `${chapter}:${verse}`);
}
