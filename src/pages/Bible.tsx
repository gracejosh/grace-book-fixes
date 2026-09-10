import { useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";

type Language = "amharic" | "english";

type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";

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
  amharicName: string;
  englishName: string;
  testament: "old" | "new";
  chapters: Chapter[];
  rawChapters: unknown[];
}

interface SearchResult {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: string;
  text: string;
}

interface HighlightedVerse {
  key: string;
  color: HighlightColor;
}

const ENGLISH_BOOK_NAMES = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
  "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
  "Jude", "Revelation",
];

const HIGHLIGHT_COLORS: { id: HighlightColor; label: string; hex: string; bg: string }[] = [
  { id: "yellow", label: "Yellow", hex: "#EAB308", bg: "rgba(234, 179, 8, 0.22)" },
  { id: "green", label: "Green", hex: "#22C55E", bg: "rgba(34, 197, 94, 0.22)" },
  { id: "blue", label: "Blue", hex: "#3B82F6", bg: "rgba(59, 130, 246, 0.22)" },
  { id: "pink", label: "Pink", hex: "#EC4899", bg: "rgba(236, 72, 153, 0.22)" },
  { id: "orange", label: "Orange", hex: "#F97316", bg: "rgba(249, 115, 22, 0.22)" },
];

const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  yellow: "rgba(234, 179, 8, 0.22)",
  green: "rgba(34, 197, 94, 0.22)",
  blue: "rgba(59, 130, 246, 0.22)",
  pink: "rgba(236, 72, 153, 0.22)",
  orange: "rgba(249, 115, 22, 0.22)",
};

const HIGHLIGHT_HEX: Record<HighlightColor, string> = {
  yellow: "#EAB308",
  green: "#22C55E",
  blue: "#3B82F6",
  pink: "#EC4899",
  orange: "#F97316",
};

const BOOKMARKS_KEY = "bible:bookmarks";
const HIGHLIGHTS_KEY = "bible:highlights";
const LANGUAGE_KEY = "bible:language";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
};

const asText = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
};

const asNumber = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(asText(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    return typeof chapter.value === "string" ? [{ text: chapter.value }] : getItems(chapter.value);
  }
  return [];
};

const normalizeVerseNumber = (value: unknown, fallback: number): string => {
  const text = asText(value).replace(/\s+/g, "");
  return text || String(fallback);
};

const normalizeChapter = (rawChapter: unknown, chapterIndex: number): Chapter => {
  const chapterRecord = isRecord(rawChapter) ? rawChapter : {};
  const chapterNumber = asNumber(
    firstValue(chapterRecord, ["number", "chapter", "chapterNumber", "id"]) || chapterRecord.__key,
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
        firstValue(verseRecord, ["number", "verseNumber", "id", "label"]) || verseRecord.__key,
        verseIndex + 1,
      );
      return { number, text };
    })
    .filter((v) => v.text.length > 0 || v.number.length > 0);

  return {
    number: chapterNumber,
    verses: verses.sort((a, b) => {
      const aNum = Number.parseInt(a.number, 10);
      const bNum = Number.parseInt(b.number, 10);
      return (Number.isFinite(aNum) ? aNum : 0) - (Number.isFinite(bNum) ? bNum : 0);
    }),
  };
};

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const normalizeBooks = (data: unknown): Book[] => {
  const rawBooks = getRawBooks(data);
  return rawBooks
    .map((rawBook, bookIndex): Book => {
      const bookRecord = isRecord(rawBook) ? rawBook : {};
      const amharicName = asText(firstValue(bookRecord, ["title", "name", "book", "bookName"])) || `Book ${bookIndex + 1}`;
      const englishName = ENGLISH_BOOK_NAMES[bookIndex] || `Book ${bookIndex + 1}`;
      const testament: "old" | "new" = bookIndex < 39 ? "old" : "new";
      const rawChapters = getRawChapters(rawBook);
      const chapterEntries = rawChapters
        .map((rawChapter, chapterIndex) => {
          const chapterRecord = isRecord(rawChapter) ? rawChapter : {};
          return {
            rawChapter,
            number: asNumber(
              firstValue(chapterRecord, ["number", "chapter", "chapterNumber", "id"]) || chapterRecord.__key,
              chapterIndex + 1,
            ),
          };
        })
        .sort((a, b) => a.number - b.number);

      return {
        id: `${slugify(englishName) || "book"}-${bookIndex}`,
        amharicName,
        englishName,
        testament,
        chapters: chapterEntries.map((e) => ({ number: e.number, verses: [] })),
        rawChapters: chapterEntries.map((e) => e.rawChapter),
      };
    })
    .filter((book) => book.chapters.length > 0);
};

const safeRead = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
};

const safeWrite = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const makeVerseKey = (bookId: string, chapter: number, verse: string) =>
  `${bookId}:${chapter}:${verse}`;

export default function Bible() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedChapterNumber, setSelectedChapterNumber] = useState(1);
  const [visibleChapter, setVisibleChapter] = useState<Chapter | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [language, setLanguage] = useState<Language>(
    () => (safeRead<string>(LANGUAGE_KEY, "amharic") === "english" ? "english" : "amharic"),
  );
  const [bookmarks, setBookmarks] = useState<string[]>(() => safeRead<string[]>(BOOKMARKS_KEY, []));
  const [highlights, setHighlights] = useState<HighlightedVerse[]>(() => safeRead<HighlightedVerse[]>(HIGHLIGHTS_KEY, []));
  const [selectedVerseKey, setSelectedVerseKey] = useState<string | null>(null);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isBookDrawerOpen, setIsBookDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const chapterMemory = useRef<Record<string, Chapter>>({});

  useEffect(() => {
    let cancelled = false;
    const loadBible = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/amharic_bible.json", { cache: "no-cache" });
        if (!response.ok) throw new Error(`Bible data could not be loaded (${response.status}).`);
        const data: unknown = await response.json();
        const normalizedBooks = normalizeBooks(data);
        if (normalizedBooks.length === 0) throw new Error("The Bible data file contains no readable books.");
        if (!cancelled) {
          setBooks(normalizedBooks);
          setSelectedBookId(normalizedBooks[39].id);
          setSelectedChapterNumber(normalizedBooks[39].chapters[0]?.number || 1);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load the Bible.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadBible();
    return () => { cancelled = true; };
  }, []);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId) || null,
    [books, selectedBookId],
  );

  useEffect(() => {
    if (!selectedBook) {
      setVisibleChapter(null);
      setChapterLoading(false);
      return;
    }
    let cancelled = false;
    const chapterIndex = Math.max(0, selectedBook.chapters.findIndex((c) => c.number === selectedChapterNumber));
    const chapter = selectedBook.chapters[chapterIndex] || selectedBook.chapters[0];
    if (!chapter) {
      setVisibleChapter(null);
      setChapterLoading(false);
      return;
    }
    const cacheKey = `${selectedBook.id}:${chapter.number}`;
    const memoryChapter = chapterMemory.current[cacheKey];
    setChapterLoading(true);
    setVisibleChapter(memoryChapter || null);
    const timer = setTimeout(() => {
      if (cancelled) return;
      const nextChapter = memoryChapter || normalizeChapter(selectedBook.rawChapters[chapterIndex], chapterIndex);
      chapterMemory.current[cacheKey] = nextChapter;
      if (!cancelled) {
        setVisibleChapter(nextChapter);
        setChapterLoading(false);
      }
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [selectedBook, selectedChapterNumber]);

  useEffect(() => { safeWrite(LANGUAGE_KEY, language); }, [language]);
  useEffect(() => { safeWrite(BOOKMARKS_KEY, bookmarks); }, [bookmarks]);
  useEffect(() => { safeWrite(HIGHLIGHTS_KEY, highlights); }, [highlights]);

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);
  const highlightMap = useMemo(() => {
    const m = new Map<string, HighlightColor>();
    highlights.forEach((h) => m.set(h.key, h.color));
    return m;
  }, [highlights]);

  const oldTestamentBooks = useMemo(() => books.filter((b) => b.testament === "old"), [books]);
  const newTestamentBooks = useMemo(() => books.filter((b) => b.testament === "new"), [books]);

  const handleBookChange = (bookId: string) => {
    const nextBook = books.find((b) => b.id === bookId);
    setSelectedBookId(bookId);
    setSelectedChapterNumber(nextBook?.chapters[0]?.number || 1);
    setSelectedVerseKey(null);
    setIsBookDrawerOpen(false);
  };

  const handleChapterChange = (chapterNumber: number) => {
    setSelectedChapterNumber(chapterNumber);
    setSelectedVerseKey(null);
  };

  const toggleBookmark = (verseKey: string) => {
    setBookmarks((cur) => cur.includes(verseKey) ? cur.filter((k) => k !== verseKey) : [...cur, verseKey]);
    setSelectedVerseKey(null);
  };

  const applyHighlight = (verseKey: string, color: HighlightColor) => {
    setHighlights((cur) => {
      const existing = cur.find((h) => h.key === verseKey);
      if (existing && existing.color === color) {
        return cur.filter((h) => h.key !== verseKey);
      }
      return [...cur.filter((h) => h.key !== verseKey), { key: verseKey, color }];
    });
    setShowHighlightPicker(false);
    setSelectedVerseKey(null);
  };

  const handleVerseTap = (verseKey: string) => {
    setSelectedVerseKey((prev) => (prev === verseKey ? null : verseKey));
    setShowHighlightPicker(false);
  };

  const handleCopy = (verseKey: string) => {
    if (!selectedBook || !visibleChapter) return;
    const verse = visibleChapter.verses.find((v) => makeVerseKey(selectedBook.id, selectedChapterNumber, v.number) === verseKey);
    if (!verse) return;
    const bookName = language === "amharic" ? selectedBook.amharicName : selectedBook.englishName;
    const text = `${bookName} ${selectedChapterNumber}:${verse.number} - ${verse.text}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => { setCopied(false); setSelectedVerseKey(null); }, 1500);
  };

  // Search
  useEffect(() => {
    if (!searchOpen) return;
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      const results: SearchResult[] = [];
      books.forEach((book) => {
        book.chapters.forEach((chapter, chapterIndex) => {
          const cacheKey = `${book.id}:${chapter.number}`;
          let chapterData = chapterMemory.current[cacheKey];
          if (!chapterData) {
            chapterData = normalizeChapter(book.rawChapters[chapterIndex], chapterIndex);
            chapterMemory.current[cacheKey] = chapterData;
          }
          chapterData.verses.forEach((verse) => {
            if (verse.text.toLowerCase().includes(query)) {
              results.push({
                bookId: book.id,
                bookName: language === "amharic" ? book.amharicName : book.englishName,
                chapter: chapter.number,
                verse: verse.number,
                text: verse.text,
              });
            }
          });
        });
      });
      setSearchResults(results);
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, books, language]);

  const navigateToResult = (result: SearchResult) => {
    setSelectedBookId(result.bookId);
    setSelectedChapterNumber(result.chapter);
    setSearchOpen(false);
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="bible-page">
        <BibleStyles />
        <div className="bible-state">
          <div className="bible-spinner" />
          <p>Opening the Bible…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bible-page">
        <BibleStyles />
        <div className="bible-state bible-state--error">
          <div className="bible-state__icon">!</div>
          <h1>We couldn't open the Bible</h1>
          <p>{error}</p>
          <button className="bible-button bible-button--primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const displayBookName = (book: Book) => language === "amharic" ? book.amharicName : book.englishName;
  const displayBookNameBilingual = (book: Book) =>
    language === "amharic" ? `${book.englishName} · ${book.amharicName}` : `${book.englishName} · ${book.amharicName}`;

  return (
    <div className="bible-page">
      <BibleStyles />

      {/* Header */}
      <header className="bible-header">
        <button className="bible-header-btn" onClick={() => setIsBookDrawerOpen(true)} aria-label="Browse books">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="bible-header-center">
          <span className="bible-header-book">{displayBookName(selectedBook!)}</span>
          <span className="bible-header-chapter">{selectedChapterNumber}</span>
        </div>
        <button className="bible-header-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </header>

      {/* Language toggle */}
      <div className="bible-lang-toggle">
        <button className={language === "amharic" ? "is-active" : ""} onClick={() => setLanguage("amharic")}>
          አማርኛ
        </button>
        <button className={language === "english" ? "is-active" : ""} onClick={() => setLanguage("english")}>
          English
        </button>
      </div>

      {/* Chapter selector horizontal scroll */}
      <div className="bible-chapter-scroll-wrap">
        <div className="bible-chapter-scroll">
          {selectedBook?.chapters.map((ch) => (
            <button
              key={ch.number}
              className={`bible-chapter-pill ${ch.number === selectedChapterNumber ? "is-active" : ""}`}
              onClick={() => handleChapterChange(ch.number)}
            >
              {ch.number}
            </button>
          ))}
        </div>
      </div>

      {/* Verses */}
      <div className="bible-verses-container">
        <div className="bible-reading-title">
          {displayBookName(selectedBook!)} {" "}
          {language === "amharic" ? "ምዕራፍ" : "Chapter"} {selectedChapterNumber}
        </div>

        {chapterLoading && !visibleChapter ? (
          <div className="bible-loading-text">Loading…</div>
        ) : visibleChapter ? (
          <div className="bible-verse-list">
            {visibleChapter.verses.map((verse) => {
              const vKey = makeVerseKey(selectedBook!.id, selectedChapterNumber, verse.number);
              const isSelected = selectedVerseKey === vKey;
              const isBookmarked = bookmarkSet.has(vKey);
              const highlightColor = highlightMap.get(vKey);
              const verseClass = [
                "bible-verse-item",
                isSelected ? "is-selected" : "",
                isBookmarked ? "is-bookmarked" : "",
              ].filter(Boolean).join(" ");

              return (
                <div
                  key={vKey}
                  className={verseClass}
                  style={highlightColor ? { backgroundColor: HIGHLIGHT_BG[highlightColor] } : undefined}
                  onClick={() => handleVerseTap(vKey)}
                >
                  <span className="bible-verse-num">{verse.number}</span>
                  <span className="bible-verse-text">{verse.text}</span>
                  {isBookmarked && <span className="bible-verse-bookmark-dot">★</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bible-empty-state">No verses in this chapter.</div>
        )}
      </div>

      {/* Action bar for selected verse */}
      {selectedVerseKey && (
        <div className="bible-action-bar">
          {copied ? (
            <div className="bible-copied-indicator">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </div>
          ) : (
            <>
              <button className="bible-action-btn" onClick={() => handleCopy(selectedVerseKey)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </button>
              <button
                className={`bible-action-btn ${bookmarkSet.has(selectedVerseKey) ? "is-active" : ""}`}
                onClick={() => toggleBookmark(selectedVerseKey)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarkSet.has(selectedVerseKey) ? "#EAB308" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                {bookmarkSet.has(selectedVerseKey) ? "Saved" : "Bookmark"}
              </button>
              <button
                className={`bible-action-btn ${showHighlightPicker ? "is-active" : ""}`}
                onClick={() => setShowHighlightPicker((p) => !p)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
                </svg>
                Highlight
              </button>
            </>
          )}
        </div>
      )}

      {/* Highlight color picker */}
      {selectedVerseKey && showHighlightPicker && (
        <div className="bible-highlight-picker">
          {HIGHLIGHT_COLORS.map((c) => {
            const current = highlightMap.get(selectedVerseKey);
            return (
              <button
                key={c.id}
                className={`bible-highlight-dot ${current === c.id ? "is-active" : ""}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => applyHighlight(selectedVerseKey, c.id)}
                aria-label={c.label}
              >
                {current === c.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1025" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Right drawer for books */}
      {isBookDrawerOpen && (
        <div className="bible-drawer-backdrop" onClick={() => setIsBookDrawerOpen(false)}>
          <div className="bible-book-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="bible-drawer-header">
              <h2>Books</h2>
              <button className="bible-drawer-close" onClick={() => setIsBookDrawerOpen(false)}>×</button>
            </div>
            <div className="bible-drawer-list">
              <div className="bible-testament-label">ብሉይ ኪዳን</div>
              {oldTestamentBooks.map((book) => (
                <button
                  key={book.id}
                  className={`bible-drawer-book ${book.id === selectedBookId ? "is-selected" : ""}`}
                  onClick={() => handleBookChange(book.id)}
                >
                  <span className="bible-drawer-book-en">{book.englishName}</span>
                  <span className="bible-drawer-book-am">{book.amharicName}</span>
                  {book.id === selectedBookId && <span className="bible-drawer-check">✓</span>}
                </button>
              ))}
              <div className="bible-testament-label">አዲስ ኪዳን</div>
              {newTestamentBooks.map((book) => (
                <button
                  key={book.id}
                  className={`bible-drawer-book ${book.id === selectedBookId ? "is-selected" : ""}`}
                  onClick={() => handleBookChange(book.id)}
                >
                  <span className="bible-drawer-book-en">{book.englishName}</span>
                  <span className="bible-drawer-book-am">{book.amharicName}</span>
                  {book.id === selectedBookId && <span className="bible-drawer-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div className="bible-search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="bible-search-panel" onClick={(e) => e.stopPropagation()}>
            <div className="bible-search-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Search verses…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button onClick={() => setSearchOpen(false)}>×</button>
            </div>
            <div className="bible-search-results-list">
              {searching ? (
                <div className="bible-search-empty">Searching…</div>
              ) : searchResults.length > 0 ? (
                searchResults.slice(0, 80).map((r, i) => (
                  <button
                    key={`${r.bookId}-${r.chapter}-${r.verse}-${i}`}
                    className="bible-search-result-item"
                    onClick={() => navigateToResult(r)}
                  >
                    <span className="bible-search-result-ref">{r.bookName} {r.chapter}:{r.verse}</span>
                    <span className="bible-search-result-text">{r.text}</span>
                  </button>
                ))
              ) : (
                <div className="bible-search-empty">
                  {searchQuery.length > 1 ? "No results found" : "Type to search the Bible"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BibleStyles() {
  return (
    <style>{`
      .bible-page {
        --bible-bg: #1a1025;
        --bible-surface: #241634;
        --bible-surface-light: #2D1B42;
        --bible-border: #2D1B42;
        --bible-gold: #EAB308;
        --bible-gold-dark: #CA8A04;
        --bible-purple: #7C3AED;
        --bible-purple-light: #A78BFA;
        --bible-green: #22C55E;
        --bible-text: #F3E9FF;
        --bible-text-muted: #8B7BA8;
        min-height: calc(100vh - 68px);
        color: var(--bible-text);
        background:
          radial-gradient(circle at 82% 0%, rgba(124, 58, 237, 0.18), transparent 30rem),
          radial-gradient(circle at 8% 22%, rgba(234, 179, 8, 0.04), transparent 25rem),
          var(--bible-bg);
        display: flex;
        flex-direction: column;
      }

      /* Header */
      .bible-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 16px 12px;
        background: var(--bible-surface);
        border-bottom: 1px solid var(--bible-border);
        position: sticky;
        top: 0;
        z-index: 20;
      }

      .bible-header-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        border: none;
        color: var(--bible-gold);
        background: var(--bible-surface-light);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-header-center {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .bible-header-book {
        font-family: Georgia, serif;
        font-size: 17px;
        font-weight: 700;
        color: var(--bible-gold);
      }

      .bible-header-chapter {
        font-size: 17px;
        font-weight: 700;
        color: var(--bible-text);
      }

      /* Language toggle */
      .bible-lang-toggle {
        display: flex;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        background: var(--bible-surface);
        border-bottom: 1px solid var(--bible-border);
      }

      .bible-lang-toggle button {
        padding: 6px 20px;
        border-radius: 20px;
        border: none;
        font-size: 13px;
        font-weight: 600;
        color: var(--bible-text-muted);
        background: var(--bible-surface-light);
        cursor: pointer;
        transition: all 200ms ease;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-lang-toggle button.is-active {
        color: #fff;
        background: var(--bible-purple);
      }

      /* Chapter selector */
      .bible-chapter-scroll-wrap {
        background: var(--bible-surface);
        border-bottom: 1px solid var(--bible-border);
        padding: 8px 0;
      }

      .bible-chapter-scroll {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding: 0 12px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .bible-chapter-scroll::-webkit-scrollbar { display: none; }

      .bible-chapter-pill {
        flex: 0 0 auto;
        width: 34px;
        height: 34px;
        border-radius: 17px;
        border: none;
        font-size: 13px;
        font-weight: 500;
        color: var(--bible-text-muted);
        background: var(--bible-surface-light);
        cursor: pointer;
        transition: all 200ms ease;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-chapter-pill.is-active {
        color: #1a1025;
        font-weight: 700;
        background: var(--bible-gold);
      }

      /* Verses */
      .bible-verses-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px 20px 120px;
      }

      .bible-reading-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--bible-purple-light);
        margin-bottom: 16px;
      }

      .bible-verse-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .bible-verse-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 180ms ease;
        position: relative;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-verse-item:hover {
        background: rgba(255,255,255,0.03);
      }

      .bible-verse-item.is-selected {
        background: rgba(34, 197, 94, 0.15) !important;
        border: 1.5px solid var(--bible-green);
      }

      .bible-verse-num {
        flex: 0 0 auto;
        min-width: 28px;
        padding-top: 3px;
        font-size: 13px;
        font-weight: 700;
        color: var(--bible-gold);
        font-variant-numeric: tabular-nums;
      }

      .bible-verse-item.is-selected .bible-verse-num {
        color: var(--bible-green);
      }

      .bible-verse-text {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 17px;
        line-height: 28px;
        color: var(--bible-gold);
      }

      .bible-verse-item.is-selected .bible-verse-text {
        color: var(--bible-green);
      }

      .bible-verse-bookmark-dot {
        position: absolute;
        top: 6px;
        right: 6px;
        color: var(--bible-gold);
        font-size: 12px;
      }

      .bible-loading-text, .bible-empty-state {
        padding: 40px 20px;
        text-align: center;
        color: var(--bible-text-muted);
        font-size: 15px;
      }

      /* Action bar */
      .bible-action-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        align-items: center;
        padding: 12px 16px;
        background: var(--bible-surface);
        border-top: 1px solid var(--bible-border);
        z-index: 30;
      }

      .bible-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        border: none;
        background: none;
        color: var(--bible-text);
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-action-btn.is-active {
        color: var(--bible-gold);
      }

      .bible-copied-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--bible-gold);
        font-size: 14px;
        font-weight: 600;
      }

      /* Highlight picker */
      .bible-highlight-picker {
        position: fixed;
        bottom: 60px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 14px;
        padding: 12px 16px;
        background: var(--bible-surface);
        border-top: 1px solid var(--bible-border);
        z-index: 30;
      }

      .bible-highlight-dot {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 17px;
        border: none;
        cursor: pointer;
        transition: transform 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-highlight-dot.is-active {
        border: 3px solid #fff;
      }

      /* Right drawer */
      .bible-drawer-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: flex-end;
        animation: bible-fade-in 160ms ease both;
      }

      .bible-book-drawer {
        width: 78vw;
        max-width: 380px;
        height: 100%;
        background: var(--bible-bg);
        display: flex;
        flex-direction: column;
        animation: bible-slide-in-left 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }

      .bible-drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 16px 12px;
      }

      .bible-drawer-header h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: var(--bible-gold);
      }

      .bible-drawer-close {
        width: 36px;
        height: 36px;
        border-radius: 18px;
        border: none;
        font-size: 22px;
        color: var(--bible-text);
        background: var(--bible-surface-light);
        cursor: pointer;
      }

      .bible-drawer-list {
        flex: 1;
        overflow-y: auto;
        padding: 0 12px 20px;
        -webkit-overflow-scrolling: touch;
      }

      .bible-testament-label {
        font-size: 16px;
        font-weight: 700;
        color: var(--bible-purple-light);
        padding: 12px 8px 8px;
      }

      .bible-drawer-book {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
        width: 100%;
        padding: 12px 14px;
        border: none;
        border-radius: 10px;
        background: var(--bible-surface);
        margin-bottom: 4px;
        text-align: left;
        cursor: pointer;
        transition: background 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-drawer-book.is-selected {
        background: var(--bible-purple);
      }

      .bible-drawer-book-en {
        font-size: 15px;
        font-weight: 500;
        color: var(--bible-text);
      }

      .bible-drawer-book.is-selected .bible-drawer-book-en {
        color: #fff;
      }

      .bible-drawer-book-am {
        font-size: 13px;
        color: var(--bible-text-muted);
      }

      .bible-drawer-book.is-selected .bible-drawer-book-am {
        color: rgba(255,255,255,0.8);
      }

      .bible-drawer-check {
        margin-left: auto;
        color: #fff;
        font-size: 16px;
      }

      /* Search overlay */
      .bible-search-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        animation: bible-fade-in 160ms ease both;
      }

      .bible-search-panel {
        width: 100%;
        max-width: 500px;
        max-height: 80vh;
        background: var(--bible-surface);
        border-radius: 16px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .bible-search-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--bible-border);
      }

      .bible-search-header input {
        flex: 1;
        border: none;
        outline: none;
        background: none;
        color: var(--bible-text);
        font-size: 16px;
      }

      .bible-search-header input::placeholder {
        color: var(--bible-text-muted);
      }

      .bible-search-header button {
        border: none;
        background: none;
        color: var(--bible-text);
        font-size: 22px;
        cursor: pointer;
      }

      .bible-search-results-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .bible-search-result-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
        padding: 12px;
        border: none;
        border-bottom: 1px solid var(--bible-border);
        background: none;
        text-align: left;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-search-result-ref {
        font-size: 13px;
        font-weight: 700;
        color: var(--bible-gold);
      }

      .bible-search-result-text {
        font-family: Georgia, serif;
        font-size: 14px;
        line-height: 20px;
        color: var(--bible-text);
      }

      .bible-search-empty {
        padding: 30px;
        text-align: center;
        color: var(--bible-text-muted);
        font-size: 14px;
      }

      /* State screens */
      .bible-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 65vh;
        gap: 13px;
        text-align: center;
      }

      .bible-state p {
        margin: 0;
        color: var(--bible-text-muted);
      }

      .bible-state--error {
        max-width: 440px;
        margin: auto;
      }

      .bible-state--error h1 {
        margin: 0;
        font-size: 1.55rem;
      }

      .bible-state__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border: 1px solid rgba(234, 179, 8, 0.55);
        border-radius: 50%;
        color: var(--bible-gold);
        font-weight: 800;
      }

      .bible-spinner {
        width: 27px;
        height: 27px;
        border: 3px solid rgba(234, 179, 8, 0.2);
        border-top-color: var(--bible-gold);
        border-radius: 50%;
        animation: bible-spin 800ms linear infinite;
      }

      .bible-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 20px;
        min-height: 48px;
        border: 1px solid var(--bible-border);
        border-radius: 10px;
        color: var(--bible-text-muted);
        background: rgba(255,255,255,0.045);
        font: inherit;
        font-size: 0.87rem;
        font-weight: 700;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .bible-button--primary {
        color: #211407;
        border-color: var(--bible-gold);
        background: var(--bible-gold);
      }

      @keyframes bible-spin { to { transform: rotate(360deg); } }
      @keyframes bible-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes bible-slide-in-left { from { transform: translateX(100%); } to { transform: translateX(0); } }

      @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; transition: none !important; }
      }
    `}</style>
  );
}
