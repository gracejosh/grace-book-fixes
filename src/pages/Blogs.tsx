import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Heart, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Blog, Profile } from '@/types';
import { EmptyState } from '@/components/ui';
import { ExpandableText } from '@/components/ExpandableText';

export default function Blogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const { showToast } = useToast();

  const load = async () => {
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
  };

  useEffect(() => { load(); }, []);

  const toggleLike = async (blog: Blog) => {
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
  };

  const filtered = blogs.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (b.title?.toLowerCase().includes(q)) || (b.content?.toLowerCase().includes(q));
  });

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="h-6 w-6 text-primary-600" />
        <h1 className="text-2xl font-bold">Blog</h1>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search blog posts..."
          className="input-field pl-10"
        />
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Newspaper className="h-8 w-8 text-primary-500" />} title="No Blog Posts" description="No blog posts have been published yet." />
      ) : (
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
                {b.image_url && (
                  <img src={b.image_url} alt={b.title ?? ''} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {author?.avatar_url ? (
                      <img src={author.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold">
                        {author?.username?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                    <span className="text-xs font-medium">{author?.username ?? 'Unknown'}</span>
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
                  <ExpandableText text={b.content ?? ''} maxLines={3} className="mb-2" />
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
      )}
    </div>
  );
}
