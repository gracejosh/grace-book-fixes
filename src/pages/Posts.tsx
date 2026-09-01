import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, uploadToCloudinary } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Post, Profile } from '@/types';
import { FileText, Heart, Share2, Download, Upload, X, Image as ImageIcon, Music, Type } from 'lucide-react';
import { SkeletonCard, EmptyState } from '@/components/ui';

export default function Posts() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ type: 'text' as Post['type'], content: '' });
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error) {
        showToast('Could not load posts', 'error');
        setLoading(false);
        return;
      }
      const postData = (data as Post[]) ?? [];
      setPosts(postData);
      const userIds = [...new Set(postData.map((p) => p.user_id))];
      if (userIds.length > 0) {
        const { data: profData } = await supabase.from('profiles').select('*').in('id', userIds);
        if (profData) {
          const map: Record<string, Profile> = {};
          (profData as Profile[]).forEach((p) => { map[p.id] = p; });
          setProfiles(map);
        }
      }
      setLoading(false);
    })();
  }, [showToast]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const resourceType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'video' : 'raw';
      const url = await uploadToCloudinary(file, resourceType);
      setFileUrl(url);
      if (file.type.startsWith('image/')) setForm((prev) => ({ ...prev, type: 'image' }));
      else if (file.type.startsWith('audio/')) setForm((prev) => ({ ...prev, type: 'audio' }));
      else setForm((prev) => ({ ...prev, type: 'pdf' }));
      showToast('File uploaded', 'success');
    } catch {
      showToast('Upload failed', 'error');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitPost = async () => {
    if (!user) {
      showToast('Sign in to post', 'info');
      return;
    }
    if (!form.content.trim()) {
      showToast('Content required', 'error');
      return;
    }
    const { data, error } = await supabase.from('posts').insert({
      type: form.type,
      content: form.content.trim(),
      file_url: fileUrl,
    }).select().single();
    if (error) {
      showToast('Could not create post', 'error');
      return;
    }
    setPosts((prev) => [data as Post, ...prev]);
    setForm({ type: 'text', content: '' });
    setFileUrl(null);
    setShowUpload(false);
    showToast('Post created!', 'success');
  };

  const handleLike = async (post: Post) => {
    if (!user) {
      showToast('Sign in to like', 'info');
      return;
    }
    if (likedPosts.has(post.id)) return;
    await supabase.from('posts').update({ likes_count: post.likes_count + 1 }).eq('id', post.id);
    setLikedPosts((prev) => new Set(prev).add(post.id));
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likes_count: p.likes_count + 1 } : p));
  };

  const handleShare = async (post: Post) => {
    const text = post.content.slice(0, 100);
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      showToast('Copied!', 'success');
    }
  };

  const typeIcons: Record<string, typeof Type> = { text: Type, image: ImageIcon, pdf: FileText, audio: Music };

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 to-slate-900 dark:from-slate-950 dark:to-primary-950 py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-72 h-72 bg-accent-500 rounded-full blur-3xl animate-float" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <FileText className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-white/90 font-medium">Community Posts</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Posts & Shares</h1>
          <p className="text-white/80 max-w-2xl mx-auto">Share text, images, PDFs, and audio with the community.</p>
          {user && (
            <button onClick={() => setShowUpload(true)} className="btn-gold mt-6">
              <Upload className="h-4 w-4" /> Create Post
            </button>
          )}
        </div>
      </section>

      <section className="section-padding">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState icon={<FileText className="h-8 w-8 text-primary-500" />} title="No Posts Yet" description="Be the first to share something!" />
          ) : (
            <div className="space-y-4">
              {posts.map((post, i) => {
                const author = profiles[post.user_id];
                const Icon = typeIcons[post.type] ?? Type;
                return (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }} className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center overflow-hidden">
                        {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-sm">{author?.username?.charAt(0).toUpperCase() ?? '?'}</span>}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{author?.username ?? 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="ml-auto flex items-center gap-1 text-xs text-slate-400"><Icon className="h-3.5 w-3.5" /> {post.type}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-wrap">{post.content}</p>
                    {post.file_url && post.type === 'image' && (
                      <img src={post.file_url} alt="" className="w-full rounded-xl mb-3 max-h-96 object-cover" />
                    )}
                    {post.file_url && post.type === 'audio' && (
                      <audio controls className="w-full mb-3"><source src={post.file_url} /></audio>
                    )}
                    {post.file_url && post.type === 'pdf' && (
                      <a href={post.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all mb-3">
                        <FileText className="h-5 w-5 text-primary-500" /><span className="text-sm font-medium">View PDF</span><Download className="h-4 w-4 ml-auto" />
                      </a>
                    )}
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleLike(post)} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-colors">
                        <Heart className={`h-4 w-4 ${likedPosts.has(post.id) ? 'fill-rose-500 text-rose-500' : ''}`} /> {post.likes_count}
                      </button>
                      <button onClick={() => handleShare(post)} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-primary-500 transition-colors">
                        <Share2 className="h-4 w-4" /> Share
                      </button>
                      {post.file_url && (
                        <a href={post.file_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-primary-500 transition-colors">
                          <Download className="h-4 w-4" /> Download
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUpload(false)}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 max-w-lg w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Create Post</h2>
                <button onClick={() => setShowUpload(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write something..." className="input-field min-h-[100px]" />
                <input ref={fileInputRef} type="file" accept="image/*,audio/*,.pdf" onChange={handleFileUpload} className="input-field" />
                {uploading && <p className="text-xs text-amber-500">Uploading...</p>}
                {fileUrl && <p className="text-xs text-emerald-500">File attached ✓</p>}
                <button onClick={submitPost} disabled={uploading || !form.content.trim()} className="btn-primary w-full">Publish Post</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
