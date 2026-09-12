import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, ShoppingCart, RefreshCw, Heart, Share2, Copy, MessageCircle, Send, Globe, Check } from 'lucide-react';
import { DownloadButton } from '../components/DownloadButton';

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
      
      // Extract unique categories
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
      if (storedLikes) setLikedBooks(JSON.parse(storedLikes) as Record<string, LikeState>);
    } catch {
      // Ignore malformed local storage and start with no likes.
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
      // Clipboard permissions can be denied; leave the share menu open.
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

  const filteredAndSortedBooks = useCallback(() => {
    let filtered = [...books];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (category !== 'all') {
      filtered = filtered.filter(book => book.category === category);
    }

    // Sort
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-64 mb-4"></div>
              <div className="bg-gray-200 rounded h-4 w-3/4 mb-2"></div>
              <div className="bg-gray-200 rounded h-4 w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchBooks}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayBooks = filteredAndSortedBooks();

  return (
    <div className="container mx-auto px-4 py-8">
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          <p className="text-gray-500 text-lg">No books found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayBooks.map((book) => (
            <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
                <h3 className="font-semibold text-lg mb-1 line-clamp-2">{book.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{book.author}</p>
                
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => toggleLike(book.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-rose-50 transition-colors"
                    aria-label={likedBooks[book.id]?.liked ? 'Unlike book' : 'Like book'}
                  >
                    <Heart className={likedBooks[book.id]?.liked ? 'w-4 h-4 text-rose-500 fill-rose-500' : 'w-4 h-4 text-gray-500'} />
                    <span>{likedBooks[book.id]?.count ?? 0}</span>
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSharingBookId((current) => current === book.id ? null : book.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-blue-50 transition-colors"
                      aria-haspopup="menu"
                      aria-expanded={sharingBookId === book.id}
                    >
                      <Share2 className="w-4 h-4 text-gray-500" /> Share
                    </button>
                    {sharingBookId === book.id && (
                      <div className="absolute left-0 top-full z-20 mt-2 min-w-44 rounded-lg border border-gray-200 bg-white p-2 shadow-lg" role="menu">
                        <button type="button" onClick={() => shareWithWebApi(book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100">
                          <Share2 className="w-4 h-4" /> Share…
                        </button>
                        <button type="button" onClick={() => shareToPlatform('whatsapp', book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100">
                          <MessageCircle className="w-4 h-4 text-green-600" /> WhatsApp
                        </button>
                        <button type="button" onClick={() => shareToPlatform('facebook', book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100">
                          <Globe className="w-4 h-4 text-blue-600" /> Facebook
                        </button>
                        <button type="button" onClick={() => shareToPlatform('telegram', book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100">
                          <Send className="w-4 h-4 text-sky-600" /> Telegram
                        </button>
                        <button type="button" onClick={() => copyShareLink(book)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100">
                          {copiedBookId === book.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          {copiedBookId === book.id ? 'Copied' : 'Copy Link'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {book.price_type === 'free' && (
                    <div className="flex gap-2">
                      {book.pdf_url && (
                        <DownloadButton
                          url={book.pdf_url}
                          filename={`${book.title}.pdf`}
                          label="PDF"
                          className="flex-1"
                        />
                      )}
                      {book.epub_url && (
                        <DownloadButton
                          url={book.epub_url}
                          filename={`${book.title}.epub`}
                          label="EPUB"
                          className="flex-1"
                        />
                      )}
                    </div>
                  )}
                  
                  {book.price_type === 'paid' && book.apple_books_url && (
                    <a
                      href={book.apple_books_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
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
