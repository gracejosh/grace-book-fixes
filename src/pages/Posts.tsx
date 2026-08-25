import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, uploadToCloudinary } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Post, PostType, Profile } from '@/types';
import {
  Heart, Share2, Download, FileText, Image as ImageIcon, Headphones,
  Type, Plus, X, Trash2, Loader, Facebook, Twitter, MessageCircle, Mail,
  Search, Sparkles,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';

const FILTERS: { key: 'all' | PostType; label: string; icon: typeof Type }[] = [
  { key: 'all', label: 'All', icon: Sparkles },
  { key: 'text', label: 'Text', icon: Type },
  { key: 'image', label: 'Image', icon: ImageIcon },
  { key: 'pdf', label: 'PDF', icon: FileText },
  { key: 'audio', label: 'Audio', icon: Headphones },
];

const typeIcon = (type: PostType) => {
  switch (type) {
    case 'text': return Type;
    case 'image': return ImageIcon;
    case 'pdf': return FileText;
    case 'audio': return Headphones;
  }
};

const formatBytes = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export default function Posts() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | PostType>('all');
  const [search, setSearch] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [sharePost, setSharePost] = useState<Post | null>(null);

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

    const authorIds = [...new Set(fetched.map((p) => p.user_id))];
    if (authorIds.length > 0) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds);
      const map: Record<string, Profile> = {};
      (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
      setAuthors(map);
    }

    if (user) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);
      setLikedPosts(new Set((likes ?? []).map((l: { post_id: string }) => l.post_id)));
    }

    setLoading(false);
  }, [showToast, user]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesType = filter === 'all' || p.type === filter;
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        (p.title?.toLowerCase().includes(q)) ||
        (p.content?.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [posts, filter, search]);

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
      p.id === post.id ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ));
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
    }
  }, [user, likedPosts, showToast]);

  const handleDownload = useCallback(async (post: Post) => {
    if (!post.media_url) return;
    if (user) {
      await supabase.from('post_downloads').insert({ post_id: post.id, user_id: user.id });
    }
    setPosts((prev) => prev.map((p) =>
      p.id === post.id ? { ...p, downloads_count: p.downloads_count + 1 } : p
    ));
    const a = document.createElement('a');
    a.href = post.media_url;
    a.download = post.file_name || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [user]);

  const handleDelete = useCallback(async (post: Post) => {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) {
      showToast('Could not delete post', 'error');
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    showToast('Post deleted', 'info');
  }, [showToast]);

  const canDelete = (post: Post) => user?.id === post.user_id || profile?.is_admin;

  const shareUrl = (post: Post) => encodeURIComponent(
    `${post.title || post.content || 'Check out this post'} via Grace Book`
  );
  const shareText = (post: Post) => encodeURIComponent(
    post.title || post.content || 'Check out this post on Grace Book'
  );

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
            <span className="text-sm text-white/90 font-medium">Community Posts</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Share & Discover
          </h1>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Text, images, PDFs, and audio — all shared by our community. Like, download, and spread the word.
          </p>
          {user && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn-gold"
            >
              <Plus className="h-5 w-5" /> Create Post
            </button>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="container-narrow">
          {/* Filters + Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      filter === f.key
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25'
                        : 'glass text-slate-600 dark:text-slate-300 hover:scale-105'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {f.label}
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
                placeholder="Search posts..."
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Masonry Grid */}
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
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8 text-primary-500" />}
              title="No Posts Yet"
              description={user ? "Be the first to share something with the community!" : "Sign in to create and share posts."}
              action={user ? <button onClick={() => setShowUpload(true)} className="btn-primary"><Plus className="h-4 w-4" /> Create Post</button> : undefined}
            />
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
              {filtered.map((post, i) => {
                const author = authors[post.user_id];
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
                        {post.file_size && <p className="text-xs text-white/70 mt-1">{formatBytes(post.file_size)}</p>}
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
                            {post.file_size && <p className="text-xs text-white/70">{formatBytes(post.file_size)}</p>}
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
                        {canDelete(post) && (
                          <button
                            onClick={() => handleDelete(post)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            aria-label="Delete post"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        )}
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
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                          {author?.avatar_url ? (
                            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            author?.username?.charAt(0).toUpperCase() || '?'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{author?.username || 'Unknown'}</p>
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

                        {(post.type === 'pdf' || post.type === 'audio') && post.media_url && (
                          <button
                            onClick={() => handleDownload(post)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                          >
                            <Download className="h-4 w-4" />
                            {post.downloads_count > 0 && post.downloads_count}
                          </button>
                        )}

                        <button
                          onClick={() => setSharePost(post)}
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

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onUploaded={() => { setShowUpload(false); loadPosts(); }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {sharePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSharePost(null)}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Share This Post</h3>
                <button onClick={() => setSharePost(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 italic">
                {sharePost.title || sharePost.content?.slice(0, 100) || 'Grace Book Post'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl(sharePost)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl bg-blue-600 text-white font-medium hover:scale-105 transition-transform">
                  <Facebook className="h-5 w-5" /> Facebook
                </a>
                <a href={`https://twitter.com/intent/tweet?text=${shareText(sharePost)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl bg-sky-500 text-white font-medium hover:scale-105 transition-transform">
                  <Twitter className="h-5 w-5" /> Twitter
                </a>
                <a href={`https://wa.me/?text=${shareText(sharePost)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl bg-green-500 text-white font-medium hover:scale-105 transition-transform">
                  <MessageCircle className="h-5 w-5" /> WhatsApp
                </a>
                <a href={`mailto:?subject=Check out this post&body=${shareText(sharePost)}`} className="flex items-center gap-2 p-3 rounded-xl bg-slate-600 text-white font-medium hover:scale-105 transition-transform">
                  <Mail className="h-5 w-5" /> Email
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadModal({ onClose, onUploaded, showToast }: {
  onClose: () => void;
  onUploaded: () => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const { user } = useAuth();
  const [type, setType] = useState<PostType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const resourceType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'video' : 'raw';
      const url = await uploadToCloudinary(file, resourceType as 'image' | 'raw' | 'video');
      setMediaUrl(url);
      setFileName(file.name);
      setFileSize(file.size);
      showToast('File uploaded successfully', 'success');
    } catch {
      showToast('Upload failed. Please try again.', 'error');
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (type === 'text' && !content.trim()) {
      showToast('Please add some text content', 'warning');
      return;
    }
    if ((type === 'image' || type === 'pdf' || type === 'audio') && !mediaUrl) {
      showToast('Please upload a file', 'warning');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('posts').insert({
      user_id: user!.id,
      type,
      title: title.trim() || null,
      content: type === 'text' ? content.trim() : null,
      media_url: mediaUrl || null,
      file_name: fileName || null,
      file_size: fileSize,
    });
    setSaving(false);
    if (error) {
      showToast('Could not create post', 'error');
      return;
    }
    showToast('Post created!', 'success');
    onUploaded();
  };

  const typeButtons: { type: PostType; label: string; icon: typeof Type }[] = [
    { type: 'text', label: 'Text', icon: Type },
    { type: 'image', label: 'Image', icon: ImageIcon },
    { type: 'pdf', label: 'PDF', icon: FileText },
    { type: 'audio', label: 'Audio', icon: Headphones },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Create New Post</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Post Type</label>
            <div className="grid grid-cols-4 gap-2">
              {typeButtons.map((tb) => {
                const Icon = tb.icon;
                return (
                  <button
                    key={tb.type}
                    onClick={() => { setType(tb.type); setMediaUrl(''); setFileName(''); setFileSize(null); }}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all ${
                      type === tb.type
                        ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg'
                        : 'glass hover:scale-105 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" /> {tb.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title (optional for all) */}
          <div>
            <label className="text-sm font-medium mb-1 block">Title (optional)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a title..."
              className="input-field"
            />
          </div>

          {/* Text content for text posts */}
          {type === 'text' && (
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts..."
                className="input-field min-h-[120px] resize-y"
              />
            </div>
          )}

          {/* File upload for image/pdf/audio */}
          {type !== 'text' && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                {type === 'image' ? 'Image' : type === 'pdf' ? 'PDF Document' : 'Audio File'}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  type === 'image' ? 'image/*' :
                  type === 'pdf' ? 'application/pdf' :
                  'audio/*'
                }
                onChange={handleFile}
                className="input-field"
                disabled={uploading}
              />
              {uploading && (
                <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                  <Loader className="h-3 w-3 animate-spin" /> Uploading...
                </p>
              )}
              {mediaUrl && !uploading && (
                <p className="text-xs text-emerald-500 mt-2">{fileName} uploaded successfully</p>
              )}
              {type === 'image' && mediaUrl && (
                <img src={mediaUrl} alt="Preview" className="mt-2 rounded-xl max-h-40 object-cover" />
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving || uploading}
              className="btn-primary flex-1"
            >
              {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Posting...' : 'Post'}
            </button>
            <button onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
