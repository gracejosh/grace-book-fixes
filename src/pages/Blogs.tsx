import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Heart, Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Blog, Profile, ChatRoom } from '@/types';
import { EmptyState } from '@/components/ui';

export default function Blogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const openAuthorProfile = (authorId?: string) => {
    if (authorId) navigate(`/profile?user=${encodeURIComponent(authorId)}`);
  };

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

  const startDirectChat = async (authorId: string) => {
    if (!user) { showToast('Please sign in to send messages', 'warning'); return; }
    if (authorId === user.id) { showToast('You cannot message yourself', 'warning'); return; }
    setMessagingId(authorId);
    try {
      const { data: privateRooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'private')
        .eq('is_active', true)
        .contains('participants', [user.id, authorId]);
      if (roomsError) throw roomsError;

      const existingRoom = ((privateRooms as ChatRoom[] | null) ?? []).find((room) => {
        const participants = room.participants || [];
        return participants.length === 2 && participants.includes(user.id) && participants.includes(authorId);
      });

      let directRoom: ChatRoom | null = existingRoom || null;
      if (!directRoom) {
        const author = authors[authorId];
        const { data: createdRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert({
            name: 'Chat with ' + (author?.username || 'user'),
            type: 'private',
            created_by: user.id,
            participants: [user.id, authorId],
            is_active: true,
          })
          .select()
          .single();
        if (createError) throw createError;
        directRoom = createdRoom as ChatRoom;
      }

      navigate(`/chat?room=${directRoom.id}`);
    } catch {
      showToast('Could not start direct chat', 'error');
    } finally {
      setMessagingId(null);
    }
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
                      <img onClick={() => openAuthorProfile(author?.id)} src={author.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div onClick={() => openAuthorProfile(author?.id)} className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold">
                        {author?.username?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                    <span onClick={() => openAuthorProfile(author?.id)} className="text-xs font-medium">{author?.username ?? 'Unknown'}</span>
                    <span className="text-xs text-slate-400">{new Date(b.created_at).toLocaleDateString()}</span>
                    {author && author.id !== user?.id && (
                      <button
                        onClick={() => startDirectChat(author.id)}
                        disabled={messagingId === author.id}
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {messagingId === author.id ? 'Opening...' : 'Message'}
                      </button>
                    )}
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
      )}
    </div>
  );
}
