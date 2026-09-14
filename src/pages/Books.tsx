import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Heart, Share2, Copy, MessageCircle, Send, Globe, Check, Download, Loader, CheckCircle } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  pdf_url: string;
  epub_url: string;
  price: number;
  price_type: 'free' | 'paid';
  apple_books_url: string;
  category: string;
  created_at: string;
}

type LikeState = {
  liked: boolean;
  count: number;
};

const Books: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'author'>('newest');
  const [category, setCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [likedBooks, setLikedBooks] = useState<Record<string, LikeState>>({});
  const [sharingBookId, setSharingBookId] = useState<string | null>(null);
  const [copiedBookId, setCopiedBookId] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<Record<string, { progress: number | null; done: boolean; error: boolean }>>({});

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBooks(data || []);
      
      const cats = Array.from(new Set((data || []).map(book => book.category).filter(Boolean)));
      setCategories(cats as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    try {
      const storedLikes = window.localStorage.getItem('grace-book-likes');
      if (storedLikes) {
        setLikedBooks(JSON.parse(storedLikes));
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const toggleLike = (bookId: string) => {
    setLikedBooks((current) => {
      const previous = current[bookId] ?? { liked: false, count: 0 };
      const next = {
        ...current,
        [bookId]: {
          liked: !previous.liked,
          count: Math.max(0, previous.count + (previous.liked ? -1 : 1)),
        },
      };
      window.localStorage.setItem('grace-book-likes', JSON.stringify(next));
      return next;
    });
  };

  const getShareUrl = () => window.location.href;

  const copyShareLink = async (book: Book) => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopiedBookId(book.id);
      window.setTimeout(() => setCopiedBookId(null), 2000);
    } catch {
      // Clipboard permissions can be denied
    }
  };

  const shareWithWebApi = async (book: Book) => {
    const shareData = {
      title: book.title,
      text: `${book.title} by ${book.author}`,
      url: getShareUrl(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setSharingBookId(null);
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      }
    }

    await copyShareLink(book);
  };

  const shareToPlatform = (platform: 'whatsapp' | 'facebook' | 'telegram', book: Book) => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(`${book.title} by ${book.author}`);
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };
    window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
    setSharingBookId(null);
  };

  const handleDownload = useCallback(async (book: Book, fileType: 'pdf' | 'epub') => {
    const stateKey = `${book.id}-${fileType}`;
    const current = downloadState[stateKey];
    if (current?.progress !== null && current?.progress !== undefined) return;

    setDownloadState(prev => ({ ...prev, [stateKey]: { progress: 0, done: false, error: false } }));

    const fileUrl = fileType === 'pdf' ? book.pdf_url : book.epub_url;
    const filename = `${book.title}.${fileType}`;

    try {
      const proxyUrl = `/api/download?url=${encodeURIComponent(fileUrl)}`;

      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setDownloadState(prev => ({ ...prev, [stateKey]: { progress: 100, done: true, error: false } }));
      window.setTimeout(() => {
        setDownloadState(prev => ({ ...prev, [stateKey]: { progress: null, done: false, error: false } }));
      }, 2000);
    } catch {
      window.open(fileUrl, '_blank');
      setDownloadState(prev => ({ ...prev, [stateKey]: { progress: null, done: false, error: false } }));
    }
  }, [downloadState]);

  const filteredAndSortedBooks = useCallback(() => {
    let filtered = [...books];

    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (category !== 'all') {
      filtered = filtered.filter(book => book.category === category);
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        filtered.sort((a, b) => a.author.localeCompare(b.author));
        break;
    }

    return filtered;
  }, [books, searchTerm, sortBy, category]);

  const displayBooks = filteredAndSortedBooks();

  const renderDownloadButton = (book: Book, fileType: 'pdf' | 'epub') => {
    const stateKey = `${book.id}-${fileType}`;
    const state = downloadState[stateKey] ?? { progress: null, done: false, error: false };
    const hasUrl = fileType === 'pdf' ? book.pdf_url : book.epub_url;
    if (!hasUrl) return null;

    return (
      <button
        type="button"
        onClick={() => handleDownload(book, fileType)}
        className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-lg border border-emerald-400 bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={state.progress !== null}
      >
        {state.progress !== null ? (
          <span className="inline-flex items-center gap-1.5">
            {state.done ? <CheckCircle className="h-4 w-4" /> : <Loader className="h-4 w-4 animate-spin" />}
            {state.done ? 'Done' : `${state.progress}%`}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Download className="h-4 w-4" /> {fileType.toUpperCase()}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-[#1a0f2e] text-white min-h-screen">
      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search books by title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-purple-700 rounded-lg bg-[#2d1b4e] text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-purple-700 rounded-lg bg-[#2d1b4e] text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 border border-purple-700 rounded-lg bg-[#2d1b4e] text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {displayBooks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No books found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayBooks.map((book) => (
            <div key={book.id} className="bg-[#2d1b4e] rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-purple-800">
              <div className="relative pb-[140%]">
                <img
                  src={book.cover_url || '/placeholder-cover.jpg'}
                  alt={book.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {book.price_type === 'free' ? (
                  <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    FREE
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    ${book.price}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1 line-clamp-2 text-white">{book.title}</h3>
                <p className="text-gray-300 text-sm mb-3">{book.author}</p>
                
                <div className="flex items-center gap-2 mb-3">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={() => toggleLike(book.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-700 text-sm text-white hover:bg-purple-800 transition-colors"
                    aria-label={likedBooks[book.id]?.liked ? 'Unlike book' : 'Like book'}
                  >
                    <Heart className={likedBooks[book.id]?.liked ? 'w-4 h-4 text-rose-500 fill-rose-500' : 'w-4 h-4 text-gray-300'} />
                    <span>{likedBooks[book.id]?.count ?? 0}</span>
                  </button>

                  {/* Instant Device Share Button - uses navigator.share */}
                  <button
                    type="button"
                    onClick={() => shareWithWebApi(book)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-700 text-sm text-white hover:bg-purple-800 transition-colors"
                    aria-label="Share this book"
                  >
                    <Share2 className="w-4 h-4 text-gray-300" /> Share
                  </button>

                  {/* Share Dropdown Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSharingBookId((current) => current === book.id ? null : book.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-purple-700 text-sm text-white hover:bg-purple-800 transition-colors"
                      aria-haspopup="menu"
                      aria-expanded={sharingBookId === book.id}
                      aria-label="More share options"
                    >
                      <Copy className="w-4 h-4 text-gray-300" />
                    </button>
                    {sharingBookId === book.id && (
                      <div className="absolute left-0 top-full z-20 mt-2 min-w-44 rounded-lg border border-purple-700 bg-[#2d1b4e] p-2 shadow-lg" role="menu">
                        <button type="button" onClick={() => shareWithWebApi(book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-purple-800">
                          <Share2 className="w-4 h-4" /> Share…
                        </button>
                        <button type="button" onClick={() => shareToPlatform('whatsapp', book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-purple-800">
                          <MessageCircle className="w-4 h-4 text-green-400" /> WhatsApp
                        </button>
                        <button type="button" onClick={() => shareToPlatform('facebook', book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-purple-800">
                          <Globe className="w-4 h-4 text-blue-400" /> Facebook
                        </button>
                        <button type="button" onClick={() => shareToPlatform('telegram', book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-purple-800">
                          <Send className="w-4 h-4 text-sky-400" /> Telegram
                        </button>
                        <button type="button" onClick={() => copyShareLink(book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-purple-800">
                          {copiedBookId === book.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          {copiedBookId === book.id ? 'Copied' : 'Copy Link'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {book.price_type === 'free' && (
                    <div className="flex gap-2">
                      {renderDownloadButton(book, 'pdf')}
                      {renderDownloadButton(book, 'epub')}
                    </div>
                  )}
                  
                  {book.price_type === 'paid' && book.apple_books_url && (
                    <a
                      href={book.apple_books_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-3 py-2 bg-white text-purple-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold"
                    >
                      Buy on Apple Books
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Books;
