import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Post, PostType, Profile, Flyer, Blog, ChatRoom } from '@/types';
import { EmptyState } from '@/components/ui';
import {
  Compass, Heart, Share2, FileText, Image as ImageIcon, Headphones,
  Type, MessageCircle, Search, Sparkles, UserPlus, UserCheck,
  ChevronLeft, ChevronRight, Loader, Newspaper,
} from 'lucide-react';

type Tab = 'posts' | 'flyers' | 'blogs' | 'users';

const TABS: { key: Tab; label: string; icon: typeof Compass }[] = [
  { key: 'posts', label: 'Posts', icon: MessageCircle },
  { key: 'flyers', label: 'Flyers', icon: ImageIcon },
  { key: 'blogs', label: 'Blogs', icon: Newspaper },
  { key: 'users', label: 'Users', icon: Sparkles },
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

export default function Explore() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('posts');
  const [search, setSearch] = useState('');

  const openAuthorProfile = (authorId?: string) => {
    if (authorId) navigate(`/profile?user=${encodeURIComponent(authorId)}`);
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
            <Compass className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-white/90 font-medium">Discover</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Explore</h1>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Browse all posts, flyers, blogs, and people in the Grace Book community.
          </p>
        </div>
      </section>

      {/* Tabs + Search */}
      <section className="section-padding">
        <div className="container-narrow">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      tab === t.key
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25'
                        : 'glasstext-slate-600 dark:text-slate-300 hover:scale-105'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {t.label}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${tab}...`}
                className="input-field pl-10"
              />
            </div>
          </div>

          {tab === 'posts' && <PostsTab search={search} openAuthorProfile={openAuthorProfile} />}
          {tab === 'flyers' && <FlyersTab search={search} openAuthorProfile={openAuthorProfile} />}
          {tab === 'blogs' && <BlogsTab search={search} openAuthorProfile={openAuthorProfile} />}
          {tab === 'users' && <UsersTab search={search} openAuthorProfile={openAuthorProfile} />}
        </div>
      </section>
    </div>
  );
}

/* ============== Posts Tab ============== */

function PostsTab({ search, openAuthorProfile }: { search: string; openAuthorProfile: (id?: string) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      showToast('Could not load posts', 'error');
      setLoading(false);
      return;
    }
    const fetched = (data as Post[]) ?? [];
    setPosts(fetched);
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
    setLoading(false);
  }, [showToast, user]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return posts.filter((p) =>
      !search || (p.title?.toLowerCase().includes(q)) || (p.content?.toLowerCase().includes(q))
    );
  }, [posts, search]);

  const toggleLike = useCallback(async (post: Post) => {
    if (!user) { showToast('Please sign in to like posts', 'info'); return; }
    const isLiked = likedPosts.has(post.id);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(post.id); else next.add(post.id);
      return next;
    });
    setPosts((prev) => prev.map((p) =>
      p.id === post.id ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ));
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
    }
  }, [user, likedPosts, showToast]);

  const handleShare = useCallback(async (post: Post) => {
    const text = post.title || post.content?.slice(0, 100) || 'Check out this post on Grace Book';
    if (navigator.share) {
      try { await navigator.share({ title: post.title || 'Grace Book Post', text }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); showToast('Link copied to clipboard', 'success'); }
      catch { showToast('Sharing not supported on this device', 'info'); }
    }
  }, [showToast]);

  if (loading) {
    return (
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-4 break-inside-avoid">
            <div className="skeleton h-40 rounded-xl mb-3" />
            <div className="skeleton h-5 w-3/4 rounded-lg mb-2" />
            <div className="skeleton h-4 w-1/2 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle className="h-8 w-8 text-primary-500" />}
        title="No Posts Found"
        description="There are no posts to explore right now. Check back later!"
      />
    );
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
      {filtered.map((post, i) => {
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
                <button
                  onClick={() => handleShare(post)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ml-auto"
                >
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

/* ============== Flyers Tab ============== */

function FlyersTab({ search, openAuthorProfile }: { search: string; openAuthorProfile: (id?: string) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [likedFlyers, setLikedFlyers] = useState<Set<string>>(new Set());

  const loadFlyers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('flyers')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      showToast('Could not load flyers', 'error');
      setLoading(false);
      return;
    }
    const fetched = (data as Flyer[]) ?? [];
    setFlyers(fetched);
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
    setLoading(false);
  }, [showToast, user]);

  useEffect(() => { loadFlyers(); }, [loadFlyers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flyers.filter((f) =>
      !search || (f.title?.toLowerCase().includes(q)) || (f.description?.toLowerCase().includes(q))
    );
  }, [flyers, search]);

  const toggleLike = useCallback(async (flyer: Flyer) => {
    if (!user) { showToast('Please sign in to like flyers', 'info'); return; }
    const isLiked = likedFlyers.has(flyer.id);
    setLikedFlyers((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(flyer.id); else next.add(flyer.id);
      return next;
    });
    setFlyers((prev) => prev.map((f) =>
      f.id === flyer.id ? { ...f, likes_count: f.likes_count + (isLiked ? -1 : 1) } : f
    ));
    if (isLiked) {
      await supabase.from('flyer_likes').delete().eq('flyer_id', flyer.id).eq('user_id', user.id);
    } else {
      await supabase.from('flyer_likes').insert({ flyer_id: flyer.id, user_id: user.id });
    }
  }, [user, likedFlyers, showToast]);

  if (loading) {
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

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon className="h-8 w-8 text-primary-500" />}
        title="No Flyers Found"
        description="There are no approved flyers to explore right now."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filtered.map((flyer, i) => {
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

/* ============== Blogs Tab ============== */

function BlogsTab({ search, openAuthorProfile }: { search: string; openAuthorProfile: (id?: string) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
    const fetched = (data as Blog[]) ?? [];
    setBlogs(fetched);
    setLoading(false);
    const authorIds = [...new Set(fetched.map((b) => b.user_id).filter(Boolean))] as string[];
    if (authorIds.length > 0) {
      const { data: profData } = await supabase.from('profiles').select('*').in('id', authorIds);
      const map: Record<string, Profile> = {};
      (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
      setAuthors(map);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
    load();
  }, [user, showToast, load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return blogs.filter((b) => !search || (b.title?.toLowerCase().includes(q)) || (b.content?.toLowerCase().includes(q)));
  }, [blogs, search]);

  if (loading) {
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

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Newspaper className="h-8 w-8 text-primary-500" />}
        title="No Blogs Found"
        description="There are no blog posts to explore right now."
      />
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((b, i) => {
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

/* ============== Users Tab ============== */

function UsersTab({ search, openAuthorProfile }: { search: string; openAuthorProfile: (id?: string) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<(Profile & { follower_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      showToast('Could not load users', 'error');
      setLoading(false);
      return;
    }
    const fetched = (data as Profile[]) ?? [];
    const counts: Record<string, number> = {};
    if (fetched.length > 0) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .in('following_id', fetched.map((p) => p.id));
      (follows as { following_id: string }[] | null)?.forEach((f) => {
        counts[f.following_id] = (counts[f.following_id] ?? 0) + 1;
      });
    }
    const merged = fetched
      .map((p) => ({ ...p, follower_count: counts[p.id] ?? 0 }))
      .sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0));
    setProfiles(merged);

    if (user) {
      const { data: myFollows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      setFollowingIds(new Set((myFollows ?? []).map((f: { following_id: string }) => f.following_id)));
    }
    setLoading(false);
  }, [showToast, user]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const toggleFollow = useCallback(async (targetId: string) => {
    if (!user) { showToast('Please sign in to follow users', 'info'); return; }
    if (targetId === user.id) return;
    const isFollowing = followingIds.has(targetId);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(targetId); else next.add(targetId);
      return next;
    });
    setProfiles((prev) => prev.map((p) =>
      p.id === targetId ? { ...p, follower_count: Math.max(0, (p.follower_count ?? 0) + (isFollowing ? -1 : 1)) } : p
    ));
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
    }
  }, [user, followingIds, showToast]);

  const startDirectMessage = useCallback(async (targetId: string) => {
    if (!user || targetId === user.id) return;
    setMessagingId(targetId);
    try {
      const { data: privateRooms } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'private')
        .eq('is_active', true)
        .contains('participants', [user.id, targetId]);
      const existingRoom = ((privateRooms as ChatRoom[] | null) ?? []).find((room) => {
        const participants = room.participants || [];
        return participants.length === 2 && participants.includes(user.id) && participants.includes(targetId);
      });
      if (existingRoom) {
        navigate(`/chat?room=${existingRoom.id}`);
        return;
      }
      const target = profiles.find((p) => p.id === targetId);
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: 'Chat with ' + (target?.username || 'user'),
          type: 'private',
          created_by: user.id,
          participants: [user.id, targetId],
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      navigate(`/chat?room=${newRoom.id}`);
    } catch {
      showToast('Could not start conversation', 'error');
    } finally {
      setMessagingId(null);
    }
  }, [user, profiles, navigate, showToast]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return profiles.filter((p) =>
      !search ||
      (p.username?.toLowerCase().includes(q)) ||
      (p.full_name?.toLowerCase().includes(q)) ||
      (p.bio?.toLowerCase().includes(q))
    );
  }, [profiles, search]);

  if (loading) {
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

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles className="h-8 w-8 text-primary-500" />}
        title="No Users Found"
        description="There are no users to discover right now."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((p, i) => {
        const isFollowing = followingIds.has(p.id);
        const isSelf = user?.id === p.id;
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            className="glass-card p-4 flex flex-col items-center text-center hover:shadow-xl transition-shadow duration-300"
          >
            <button
              onClick={() => openAuthorProfile(p.id)}
              className="mb-3"
              aria-label={`View ${p.username || 'user'} profile`}
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-primary-200 dark:ring-primary-800" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center text-2xl font-bold text-white">
                  {p.username?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </button>
            <button
              onClick={() => openAuthorProfile(p.id)}
              className="font-bold text-sm hover:text-primary-600 transition"
            >
              {p.username || 'Unnamed user'}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 mb-2">{p.bio || 'Community member'}</p>
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
              <UserCheck className="h-3.5 w-3.5" />
              {p.follower_count ?? 0} {(p.follower_count ?? 0) === 1 ? 'follower' : 'followers'}
            </div>
            {!isSelf && (
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => toggleFollow(p.id)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isFollowing
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  onClick={() => startDirectMessage(p.id)}
                  disabled={messagingId === p.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {messagingId === p.id ? 'Opening...' : 'Message'}
                </button>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
