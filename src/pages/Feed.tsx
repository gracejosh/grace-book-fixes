import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Post, PostType, Profile } from '@/types';
import {
  Heart, Share2, FileText, Image as ImageIcon, Headphones,
  Type, MessageCircle, Sparkles, Compass,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';

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

export default function Feed() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const loadFeed = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get IDs of users the current user follows
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (followsError) {
      showToast('Could not load your feed', 'error');
      setLoading(false);
      return;
    }

    const followingIds = ((followsData as { following_id: string }[] | null) ?? []).map(
      (f) => f.following_id,
    );

    if (followingIds.length === 0) {
      setPosts([]);
      setAuthors({});
      setLoading(false);
      return;
    }

    // Fetch posts from followed users
    const { data: postData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (postsError) {
      showToast('Could not load posts', 'error');
      setLoading(false);
      return;
    }

    const fetched = (postData as Post[]) ?? [];
    setPosts(fetched);

    // Fetch author profiles
    const authorIds = [...new Set(fetched.map((p) => p.user_id).filter(Boolean) as string[])];
    if (authorIds.length > 0) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds);
      const map: Record<string, Profile> = {};
      (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
      setAuthors(map);
    } else {
      setAuthors({});
    }

    // Fetch liked posts
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id);
    setLikedPosts(new Set((likes ?? []).map((l: { post_id: string }) => l.post_id)));

    setLoading(false);
  }, [user, showToast]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const sortedPosts = useMemo(() => posts, [posts]);

  const toggleLike = useCallback(async (post: Post) => {
    if (!user) {
      showToast('Please sign in to like posts', 'info');
      return;
    }
    const isLiked = likedPosts.has(post.id);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(post.id); else next.add(post.id);
      return next;
    });
    setPosts((prev) => prev.map((p) =>
      p.id === post.id ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p,
    ));
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
    }
  }, [user, likedPosts, showToast]);

  const handleNativeShare = useCallback(async (post: Post) => {
    const text = post.title || post.content?.slice(0, 100) || 'Check out this post on Grace Book';
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title || 'Grace Book Post', text });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Link copied to clipboard', 'success');
      } catch {
        showToast('Sharing not supported on this device', 'info');
      }
    }
  }, [showToast]);

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
            <Sparkles className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-white/90 font-medium">Personalized For You</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Your Feed
          </h1>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Posts from everyone you follow — all in one place.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="container-narrow">
          {loading ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 break-inside-avoid">
                  <div className="skeleton h-40 rounded-xl mb-3" />
                  <div className="skeleton h-5 w-3/4 rounded-lg mb-2" />
                  <div className="skeleton h-4 w-1/2 rounded-lg" />
                </div>
              ))}
            </div>
          ) : sortedPosts.length === 0 ? (
            <EmptyState
              icon={<Compass className="h-8 w-8 text-primary-500" />}
              title="Follow users to see their posts"
              description="Discover and follow people to fill your feed with their latest posts."
              action={
                <button onClick={() => navigate('/posts')} className="btn-gold">
                  <Compass className="h-4 w-4" /> Explore Posts
                </button>
              }
            />
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
              {sortedPosts.map((post, i) => {
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
                    {/* Media content */}
                    {post.type === 'image' && post.media_url && (
                      <div className="relative overflow-hidden">
                        <img
                          src={post.media_url}
                          alt={post.title || 'Post image'}
                          className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {post.type === 'pdf' && post.media_url && (
                      <div className="relative bg-gradient-to-br from-rose-500 to-rose-700 p-8 flex flex-col items-center justify-center text-white">
                        <FileText className="h-16 w-16 mb-3" />
                        <p className="text-sm font-semibold">{post.file_name || 'PDF Document'}</p>
                        <a
                          href={post.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition hover:bg-white/30"
                        >
                          <FileText className="h-3.5 w-3.5" /> View PDF
                        </a>
                      </div>
                    )}

                    {post.type === 'audio' && post.media_url && (
                      <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Headphones className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{post.file_name || 'Audio Track'}</p>
                          </div>
                        </div>
                        <audio controls className="w-full h-10 rounded-lg">
                          <source src={post.media_url} />
                        </audio>
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-4">
                      {/* Type badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                          <Icon className="h-3 w-3" /> {post.type.toUpperCase()}
                        </span>
                      </div>

                      {/* Title */}
                      {post.title && (
                        <h3 className="font-bold text-base mb-1 line-clamp-2">{post.title}</h3>
                      )}

                      {/* Text content */}
                      {post.type === 'text' && post.content && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3 line-clamp-6 whitespace-pre-wrap">
                          {post.content}
                        </p>
                      )}

                      {/* Author */}
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => openAuthorProfile(author?.id)}
                          className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden transition hover:ring-2 hover:ring-primary-400"
                          aria-label="View author profile"
                        >
                          {author?.avatar_url ? (
                            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            author?.username?.charAt(0).toUpperCase() || '?'
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => openAuthorProfile(author?.id)}
                            className="text-xs font-medium truncate hover:text-primary-600 transition"
                          >
                            {author?.username || 'Unknown'}
                          </button>
                          <p className="text-xs text-slate-400">{timeAgo(post.created_at)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                          onClick={() => toggleLike(post)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isLiked
                              ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
                          {post.likes_count > 0 && post.likes_count}
                        </button>

                        <button
                          onClick={() => showToast('Comments coming soon', 'info')}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleNativeShare(post)}
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
          )}
        </div>
      </section>
    </div>
  );
}
