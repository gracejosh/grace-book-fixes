import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Post, PostType, Profile, Flyer, Blog } from '@/types';
import { EmptyState } from '@/components/ui';
import {
  Search as SearchIcon, Sparkles, Heart, Share2, FileText,
  Image as ImageIcon, Headphones, Type, MessageCircle,
  Newspaper, X, Clock, Loader,
} from 'lucide-react';

type Tab = 'users' | 'posts' | 'blogs' | 'flyers';

const TABS: { key: Tab; label: string; icon: typeof SearchIcon }[] = [
  { key: 'users', label: 'Users', icon: Sparkles },
  { key: 'posts', label: 'Posts', icon: MessageCircle },
  { key: 'blogs', label: 'Blogs', icon: Newspaper },
  { key: 'flyers', label: 'Flyers', icon: ImageIcon },
];

const typeIcon = (type: PostType) => {
  switch (type) {
    case 'text': return Type;
    case 'image': return ImageIcon;
    case 'pdf': return FileText;
    case 'audio': return Headphones;
  }
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const RECENT_KEY = 'gracebook_recent_searches';
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecent(term: string) {
  const current = loadRecent();
  const next = [term, ...current.filter((s) => s !== term)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

export default function Search() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('users');
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openAuthorProfile = (authorId?: string) => {
    if (authorId) navigate(`/profile?user=${encodeURIComponent(authorId)}`);
  };

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) {
      setDebounced('');
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebounced(input.trim());
      setSearched(true);
      saveRecent(input.trim());
      setRecent(loadRecent());
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input]);

  const pickRecent = (term: string) => {
    setInput(term);
  };

  const clearRecent = () => {
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
    setRecent([]);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 dark:from-slate-950 dark:via-primary-950 dark:to-slate-950 py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-64 h-64 bg-gold-500 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-20 w-64 h-64 bg-primary-500 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <SearchIcon className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-white/90 font-medium">Discover</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Search</h1>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Find people, posts, blogs, and flyers across the Grace Book community.
          </p>
        </div>
      </section>

      {/* Sticky Search Bar + Tabs */}
      <div className="sticky top-14 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="container-narrow px-4 py-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search anything..."
              className="input-field pl-10 pr-10"
              autoFocus
            />
            {input && (
              <button
                onClick={() => { setInput(''); setSearched(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    tab === t.key
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25'
                      : 'glass text-slate-600 dark:text-slate-300 hover:scale-105'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="section-padding">
        <div className="container-narrow">
          {!searched && !debounced ? (
            <div>
              {recent.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> Recent Searches
                    </h3>
                    <button
                      onClick={clearRecent}
                      className="text-xs text-slate-400 hover:text-red-500 transition"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((term) => (
                      <button
                        key={term}
                        onClick={() => pickRecent(term)}
                        className="px-3 py-1.5 rounded-xl text-sm glass text-slate-600 dark:text-slate-300 hover:scale-105 transition-all"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <EmptyState
                icon={<SearchIcon className="h-8 w-8 text-primary-500" />}
                title="Search Anything"
                description="Find users, posts, blogs, and flyers by typing in the search bar above."
              />
            </div>
          ) : loading ? (
            <SearchSkeleton tab={tab} />
          ) : (
            <SearchResults
              tab={tab}
              query={debounced}
              openAuthorProfile={openAuthorProfile}
              onLoadingChange={setLoading}
              showToast={showToast}
              user={user}
            />
          )}
        </div>
      </section>
    </div>
  );
}

/* ============== Results Router ============== */

function SearchResults({
  tab, query, openAuthorProfile, onLoadingChange, showToast, user,
}: {
  tab: Tab;
  query: string;
  openAuthorProfile: (id?: string) => void;
  onLoadingChange: (v: boolean) => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
  user: ReturnType<typeof useAuth>['user'];
}) {
  if (tab === 'users') return <UsersResults query={query} openAuthorProfile={openAuthorProfile} onLoadingChange={onLoadingChange} showToast={showToast} />;
  if (tab === 'posts') return <PostsResults query={query} openAuthorProfile={openAuthorProfile} onLoadingChange={onLoadingChange} showToast={showToast} user={user} />;
  if (tab === 'blogs') return <BlogsResults query={query} openAuthorProfile={openAuthorProfile} onLoadingChange={onLoadingChange} showToast={showToast} user={user} />;
  return <FlyersResults query={query} openAuthorProfile={openAuthorProfile} onLoadingChange={onLoadingChange} showToast={showToast} user={user} />;
}

/* ============== Users Results ============== */

function UsersResults({ query, openAuthorProfile, onLoadingChange, showToast }: {
  query: string;
  openAuthorProfile: (id?: string) => void;
  onLoadingChange: (v: boolean) => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [results, setResults] = useState<Profile[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onLoadingChange(true);
    setDone(false);
    supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) showToast('Search failed', 'error');
        setResults((data as Profile[]) ?? []);
        setDone(true);
        onLoadingChange(false);
      });
    return () => { cancelled = true; };
  }, [query, onLoadingChange, showToast]);

  if (!done) return null;

  if (results.length === 0) {
    return <EmptyState icon={<Sparkles className="h-8 w-8 text-primary-500" />} title="No Results Found" description={`No users match "${query}".`} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.4) }}
          className="glass-card p-4 flex items-center gap-3 hover:shadow-xl transition-shadow duration-300"
        >
          <button onClick={() => openAuthorProfile(p.id)} aria-label={`View ${p.username || 'user'} profile`}>
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center text-xl font-bold text-white">
                {p.username?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={() => openAuthorProfile(p.id)} className="font-bold text-sm hover:text-primary-600 transition truncate block">
              {p.username || 'Unnamed user'}
            </button>
            {p.full_name && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.full_name}</p>}
            {p.bio && <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{p.bio}</p>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ============== Posts Results ============== */

function PostsResults({ query, openAuthorProfile, onLoadingChange, showToast, user }: {
  query: string;
  openAuthorProfile: (id?: string) => void;
  onLoadingChange: (v: boolean) => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
  user: ReturnType<typeof useAuth>['user'];
}) {
  const [results, setResults] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onLoadingChange(true);
    setDone(false);
    supabase
      .from('posts')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) showToast('Search failed', 'error');
        const fetched = (data as Post[]) ?? [];
        setResults(fetched);
        const authorIds = [...new Set(fetched.map((p) => p.user_id).filter(Boolean) as string[])];
        if (authorIds.length > 0) {
          const { data: profData } = await supabase.from('profiles').select('*').in('id', authorIds);
          const map: Record<string, Profile> = {};
          (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
          setAuthors(map);
        }
        if (user) {
          const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id);
          setLikedPosts(new Set((likes ?? []).map((l: { post_id: string }) => l.post_id)));
        }
        setDone(true);
        onLoadingChange(false);
      });
    return () => { cancelled = true; };
  }, [query, onLoadingChange, showToast, user]);

  const toggleLike = useCallback(async (post: Post) => {
    if (!user) { showToast('Please sign in to like posts', 'info'); return; }
    const isLiked = likedPosts.has(post.id);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(post.id); else next.add(post.id);
      return next;
    });
    setResults((prev) => prev.map((p) =>
      p.id === post.id ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ));
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
    }
  }, [user, likedPosts, showToast]);

  if (!done) return null;

  if (results.length === 0) {
    return <EmptyState icon={<MessageCircle className="h-8 w-8 text-primary-500" />} title="No Results Found" description={`No posts match "${query}".`} />;
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
      {results.map((post, i) => {
        const author = post.user_id ? authors[post.user_id] : undefined;
        const Icon = typeIcon(post.type);
        const isLiked = likedPosts.has(post.id);
        return (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            className="glass-card overflow-hidden break-inside-avoid mb-4 group hover:shadow-xl transition-shadow duration-300"
          >
            {post.type === 'image' && post.media_url && (
              <div className="relative overflow-hidden">
                <img src={post.media_url} alt={post.title || 'Post image'} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
            )}
            {post.type === 'pdf' && post.media_url && (
              <div className="relative bg-gradient-to-br from-rose-500 to-rose-700 p-8 flex flex-col items-center justify-center text-white">
                <FileText className="h-16 w-16 mb-3" />
                <p className="text-sm font-semibold">{post.file_name || 'PDF Document'}</p>
              </div>
            )}
            {post.type === 'audio' && post.media_url && (
              <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Headphones className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{post.file_name || 'Audio Track'}</p>
                </div>
                <audio controls className="w-full h-10 rounded-lg"><source src={post.media_url} /></audio>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                  <Icon className="h-3 w-3" /> {post.type.toUpperCase()}
                </span>
              </div>
              {post.title && <h3 className="font-bold text-base mb-1 line-clamp-2">{post.title}</h3>}
              {post.type === 'text' && post.content && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3 line-clamp-6 whitespace-pre-wrap">{post.content}</p>
              )}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => openAuthorProfile(author?.id)}
                  className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden transition hover:ring-2 hover:ring-primary-400"
                  aria-label="View author profile"
                >
                  {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" /> : author?.username?.charAt(0).toUpperCase() || '?'}
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => openAuthorProfile(author?.id)} className="text-xs font-medium truncate hover:text-primary-600 transition">{author?.username || 'Unknown'}</button>
                  <p className="text-xs text-slate-400">{timeAgo(post.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  onClick={() => toggleLike(post)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isLiked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
                  {post.likes_count > 0 && post.likes_count}
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ml-auto">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ============== Blogs Results ============== */

function BlogsResults({ query, openAuthorProfile, onLoadingChange, showToast, user }: {
  query: string;
  openAuthorProfile: (id?: string) => void;
  onLoadingChange: (v: boolean) => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
  user: ReturnType<typeof useAuth>['user'];
}) {
  const [results, setResults] = useState<Blog[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onLoadingChange(true);
    setDone(false);
    supabase
      .from('blogs')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) showToast('Search failed', 'error');
        const fetched = (data as Blog[]) ?? [];
        setResults(fetched);
        const authorIds = [...new Set(fetched.map((b) => b.user_id).filter(Boolean))] as string[];
        if (authorIds.length > 0) {
          const { data: profData } = await supabase.from('profiles').select('*').in('id', authorIds);
          const map: Record<string, Profile> = {};
          (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
          setAuthors(map);
        }
        setDone(true);
        onLoadingChange(false);
      });
    return () => { cancelled = true; };
  }, [query, onLoadingChange, showToast]);

  const toggleLike = useCallback(async (blog: Blog) => {
    if (!user) { showToast('Please sign in to like posts', 'warning'); return; }
    const { data } = await supabase.from('blog_likes').select('id').eq('blog_id', blog.id).eq('user_id', user.id).maybeSingle();
    if (data) {
      await supabase.from('blog_likes').delete().eq('blog_id', blog.id).eq('user_id', user.id);
      await supabase.from('blogs').update({ likes_count: Math.max(0, blog.likes_count - 1) }).eq('id', blog.id);
    } else {
      await supabase.from('blog_likes').insert({ blog_id: blog.id, user_id: user.id });
      await supabase.from('blogs').update({ likes_count: blog.likes_count + 1 }).eq('id', blog.id);
    }
    setResults((prev) => prev.map((b) =>
      b.id === blog.id ? { ...b, likes_count: data ? Math.max(0, b.likes_count - 1) : b.likes_count + 1 } : b
    ));
  }, [user, showToast]);

  if (!done) return null;

  if (results.length === 0) {
    return <EmptyState icon={<Newspaper className="h-8 w-8 text-primary-500" />} title="No Results Found" description={`No blogs match "${query}".`} />;
  }

  return (
    <div className="space-y-4">
      {results.map((b, i) => {
        const author = b.user_id ? authors[b.user_id] : null;
        return (
          <motion.article
            key={b.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card overflow-hidden"
          >
            {b.image_url && <img src={b.image_url} alt={b.title ?? ''} className="w-full h-40 object-cover" />}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {author?.avatar_url ? (
                  <img onClick={() => openAuthorProfile(author?.id)} src={author.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover cursor-pointer" />
                ) : (
                  <div onClick={() => openAuthorProfile(author?.id)} className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                    {author?.username?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                )}
                <span onClick={() => openAuthorProfile(author?.id)} className="text-xs font-medium cursor-pointer hover:text-primary-600 transition">{author?.username ?? 'Unknown'}</span>
                <span className="text-xs text-slate-400">{new Date(b.created_at).toLocaleDateString()}</span>
              </div>
              <h2 className="font-bold text-lg mb-1">{b.title ?? 'Untitled'}</h2>
              {b.category && <span className="inline-block text-xs px-2 py-0.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 mb-2">{b.category}</span>}
              {b.tags && b.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {b.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">#{tag}</span>
                  ))}
                </div>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">{b.content}</p>
              <button
                onClick={() => toggleLike(b)}
                className="flex items-center gap-1.5 mt-3 text-sm text-slate-500 hover:text-red-500 transition-colors"
              >
                <Heart className="h-4 w-4" /> {b.likes_count}
              </button>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

/* ============== Flyers Results ============== */

function FlyersResults({ query, openAuthorProfile, onLoadingChange, showToast, user }: {
  query: string;
  openAuthorProfile: (id?: string) => void;
  onLoadingChange: (v: boolean) => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
  user: ReturnType<typeof useAuth>['user'];
}) {
  const [results, setResults] = useState<Flyer[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [likedFlyers, setLikedFlyers] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onLoadingChange(true);
    setDone(false);
    supabase
      .from('flyers')
      .select('*')
      .eq('is_approved', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) showToast('Search failed', 'error');
        const fetched = (data as Flyer[]) ?? [];
        setResults(fetched);
        const authorIds = [...new Set(fetched.map((f) => f.user_id).filter(Boolean))] as string[];
        if (authorIds.length > 0) {
          const { data: profData } = await supabase.from('profiles').select('*').in('id', authorIds);
          const map: Record<string, Profile> = {};
          (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
          setAuthors(map);
        }
        if (user) {
          const { data: likes } = await supabase.from('flyer_likes').select('flyer_id').eq('user_id', user.id);
          setLikedFlyers(new Set((likes ?? []).map((l: { flyer_id: string }) => l.flyer_id)));
        }
        setDone(true);
        onLoadingChange(false);
      });
    return () => { cancelled = true; };
  }, [query, onLoadingChange, showToast, user]);

  const toggleLike = useCallback(async (flyer: Flyer) => {
    if (!user) { showToast('Please sign in to like flyers', 'info'); return; }
    const isLiked = likedFlyers.has(flyer.id);
    setLikedFlyers((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(flyer.id); else next.add(flyer.id);
      return next;
    });
    setResults((prev) => prev.map((f) =>
      f.id === flyer.id ? { ...f, likes_count: f.likes_count + (isLiked ? -1 : 1) } : f
    ));
    if (isLiked) {
      await supabase.from('flyer_likes').delete().eq('flyer_id', flyer.id).eq('user_id', user.id);
    } else {
      await supabase.from('flyer_likes').insert({ flyer_id: flyer.id, user_id: user.id });
    }
  }, [user, likedFlyers, showToast]);

  if (!done) return null;

  if (results.length === 0) {
    return <EmptyState icon={<ImageIcon className="h-8 w-8 text-primary-500" />} title="No Results Found" description={`No flyers match "${query}".`} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {results.map((flyer, i) => {
        const author = flyer.user_id ? authors[flyer.user_id] : undefined;
        const isLiked = likedFlyers.has(flyer.id);
        const images = flyer.images?.length ? flyer.images : [];
        return (
          <motion.div
            key={flyer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            className="glass-card overflow-hidden group hover:shadow-xl transition-shadow duration-300"
          >
            {images.length > 0 && (
              <div className="relative aspect-[3/4] overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img src={images[0]} alt={flyer.title || 'Flyer'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                {flyer.category && (
                  <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-semibold shadow-lg">
                    {flyer.category}
                  </span>
                )}
              </div>
            )}
            <div className="p-4">
              {flyer.title && <h3 className="font-bold text-base mb-1 line-clamp-2">{flyer.title}</h3>}
              {flyer.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3 line-clamp-3">{flyer.description}</p>
              )}
              {author && (
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => openAuthorProfile(author.id)} className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                    {author.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" /> : author.username?.charAt(0).toUpperCase() || '?'}
                  </button>
                  <button onClick={() => openAuthorProfile(author.id)} className="text-xs font-medium truncate hover:text-primary-600 transition">{author.username || 'Unknown'}</button>
                  <p className="text-xs text-slate-400 ml-auto">{timeAgo(flyer.created_at)}</p>
                </div>
              )}
              <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  onClick={() => toggleLike(flyer)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isLiked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
                  {flyer.likes_count > 0 && flyer.likes_count}
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ============== Skeleton ============== */

function SearchSkeleton({ tab }: { tab: Tab }) {
  if (tab === 'users') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-3">
            <div className="skeleton h-12 w-12 rounded-full" />
            <div className="flex-1">
              <div className="skeleton h-5 w-1/2 rounded-lg mb-2" />
              <div className="skeleton h-4 w-3/4 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (tab === 'blogs') {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="skeleton h-40 rounded-xl mb-3" />
            <div className="skeleton h-5 w-3/4 rounded-lg mb-2" />
            <div className="skeleton h-4 w-1/2 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="glass-card p-4">
          <div className="skeleton h-64 rounded-xl mb-3" />
          <div className="skeleton h-5 w-3/4 rounded-lg mb-2" />
          <div className="skeleton h-4 w-1/2 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
