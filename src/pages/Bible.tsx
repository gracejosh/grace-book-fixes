import { useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";

type FontSize = "small" | "medium" | "large";

interface Verse {
  number: string;
  text: string;
}

interface Chapter {
  number: number;
  verses: Verse[];
}

interface Book {
  id: string;
  name: string;
  chapters: Chapter[];
  rawChapters: unknown[];
}

interface SearchResult {
  book: string;
  bookId: string;
  chapter: number;
  verse: string;
  text: string;
}

const BOOK_NAMES = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

const BOOK_ALIASES: Record<string, string> = {
  "song of songs": "Song of Solomon",
  canticles: "Song of Solomon",
  psalm: "Psalms",
  psalms: "Psalms",
  revelation: "Revelation",
  revelations: "Revelation",
};

const FONT_SIZE_KEY = "bible:font-size";
const BOOKMARKS_KEY = "bible:bookmarks";
const CHAPTER_CACHE_PREFIX = "bible:chapter:";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
};

const asText = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return "";
};

const asNumber = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(asText(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBookName = (value: unknown, index: number): string => {
  const rawName = asText(value) || BOOK_NAMES[index] || `Book ${index + 1}`;
  const normalized = rawName.toLowerCase().replace(/\s+/g, " ").trim();
  return BOOK_ALIASES[normalized] || rawName;
};

const getItems = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    return Object.entries(value).map(([key, item]) => {
      if (isRecord(item)) return { ...item, __key: key };
      return { __key: key, value: item };
    });
  }
  return [];
};

const getRawBooks = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];
  const books = firstValue(data, ["books", "book", "Bible", "bible", "data"]);
  return getItems(books === undefined ? data : books);
};

const getRawChapters = (book: unknown): unknown[] => {
  if (!isRecord(book)) return [];
  const chapters = firstValue(book, ["chapters", "chapter", "contents"]);
  if (chapters !== undefined) return getItems(chapters);
  if (book.value !== undefined) return getItems(book.value);
  return [];
};

const getRawVerses = (chapter: unknown): unknown[] => {
  if (Array.isArray(chapter)) return chapter;
  if (!isRecord(chapter)) return [];
  const verses = firstValue(chapter, ["verses", "verse", "lines", "text"]);
  if (typeof verses === "string") return [{ text: verses }];
  if (verses !== undefined) return getItems(verses);
  if (chapter.value !== undefined) {
    return typeof chapter.value === "string"
      ? [{ text: chapter.value }]
      : getItems(chapter.value);
  }
  return getItems(verses);
};

const normalizeVerseNumber = (value: unknown, fallback: number): string => {
  const text = asText(value).replace(/\s+/g, "");
  return text || String(fallback);
};

const normalizeChapter = (rawChapter: unknown, chapterIndex: number): Chapter => {
  const chapterRecord = isRecord(rawChapter) ? rawChapter : {};
  const chapterNumber = asNumber(
    firstValue(chapterRecord, ["number", "chapter", "chapterNumber", "id"]) ||
      chapterRecord.__key,
    chapterIndex + 1,
  );

  const verses = getRawVerses(rawChapter)
    .map((rawVerse, verseIndex): Verse => {
      const verseRecord = isRecord(rawVerse) ? rawVerse : {};
      const text =
        typeof rawVerse === "string"
          ? rawVerse.trim()
          : asText(firstValue(verseRecord, ["text", "verse", "content", "value", "line"]));
      const number = normalizeVerseNumber(
        firstValue(verseRecord, ["number", "verseNumber", "id", "label"]) ||
          verseRecord.__key,
        verseIndex + 1,
      );
      return { number, text };
    })
    .filter((verse) => verse.text.length > 0 || verse.number.length > 0);

  return {
    number: chapterNumber,
    verses: verses.sort((a, b) => {
      const aNumber = Number.parseInt(a.number, 10);
      const bNumber = Number.parseInt(b.number, 10);
      return (
        (Number.isFinite(aNumber) ? aNumber : 0) -
        (Number.isFinite(bNumber) ? bNumber : 0)
      );
    }),
  };
};

const normalizeBooks = (data: unknown): Book[] => {
  const rawBooks = getRawBooks(data);

  return rawBooks
    .map((rawBook, bookIndex): Book => {
      const bookRecord = isRecord(rawBook) ? rawBook : {};
      const bookName = normalizeBookName(
        firstValue(bookRecord, ["name", "book", "title", "bookName", "label"]) ||
          bookRecord.__key,
        bookIndex,
      );

      const rawChapters = getRawChapters(rawBook);
      const chapterEntries = rawChapters
        .map((rawChapter, chapterIndex) => {
          const chapterRecord = isRecord(rawChapter) ? rawChapter : {};
          return {
            rawChapter,
            number: asNumber(
              firstValue(chapterRecord, ["number", "chapter", "chapterNumber", "id"]) ||
                chapterRecord.__key,
              chapterIndex + 1,
            ),
          };
        })
        .sort((a, b) => a.number - b.number);

      return {
        id: `${slugify(bookName) || "book"}-${bookIndex}`,
        name: bookName,
        chapters: chapterEntries.map((entry) => ({ number: entry.number, verses: [] })),
        rawChapters: chapterEntries.map((entry) => entry.rawChapter),
      };
    })
    .filter((book) => book.chapters.length > 0);
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const chapterCacheKey = (bookId: string, chapterNumber: number) =>
  `${CHAPTER_CACHE_PREFIX}${bookId}:${chapterNumber}`;

const safeRead = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
};

const safeWrite = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable or full. The reader still works in memory.
  }
};

const readFontSize = (): FontSize => {
  const stored = safeRead<string>(FONT_SIZE_KEY, "medium");
  return stored === "small" || stored === "large" ? stored : "medium";
};

const readBookmarks = (): string[] => {
  const stored = safeRead<unknown>(BOOKMARKS_KEY, []);
  return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : [];
};

const collapseCombinedVerses = (verses: Verse[]): Verse[] => {
  const collapsed: Verse[] = [];

  for (let index = 0; index < verses.length; index += 1) {
    const current = verses[index];
    const next = verses[index + 1];
    const currentNumber = Number.parseInt(current.number, 10);
    const nextNumber = next ? Number.parseInt(next.number, 10) : Number.NaN;

    if (
      current.text.trim() === "" &&
      next &&
      next.text.trim() !== "" &&
      Number.isFinite(currentNumber) &&
      Number.isFinite(nextNumber) &&
      nextNumber === currentNumber + 1
    ) {
      collapsed.push({ ...next, number: `${currentNumber}-${nextNumber}` });
      index += 1;
      continue;
    }

    collapsed.push(current);
  }

  return collapsed.filter((verse) => verse.text.trim() !== "");
};

const formatChapterLabel = (chapter: Chapter) => `Chapter ${chapter.number}`;

const padNumber = (value: number) => (value < 10 ? `0${value}` : String(value));

const runSoon = (callback: () => void) => {
  if (typeof window === "undefined") return 0;
  return window.setTimeout(callback, 0);
};

const cancelSoon = (timer: number) => {
  if (typeof window !== "undefined" && timer) window.clearTimeout(timer);
};

export default function Bible() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedChapterNumber, setSelectedChapterNumber] = useState(1);
  const [visibleChapter, setVisibleChapter] = useState<Chapter | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>(readFontSize);
  const [bookmarks, setBookmarks] = useState<string[]>(readBookmarks);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isBookSheetOpen, setIsBookSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const chapterMemory = useRef<Record<string, Chapter>>({});
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadBible = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/amharic_bible.json", { cache: "no-cache" });
        if (!response.ok) {
          throw new Error(`Bible data could not be loaded (${response.status}).`);
        }

        const data: unknown = await response.json();
        const normalizedBooks = normalizeBooks(data);

        if (normalizedBooks.length === 0) {
          throw new Error("The Bible data file contains no readable books.");
        }

        if (!cancelled) {
          setBooks(normalizedBooks);
          setSelectedBookId(normalizedBooks[0].id);
          setSelectedChapterNumber(normalizedBooks[0].chapters[0]?.number || 1);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load the Bible.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadBible();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedBook = useMemo(
    () => books.find((book) => book.id === selectedBookId) || null,
    [books, selectedBookId],
  );

  useEffect(() => {
    if (!selectedBook) {
      setVisibleChapter(null);
      setChapterLoading(false);
      return;
    }

    let cancelled = false;
    const chapterIndex = Math.max(
      0,
      selectedBook.chapters.findIndex((item) => item.number === selectedChapterNumber),
    );
    const chapter = selectedBook.chapters[chapterIndex] || selectedBook.chapters[0];

    if (!chapter) {
      setVisibleChapter(null);
      setChapterLoading(false);
      return;
    }

    const cacheKey = chapterCacheKey(selectedBook.id, chapter.number);
    const memoryChapter = chapterMemory.current[cacheKey];
    const cachedChapter = safeRead<Chapter | null>(cacheKey, null);
    const hydratedChapter = memoryChapter || cachedChapter;

    setChapterLoading(true);
    setVisibleChapter(hydratedChapter || null);

    const timer = runSoon(() => {
      if (cancelled) return;

      const nextChapter =
        hydratedChapter ||
        normalizeChapter(selectedBook.rawChapters[chapterIndex], chapterIndex);

      chapterMemory.current[cacheKey] = nextChapter;
      safeWrite(cacheKey, nextChapter);
      if (!cancelled) {
        setVisibleChapter(nextChapter);
        setChapterLoading(false);
      }
    });

    return () => {
      cancelled = true;
      cancelSoon(timer);
    };
  }, [selectedBook, selectedChapterNumber]);

  useEffect(() => {
    safeWrite(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  useEffect(() => {
    safeWrite(BOOKMARKS_KEY, bookmarks);
  }, [bookmarks]);

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  const makeVerseKey = (bookId: string, chapter: number, verse: string) =>
    `${bookId}:${chapter}:${verse}`;

  const toggleBookmark = (verseNumber: string, chapterNumber = selectedChapterNumber) => {
    if (!selectedBook) return;

    const key = makeVerseKey(selectedBook.id, chapterNumber, verseNumber);
    setBookmarks((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const handleBookChange = (bookId: string) => {
    const nextBook = books.find((book) => book.id === bookId);
    setSelectedBookId(bookId);
    setSelectedChapterNumber(nextBook?.chapters[0]?.number || 1);
    setIsBookSheetOpen(false);
  };

  const handleChapterChange = (chapterNumber: number) => {
    setSelectedChapterNumber(chapterNumber);
  };

  useEffect(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query && !showBookmarksOnly) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = runSoon(() => {
      const results: SearchResult[] = [];

      books.forEach((book) => {
        book.chapters.forEach((chapter, chapterIndex) => {
          const cacheKey = chapterCacheKey(book.id, chapter.number);
          const chapterData =
            chapterMemory.current[cacheKey] ||
            safeRead<Chapter | null>(cacheKey, null) ||
            normalizeChapter(book.rawChapters[chapterIndex], chapterIndex);

          chapterMemory.current[cacheKey] = chapterData;
          collapseCombinedVerses(chapterData.verses).forEach((verse) => {
            const isBookmarked = bookmarkSet.has(
              makeVerseKey(book.id, chapter.number, verse.number),
            );
            const matchesQuery =
              !query ||
              `${book.name} ${chapter.number}:${verse.number} ${verse.text}`
                .toLocaleLowerCase()
                .includes(query);

            if (matchesQuery && (!showBookmarksOnly || isBookmarked)) {
              results.push({
                book: book.name,
                bookId: book.id,
                chapter: chapter.number,
                verse: verse.number,
                text: verse.text,
              });
            }
          });
        });
      });

      if (!cancelled) {
        setSearchResults(results);
        setSearching(false);
      }
    });

    return () => {
      cancelled = true;
      cancelSoon(timer);
    };
  }, [books, bookmarkSet, searchQuery, showBookmarksOnly]);

  const displayedVerses = visibleChapter ? collapseCombinedVerses(visibleChapter.verses) : [];
  const currentBookIndex = selectedBook
    ? Math.max(0, books.findIndex((book) => book.id === selectedBook.id))
    : 0;
  const currentChapterIndex = selectedBook
    ? Math.max(
        0,
        selectedBook.chapters.findIndex((chapter) => chapter.number === selectedChapterNumber),
      )
    : 0;
  const canGoPrevious = currentChapterIndex > 0 || currentBookIndex > 0;
  const canGoNext = Boolean(
    selectedBook &&
      (currentChapterIndex < selectedBook.chapters.length - 1 ||
        currentBookIndex < books.length - 1),
  );

  const navigateToResult = (result: SearchResult) => {
    setSelectedBookId(result.bookId);
    setSelectedChapterNumber(result.chapter);
    setSearchQuery("");
    setShowBookmarksOnly(false);
  };

  const moveToAdjacentChapter = (direction: -1 | 1) => {
    if (!selectedBook) return;

    const chapterIndex = selectedBook.chapters.findIndex(
      (chapter) => chapter.number === selectedChapterNumber,
    );
    const adjacentChapter = selectedBook.chapters[chapterIndex + direction];

    if (adjacentChapter) {
      setSelectedChapterNumber(adjacentChapter.number);
      return;
    }

    const bookIndex = books.findIndex((book) => book.id === selectedBook.id);
    const adjacentBook = books[bookIndex + direction];
    if (!adjacentBook) return;

    setSelectedBookId(adjacentBook.id);
    setSelectedChapterNumber(
      direction === 1
        ? adjacentBook.chapters[0]?.number || 1
        : adjacentBook.chapters[adjacentBook.chapters.length - 1]?.number || 1,
    );
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    moveToAdjacentChapter(deltaX < 0 ? 1 : -1);
  };

  if (loading) {
    return (
      <div className="bible-page">
        <BibleStyles />
        <div className="bible-state" role="status" aria-live="polite">
          <ChapterSkeleton />
          <p>Opening the Bible…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bible-page">
        <BibleStyles />
        <div className="bible-state bible-state--error" role="alert">
          <div className="bible-state__icon" aria-hidden="true">
            !
          </div>
          <h1>We couldn’t open the Bible</h1>
          <p>{error}</p>
          <button className="bible-button bible-button--primary" type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bible-page">
      <BibleStyles />
      <div className="bible-shell">
        <header className="bible-hero">
          <div>
            <p className="bible-eyebrow">Holy Scripture</p>
            <h1>Amharic Bible</h1>
            <p className="bible-subtitle">
              Read, search, and keep your favorite verses close.
            </p>
          </div>
          <div className="bible-hero__stats" aria-label="Bible statistics">
            <strong>{books.length}</strong>
            <span>books available</span>
          </div>
        </header>

        <section className="bible-toolbar" aria-label="Bible tools">
          <label className="bible-search">
            <span className="bible-search__icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search verses, books, or words…"
              aria-label="Search verses"
            />
            {searchQuery && (
              <button
                className="bible-search__clear"
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>
          <button
            className={`bible-button ${showBookmarksOnly ? "bible-button--active" : ""}`}
            type="button"
            onClick={() => setShowBookmarksOnly((current) => !current)}
            aria-pressed={showBookmarksOnly}
          >
            <span aria-hidden="true">★</span>
            Saved
            {bookmarks.length > 0 && <small>{bookmarks.length}</small>}
          </button>
          <div className="bible-font-control" aria-label="Font size">
            {(["small", "medium", "large"] as FontSize[]).map((size) => (
              <button
                className={fontSize === size ? "is-selected" : ""}
                type="button"
                key={size}
                onClick={() => setFontSize(size)}
                aria-pressed={fontSize === size}
                title={`${size} text`}
              >
                {size === "small" ? "A" : size === "medium" ? "A+" : "A++"}
              </button>
            ))}
          </div>
        </section>

        {searchQuery || showBookmarksOnly ? (
          <section className="bible-search-results" aria-live="polite">
            <div className="bible-section-heading">
              <div>
                <p className="bible-eyebrow">Your results</p>
                <h2>{showBookmarksOnly && !searchQuery ? "Saved verses" : "Search results"}</h2>
              </div>
              <span className="bible-result-count">
                {searching ? "Searching…" : `${searchResults.length} ${searchResults.length === 1 ? "verse" : "verses"}`}
              </span>
            </div>
            {searching ? (
              <ChapterSkeleton compact />
            ) : searchResults.length > 0 ? (
              <div className="bible-results-list">
                {searchResults.slice(0, 100).map((result) => {
                  const resultKey = makeVerseKey(result.bookId, result.chapter, result.verse);
                  return (
                    <button
                      className="bible-result"
                      type="button"
                      key={resultKey}
                      onClick={() => navigateToResult(result)}
                    >
                      <span className="bible-result__reference">
                        {result.book} {result.chapter}:{result.verse}
                      </span>
                      <span className="bible-result__text">{result.text}</span>
                      <span
                        className={`bible-result__star ${bookmarkSet.has(resultKey) ? "is-saved" : ""}`}
                        aria-hidden="true"
                      >
                        ★
                      </span>
                    </button>
                  );
                })}
                {searchResults.length > 100 && (
                  <p className="bible-results-note">Showing the first 100 results.</p>
                )}
              </div>
            ) : (
              <div className="bible-empty">
                <span aria-hidden="true">⌕</span>
                <p>No verses match your search.</p>
              </div>
            )}
          </section>
        ) : (
          <div className="bible-reader-layout">
            <aside className="bible-sidebar" aria-label="Book navigation">
              <div className="bible-sidebar__heading">
                <span>Books</span>
                <span>{currentBookIndex + 1} / {books.length}</span>
              </div>
              <div className="bible-book-list">
                {books.map((book, index) => (
                  <button
                    type="button"
                    key={book.id}
                    className={`bible-book ${book.id === selectedBookId ? "is-selected" : ""}`}
                    onClick={() => handleBookChange(book.id)}
                    aria-pressed={book.id === selectedBookId}
                  >
                    <span className="bible-book__number">{padNumber(index + 1)}</span>
                    <span>{book.name}</span>
                  </button>
                ))}
              </div>
            </aside>

            <main
              className={`bible-reader ${chapterLoading ? "is-loading" : "is-ready"}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="bible-reader__topline">
                <p className="bible-eyebrow">{selectedBook?.name || "Bible"}</p>
                <span>{selectedBook?.chapters.length || 0} chapters</span>
              </div>
              <button
                className="bible-mobile-books-trigger"
                type="button"
                onClick={() => setIsBookSheetOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isBookSheetOpen}
              >
                <span>Browse books</span>
                <strong>{selectedBook?.name || "Select a book"}</strong>
                <span aria-hidden="true">⌄</span>
              </button>
              <div className="bible-reader__heading">
                <div>
                  <h2>{selectedBook?.name || "Select a book"}</h2>
                  <p>{visibleChapter ? formatChapterLabel(visibleChapter) : "Select a chapter"}</p>
                </div>
                <label className="bible-chapter-select">
                  <span>Chapter</span>
                  <select
                    value={selectedChapterNumber}
                    onChange={(event) => handleChapterChange(Number(event.target.value))}
                    disabled={!selectedBook}
                    aria-label="Select chapter"
                  >
                    {selectedBook?.chapters.map((chapter) => (
                      <option key={chapter.number} value={chapter.number}>
                        {chapter.number}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={`bible-verse-list bible-verse-list--${fontSize}`}>
                {chapterLoading || !visibleChapter ? (
                  <ChapterSkeleton compact />
                ) : displayedVerses.length > 0 ? (
                  displayedVerses.map((verse) => {
                    const key = selectedBook
                      ? makeVerseKey(selectedBook.id, selectedChapterNumber, verse.number)
                      : verse.number;
                    const isBookmarked = bookmarkSet.has(key);
                    return (
                      <article className={`bible-verse ${isBookmarked ? "is-bookmarked" : ""}`} key={key}>
                        <span className="bible-verse__number">{verse.number}</span>
                        <p>{verse.text}</p>
                        <button
                          className={`bible-verse__bookmark ${isBookmarked ? "is-saved" : ""}`}
                          type="button"
                          onClick={() => toggleBookmark(verse.number)}
                          aria-label={`${isBookmarked ? "Remove" : "Save"} bookmark for verse ${verse.number}`}
                          aria-pressed={isBookmarked}
                        >
                          ★
                        </button>
                      </article>
                    );
                  })
                ) : (
                  <div className="bible-empty">
                    <span aria-hidden="true">◌</span>
                    <p>This chapter has no readable verses.</p>
                  </div>
                )}
              </div>

              <p className="bible-swipe-hint" aria-hidden="true">
                Swipe left or right to change chapter
              </p>

              <div className="bible-reader__footer">
                <button
                  className="bible-button"
                  type="button"
                  disabled={!selectedBook || !canGoPrevious}
                  onClick={() => moveToAdjacentChapter(-1)}
                >
                  ← Previous
                </button>
                <button
                  className="bible-button"
                  type="button"
                  disabled={!selectedBook || !canGoNext}
                  onClick={() => moveToAdjacentChapter(1)}
                >
                  Next →
                </button>
              </div>
            </main>
          </div>
        )}

        {isBookSheetOpen && (
          <div
            className="bible-sheet-backdrop"
            role="presentation"
            onClick={() => setIsBookSheetOpen(false)}
          >
            <section
              className="bible-book-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Choose a Bible book"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="bible-book-sheet__handle" aria-hidden="true" />
              <div className="bible-book-sheet__heading">
                <div>
                  <p className="bible-eyebrow">Navigate</p>
                  <h2>Choose a book</h2>
                </div>
                <button
                  className="bible-sheet-close"
                  type="button"
                  onClick={() => setIsBookSheetOpen(false)}
                  aria-label="Close book picker"
                >
                  ×
                </button>
              </div>
              <div className="bible-book-sheet__list">
                {books.map((book, index) => (
                  <button
                    type="button"
                    key={book.id}
                    className={`bible-book bible-book--sheet ${book.id === selectedBookId ? "is-selected" : ""}`}
                    onClick={() => handleBookChange(book.id)}
                    aria-pressed={book.id === selectedBookId}
                  >
                    <span className="bible-book__number">{padNumber(index + 1)}</span>
                    <span>{book.name}</span>
                    {book.id === selectedBookId && <span className="bible-book__check">✓</span>}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function ChapterSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bible-skeleton ${compact ? "bible-skeleton--compact" : ""}`} aria-hidden="true">
      <span className="bible-skeleton__line bible-skeleton__line--short" />
      <span className="bible-skeleton__line" />
      <span className="bible-skeleton__line" />
      <span className="bible-skeleton__line bible-skeleton__line--medium" />
      {!compact && <span className="bible-skeleton__line bible-skeleton__line--short" />}
    </div>
  );
}

function BibleStyles() {
  return (
    <style>{`
      .bible-page {
        --bible-bg: #100b1d;
        --bible-panel: #1a122c;
        --bible-panel-strong: #211638;
        --bible-border: rgba(220, 205, 255, 0.13);
        --bible-text: #f8f3ff;
        --bible-muted: #a99fbc;
        --bible-gold: #f5c14e;
        --bible-purple: #9a73e6;
        min-height: calc(100vh - 68px);
        color: var(--bible-text);
        background:
          radial-gradient(circle at 82% 0%, rgba(108, 66, 181, 0.24), transparent 30rem),
          radial-gradient(circle at 8% 22%, rgba(245, 193, 78, 0.06), transparent 25rem),
          var(--bible-bg);
      }

      .bible-shell {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
        padding: 52px 0 76px;
      }

      .bible-hero {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 34px;
      }

      .bible-eyebrow {
        margin: 0 0 8px;
        color: var(--bible-gold);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .bible-hero h1,
      .bible-reader__heading h2,
      .bible-section-heading h2 {
        margin: 0;
        color: var(--bible-text);
        letter-spacing: -0.035em;
      }

      .bible-hero h1 {
        font-size: clamp(2.2rem, 5vw, 4rem);
        line-height: 1;
      }

      .bible-subtitle {
        margin: 15px 0 0;
        color: var(--bible-muted);
        font-size: 1rem;
      }

      .bible-hero__stats {
        display: flex;
        align-items: baseline;
        gap: 8px;
        padding: 13px 17px;
        border: 1px solid var(--bible-border);
        border-radius: 12px;
        color: var(--bible-muted);
        background: rgba(255, 255, 255, 0.03);
        white-space: nowrap;
      }

      .bible-hero__stats strong {
        color: var(--bible-gold);
        font-size: 1.45rem;
      }

      .bible-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 24px;
      }

      .bible-search {
        flex: 1;
        display: flex;
        align-items: center;
        min-height: 48px;
        padding: 0 13px;
        border: 1px solid var(--bible-border);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.045);
      }

      .bible-search:focus-within {
        border-color: rgba(245, 193, 78, 0.65);
        box-shadow: 0 0 0 3px rgba(245, 193, 78, 0.1);
      }

      .bible-search__icon {
        margin-right: 9px;
        color: var(--bible-gold);
        font-size: 1.45rem;
        line-height: 1;
      }

      .bible-search input {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        color: var(--bible-text);
        background: transparent;
        font: inherit;
      }

      .bible-search input::placeholder {
        color: #81778e;
      }

      .bible-search__clear {
        display: grid;
        width: 44px;
        min-width: 44px;
        height: 44px;
        place-items: center;
        border: 0;
        color: var(--bible-muted);
        background: transparent;
        font-size: 1.3rem;
        cursor: pointer;
      }

      .bible-button,
      .bible-font-control {
        min-height: 48px;
        border: 1px solid var(--bible-border);
        border-radius: 10px;
        color: var(--bible-muted);
        background: rgba(255, 255, 255, 0.045);
        font: inherit;
        font-size: 0.87rem;
        font-weight: 700;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 15px;
        cursor: pointer;
        transition: 160ms ease;
      }

      .bible-button:hover:not(:disabled),
      .bible-button--active {
        border-color: rgba(245, 193, 78, 0.6);
        color: var(--bible-gold);
        background: rgba(245, 193, 78, 0.1);
      }

      .bible-button--primary {
        padding: 0 20px;
        color: #211407;
        border-color: var(--bible-gold);
        background: var(--bible-gold);
      }

      .bible-button small {
        display: grid;
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        place-items: center;
        border-radius: 10px;
        color: #1d132d;
        background: var(--bible-gold);
      }

      .bible-button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      .bible-font-control {
        display: flex;
        align-items: stretch;
        padding: 3px;
      }

      .bible-font-control button {
        min-width: 40px;
        min-height: 40px;
        border: 0;
        border-radius: 7px;
        color: var(--bible-muted);
        background: transparent;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-font-control button.is-selected {
        color: var(--bible-gold);
        background: rgba(245, 193, 78, 0.14);
      }

      .bible-reader-layout {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: 24px;
        align-items: start;
      }

      .bible-sidebar,
      .bible-reader,
      .bible-search-results {
        border: 1px solid var(--bible-border);
        border-radius: 16px;
        background: rgba(26, 18, 44, 0.82);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
      }

      .bible-sidebar {
        position: sticky;
        top: 92px;
        max-height: calc(100vh - 112px);
        overflow: hidden;
      }

      .bible-sidebar__heading {
        display: flex;
        justify-content: space-between;
        padding: 18px 18px 12px;
        color: var(--bible-text);
        font-size: 0.82rem;
        font-weight: 800;
      }

      .bible-sidebar__heading span:last-child {
        color: var(--bible-muted);
        font-size: 0.72rem;
        font-weight: 600;
      }

      .bible-book-list {
        max-height: calc(100vh - 174px);
        padding: 0 9px 10px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .bible-book {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 11px;
        min-height: 39px;
        padding: 0 9px;
        border: 0;
        border-radius: 8px;
        color: var(--bible-muted);
        background: transparent;
        font: inherit;
        font-size: 0.84rem;
        text-align: left;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-book:hover {
        color: var(--bible-text);
        background: rgba(255, 255, 255, 0.05);
      }

      .bible-book.is-selected {
        color: var(--bible-gold);
        background: rgba(245, 193, 78, 0.12);
        font-weight: 750;
      }

      .bible-book__number {
        width: 20px;
        color: #746a83;
        font-size: 0.67rem;
        font-variant-numeric: tabular-nums;
      }

      .bible-book.is-selected .bible-book__number {
        color: var(--bible-gold);
      }

      .bible-reader {
        min-width: 0;
        padding: 26px 30px 24px;
        transition: opacity 180ms ease, transform 180ms ease;
        touch-action: pan-y;
      }

      .bible-reader.is-loading {
        opacity: 0.88;
      }

      .bible-reader.is-ready {
        animation: bible-reader-in 220ms ease both;
      }

      .bible-reader__topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--bible-border);
      }

      .bible-reader__topline .bible-eyebrow {
        margin: 0;
      }

      .bible-reader__topline > span {
        color: var(--bible-muted);
        font-size: 0.8rem;
      }

      .bible-reader__heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 26px 0 23px;
      }

      .bible-reader__heading h2 {
        font-size: clamp(1.65rem, 3vw, 2.3rem);
      }

      .bible-reader__heading p {
        margin: 6px 0 0;
        color: var(--bible-muted);
      }

      .bible-chapter-select {
        display: flex;
        align-items: center;
        gap: 9px;
        color: var(--bible-muted);
        font-size: 0.78rem;
        font-weight: 700;
      }

      .bible-chapter-select select {
        min-width: 70px;
        min-height: 44px;
        padding: 0 9px;
        border: 1px solid var(--bible-border);
        border-radius: 8px;
        outline: 0;
        color: var(--bible-text);
        background: var(--bible-panel-strong);
        font: inherit;
        cursor: pointer;
      }

      .bible-chapter-select select:focus {
        border-color: var(--bible-gold);
      }

      .bible-mobile-books-trigger,
      .bible-swipe-hint {
        display: none;
      }

      .bible-verse-list {
        border-top: 1px solid var(--bible-border);
      }

      .bible-verse {
        position: relative;
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) 28px;
        gap: 10px;
        padding: 19px 3px;
        border-bottom: 1px solid rgba(220, 205, 255, 0.08);
      }

      .bible-verse__number {
        padding-top: 3px;
        color: var(--bible-gold);
        font-size: 0.78em;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .bible-verse p {
        margin: 0;
        color: #eee8f5;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 1em;
        line-height: 1.85;
      }

      .bible-verse__bookmark {
        display: grid;
        width: 44px;
        height: 44px;
        place-items: center;
        margin: -10px 0 0 -8px;
        align-self: start;
        padding: 0;
        border: 0;
        color: #60566e;
        background: transparent;
        font-size: 1rem;
        cursor: pointer;
        transition: color 160ms ease, transform 160ms ease;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-verse__bookmark:hover,
      .bible-verse__bookmark.is-saved {
        color: var(--bible-gold);
        transform: scale(1.1);
      }

      .bible-verse.is-bookmarked {
        margin: 0 -10px;
        padding-right: 13px;
        padding-left: 13px;
        border-radius: 8px;
        background: rgba(245, 193, 78, 0.045);
      }

      .bible-verse-list--small .bible-verse p {
        font-size: 0.88em;
      }

      .bible-verse-list--large .bible-verse p {
        font-size: 1.16em;
      }

      .bible-reader__footer {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding-top: 24px;
      }

      .bible-search-results {
        padding: 28px 30px;
      }

      .bible-section-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }

      .bible-section-heading h2 {
        font-size: 1.65rem;
      }

      .bible-result-count {
        color: var(--bible-muted);
        font-size: 0.82rem;
      }

      .bible-results-list {
        border-top: 1px solid var(--bible-border);
      }

      .bible-result {
        position: relative;
        display: grid;
        width: 100%;
        gap: 6px;
        padding: 17px 35px 17px 0;
        border: 0;
        border-bottom: 1px solid rgba(220, 205, 255, 0.08);
        color: var(--bible-text);
        background: transparent;
        text-align: left;
        cursor: pointer;
      }

      .bible-result:hover .bible-result__text {
        color: var(--bible-gold);
      }

      .bible-result__reference {
        color: var(--bible-gold);
        font-size: 0.77rem;
        font-weight: 800;
      }

      .bible-result__text {
        color: #e9e2f1;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 1rem;
        line-height: 1.65;
        transition: color 160ms ease;
      }

      .bible-result__star {
        position: absolute;
        top: 21px;
        right: 4px;
        color: #60566e;
      }

      .bible-result__star.is-saved {
        color: var(--bible-gold);
      }

      .bible-results-note {
        margin: 18px 0 0;
        color: var(--bible-muted);
        font-size: 0.8rem;
      }

      .bible-empty {
        display: grid;
        min-height: 180px;
        place-items: center;
        align-content: center;
        gap: 10px;
        color: var(--bible-muted);
        text-align: center;
      }

      .bible-empty span {
        color: var(--bible-gold);
        font-size: 2rem;
      }

      .bible-empty p {
        margin: 0;
      }

      .bible-book-sheet,
      .bible-sheet-backdrop {
        display: none;
      }

      .bible-skeleton {
        display: grid;
        width: min(440px, 100%);
        gap: 13px;
        padding: 8px 0;
      }

      .bible-skeleton--compact {
        width: 100%;
        padding: 22px 0;
      }

      .bible-skeleton__line {
        display: block;
        width: 100%;
        height: 15px;
        border-radius: 7px;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.06) 25%,
          rgba(245, 193, 78, 0.16) 50%,
          rgba(255, 255, 255, 0.06) 75%
        );
        background-size: 200% 100%;
        animation: bible-skeleton-shimmer 1.25s ease-in-out infinite;
      }

      .bible-skeleton__line--short {
        width: 34%;
      }

      .bible-skeleton__line--medium {
        width: 72%;
      }

      .bible-state {
        display: grid;
        min-height: 65vh;
        place-items: center;
        align-content: center;
        gap: 13px;
        color: var(--bible-text);
        text-align: center;
      }

      .bible-state p {
        margin: 0;
        color: var(--bible-muted);
      }

      .bible-state--error {
        width: min(440px, calc(100% - 32px));
        margin: auto;
      }

      .bible-state--error h1 {
        margin: 0;
        font-size: 1.55rem;
      }

      .bible-state__icon {
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        border: 1px solid rgba(245, 193, 78, 0.55);
        border-radius: 50%;
        color: var(--bible-gold);
        font-weight: 800;
      }

      .bible-spinner {
        width: 27px;
        height: 27px;
        border: 3px solid rgba(245, 193, 78, 0.2);
        border-top-color: var(--bible-gold);
        border-radius: 50%;
        animation: bible-spin 800ms linear infinite;
      }

      @keyframes bible-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes bible-skeleton-shimmer {
        from { background-position: 200% 0; }
        to { background-position: -200% 0; }
      }

      @keyframes bible-reader-in {
        from { opacity: 0.65; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 860px) {
        .bible-reader-layout {
          grid-template-columns: 1fr;
        }

        .bible-sidebar {
          position: static;
          max-height: 300px;
        }

        .bible-book-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-height: 240px;
        }

        .bible-book {
          min-height: 48px;
        }
      }

      @media (max-width: 620px) {
        .bible-page {
          min-height: calc(100vh - 60px);
        }

        .bible-shell {
          width: min(100% - 20px, 1180px);
          padding-top: 32px;
        }

        .bible-hero {
          display: block;
          margin-bottom: 24px;
        }

        .bible-hero__stats {
          display: inline-flex;
          margin-top: 20px;
        }

        .bible-toolbar {
          flex-wrap: wrap;
        }

        .bible-search {
          flex-basis: 100%;
        }

        .bible-reader,
        .bible-search-results {
          padding: 20px 16px;
          border-radius: 12px;
        }

        .bible-sidebar {
          display: none;
        }

        .bible-mobile-books-trigger {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          width: 100%;
          min-height: 54px;
          gap: 10px;
          margin: 18px 0 2px;
          padding: 8px 13px;
          border: 1px solid rgba(245, 193, 78, 0.32);
          border-radius: 10px;
          color: var(--bible-muted);
          background: rgba(245, 193, 78, 0.08);
          font: inherit;
          font-size: 0.76rem;
          text-align: left;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .bible-mobile-books-trigger strong {
          min-width: 0;
          overflow: hidden;
          color: var(--bible-text);
          font-size: 0.9rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bible-mobile-books-trigger > span:last-child {
          color: var(--bible-gold);
          font-size: 1.25rem;
        }

        .bible-swipe-hint {
          display: block;
          margin: 15px 0 -8px;
          color: #766c82;
          font-size: 0.68rem;
          text-align: center;
        }

        .bible-sheet-backdrop {
          position: fixed;
          z-index: 100;
          inset: 0;
          display: flex;
          align-items: flex-end;
          background: rgba(5, 3, 12, 0.66);
          animation: bible-backdrop-in 160ms ease both;
        }

        .bible-book-sheet {
          box-sizing: border-box;
          display: block;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 76vh;
          max-height: 620px;
          min-height: 320px;
          padding: 10px 14px 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
          overflow: hidden;
          border-radius: 20px 20px 0 0;
          color: var(--bible-text);
          background: #1a122c;
          box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.38);
          animation: bible-sheet-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .bible-book-sheet__handle {
          flex: 0 0 auto;
          width: 42px;
          height: 4px;
          margin: 0 auto 14px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.24);
        }

        .bible-book-sheet__heading {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 4px 12px;
        }

        .bible-book-sheet__heading h2 {
          margin: 0;
          font-size: 1.35rem;
          letter-spacing: -0.03em;
        }

        .bible-sheet-close {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border: 1px solid var(--bible-border);
          border-radius: 50%;
          color: var(--bible-text);
          background: rgba(255, 255, 255, 0.06);
          font-size: 1.5rem;
          cursor: pointer;
        }

        .bible-book-sheet__list {
          box-sizing: border-box;
          flex: 1 1 auto;
          min-height: 0;
          height: 0;
          overflow-x: hidden;
          overflow-y: scroll;
          -webkit-overflow-scrolling: touch;
          -webkit-transform: translateZ(0);
          touch-action: pan-y;
        }

        .bible-book--sheet {
          min-height: 52px;
          padding: 0 11px;
          font-size: 0.9rem;
        }

        .bible-book__check {
          margin-left: auto;
          color: var(--bible-gold);
          font-size: 1.1rem;
        }

        @keyframes bible-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes bible-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .bible-reader__heading {
          align-items: flex-start;
        }

        .bible-reader__heading h2 {
          font-size: 1.55rem;
        }

        .bible-chapter-select {
          display: grid;
          gap: 4px;
        }

        .bible-verse {
          grid-template-columns: 31px minmax(0, 1fr) 24px;
          gap: 7px;
          padding: 15px 0;
        }

        .bible-verse__bookmark {
          margin-top: -10px;
          margin-right: -7px;
        }

        .bible-verse.is-bookmarked {
          margin: 0 -6px;
          padding-right: 8px;
          padding-left: 8px;
        }

        .bible-reader__footer .bible-button {
          min-width: 118px;
          min-height: 52px;
          padding: 0 10px;
          font-size: 0.78rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .bible-reader,
        .bible-skeleton__line,
        .bible-sheet-backdrop,
        .bible-book-sheet {
          animation: none;
          transition: none;
        }
      }
    `}</style>
  );
}