import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, uploadToCloudinary } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Blog, BlogComment, Profile } from '@/types';
import { Newspaper, Heart, Share2, Upload, X, MessageCircle, Send, Play, Image as ImageIcon, Video } from 'lucide-react';
import { SkeletonCard, EmptyState } from '@/components/ui';

const categories = ['All', 'Devotional', 'Theology', 'Testimony', 'News', 'General'];

export default function Blog() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentProfiles, setCommentProfiles] = useState<Record<string, Profile>>({});
  const [newComment, setNewComment] = useState('');
  const [likedBlogs, setLikedBlogs] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'General', image_url: '', video_url: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
      if (error) {
        showToast('Could not load blogs', 'error');
        setLoading(false);
        return;
      }
      const blogData = (data as Blog[]) ?? [];
      setBlogs(blogData);
      const userIds = [...new Set(blogData.map((b) => b.user_id))];
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

  const filtered = category === 'All' ? blogs : blogs.filter((b) => b.category === category);

  const openBlog = async (blog: Blog) => {
    setSelectedBlog(blog);
    const { data } = await supabase.from('blog_comments').select('*').eq('blog_id', blog.id).order('created_at', { ascending: true });
    setComments((data as BlogComment[]) ?? []);
    if (data) {
      const ids = [...new Set((data as BlogComment[]).map((c) => c.user_id))];
      if (ids.length > 0) {
        const { data: profData } = await supabase.from('profiles').select('*').in('id', ids);
        if (profData) {
          const map: Record<string, Profile> = {};
          (profData as Profile[]).forEach((p) => { map[p.id] = p; });
          setCommentProfiles(map);
        }
      }
    }
  };

  const submitComment = async () => {
    if (!user || !selectedBlog || !newComment.trim()) return;
    const { data, error } = await supabase.from('blog_comments').insert({
      blog_id: selectedBlog.id,
      content: newComment.trim(),
    }).select().single();
    if (error) {
      showToast('Could not post comment', 'error');
      return;
    }
    setComments((prev) => [...prev, data as BlogComment]);
    setNewComment('');
    showToast('Comment posted!', 'success');
  };

  const handleLike = async (blog: Blog) => {
    if (!user) {
      showToast('Sign in to like', 'info');
      return;
    }
    if (likedBlogs.has(blog.id)) return;
    await supabase.from('blogs').update({ likes_count: blog.likes_count + 1 }).eq('id', blog.id);
    setLikedBlogs((prev) => new Set(prev).add(blog.id));
    setBlogs((prev) => prev.map((b) => b.id === blog.id ? { ...b, likes_count: b.likes_count + 1 } : b));
    if (selectedBlog?.id === blog.id) setSelectedBlog({ ...blog, likes_count: blog.likes_count + 1 });
  };

  const handleShare = async (blog: Blog) => {
    const text = `Check out: ${blog.title}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      showToast('Copied!', 'success');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'image');
      setForm((prev) => ({ ...prev, image_url: url }));
      showToast('Image uploaded', 'success');
    } catch {
      showToast('Upload failed', 'error');
    }
    setUploading(false);
  };

  const submitBlog = async () => {
    if (!user) {
      showToast('Sign in to create a blog', 'info');
      return;
    }
    if (!form.title.trim() || !form.content.trim()) {
      showToast('Title and content required', 'error');
      return;
    }
    const { data, error } = await supabase.from('blogs').insert({
      title: form.title.trim(),
      content: form.content.trim(),
      image_url: form.image_url || null,
      video_url: form.video_url || null,
      category: form.category,
    }).select().single();
    if (error) {
      showToast('Could not create blog', 'error');
      return;
    }
    setBlogs((prev) => [data as Blog, ...prev]);
    setForm({ title: '', content: '', category: 'General', image_url: '', video_url: '' });
    setShowCreate(false);
    showToast('Blog published!', 'success');
  };

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 to-slate-900 dark:from-slate-950 dark:to-primary-950 py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-20 w-72 h-72 bg-gold-500 rounded-full blur-3xl animate-float" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <Newspaper className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-white/90 font-medium">Blog & Articles</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Christian Blog</h1>
          <p className="text-white/80 max-w-2xl mx-auto">Read and share inspiring articles, devotionals, and testimonies.</p>
          {user && (
            <button onClick={() => setShowCreate(true)} className="btn-gold mt-6">
              <Upload className="h-4 w-4" /> Write Article
            </button>
          )}
        </div>
      </section>

      <section className="section-padding">
        <div className="container-narrow">
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${category === cat ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg' : 'glass text-slate-600 dark:text-slate-300 hover:scale-105'}`}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Newspaper className="h-8 w-8 text-primary-500" />} title="No Articles Yet" description="Be the first to write!" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((blog, i) => {
                const author = profiles[blog.user_id];
                return (
                  <motion.div key={blog.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.06, 0.5) }}
                    className="glass-card overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => openBlog(blog)}>
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary-100 to-gold-100 dark:from-slate-800 dark:to-slate-700">
                      {blog.image_url ? (
                        <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : blog.video_url ? (
                        <div className="flex items-center justify-center h-full"><Play className="h-16 w-16 text-primary-300" /></div>
                      ) : (
                        <div className="flex items-center justify-center h-full"><Newspaper className="h-16 w-16 text-primary-300" /></div>
                      )}
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-semibold">{blog.category}</span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold mb-1 line-clamp-2">{blog.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{blog.content}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{author?.username ?? 'Unknown'}</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {blog.likes_count}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /></span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Blog detail modal */}
      <AnimatePresence>
        {selectedBlog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBlog(null)}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
              <div className="relative">
                {selectedBlog.image_url && <img src={selectedBlog.image_url} alt={selectedBlog.title} className="w-full h-64 object-cover" />}
                {selectedBlog.video_url && (
                  <div className="aspect-video bg-black"><iframe src={selectedBlog.video_url} title={selectedBlog.title} className="w-full h-full" allowFullScreen /></div>
                )}
                <button onClick={() => setSelectedBlog(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-black/40 backdrop-blur-md text-white hover:bg-black/60"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 mb-3 inline-block">{selectedBlog.category}</span>
                <h2 className="text-2xl font-bold mb-2">{selectedBlog.title}</h2>
                <p className="text-sm text-slate-500 mb-4">{new Date(selectedBlog.created_at).toLocaleDateString()}</p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap mb-6">{selectedBlog.content}</p>
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => handleLike(selectedBlog)} className="flex items-center gap-1.5 text-sm hover:text-rose-500 transition-colors">
                    <Heart className={`h-5 w-5 ${likedBlogs.has(selectedBlog.id) ? 'fill-rose-500 text-rose-500' : ''}`} /> {selectedBlog.likes_count}
                  </button>
                  <button onClick={() => handleShare(selectedBlog)} className="flex items-center gap-1.5 text-sm hover:text-primary-500 transition-colors">
                    <Share2 className="h-5 w-5" /> Share
                  </button>
                </div>
                {/* Comments */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Comments ({comments.length})</h3>
                  <div className="space-y-2 mb-4">
                    {comments.map((c) => {
                      const cp = commentProfiles[c.user_id];
                      return (
                        <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                              {cp?.avatar_url ? <img src={cp.avatar_url} alt="" className="w-full h-full object-cover" /> : cp?.username?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <span className="text-xs font-semibold">{cp?.username ?? 'Unknown'}</span>
                            <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{c.content}</p>
                        </div>
                      );
                    })}
                    {comments.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No comments yet</p>}
                  </div>
                  {user && (
                    <div className="flex gap-2">
                      <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
                        placeholder="Write a comment..." className="input-field flex-1" />
                      <button onClick={submitComment} className="btn-primary"><Send className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create blog modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Write Article</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Article title" className="input-field" />
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your article..." className="input-field min-h-[150px]" />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                  {['Devotional', 'Theology', 'Testimony', 'News', 'General'].map((c) => <option key={c}>{c}</option>)}
                </select>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="input-field" />
                {uploading && <p className="text-xs text-amber-500">Uploading...</p>}
                {form.image_url && <img src={form.image_url} alt="" className="w-full h-32 object-cover rounded-lg" />}
                <input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="Video embed URL (optional)" className="input-field" />
                <button onClick={submitBlog} disabled={uploading || !form.title.trim() || !form.content.trim()} className="btn-primary w-full">Publish Article</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
