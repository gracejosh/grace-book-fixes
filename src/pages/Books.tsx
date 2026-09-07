import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Download, ShoppingCart, RefreshCw } from 'lucide-react';

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

const Books: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'author'>('newest');
  const [category, setCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

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

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

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
                
                <div className="space-y-2">
                  {book.price_type === 'free' && (
                    <div className="flex gap-2">
                      {book.pdf_url && (
                        <button
                          onClick={() => handleDownload(book.pdf_url, `${book.title}.pdf`)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </button>
                      )}
                      {book.epub_url && (
                        <button
                          onClick={() => handleDownload(book.epub_url, `${book.title}.epub`)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          EPUB
                        </button>
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
