import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { UploadButton } from '@/components/UploadButton';
import type { Book, Course, Quiz as QuizType, Profile, PrayerRequest, ContactMessage, NewsletterSubscriber, Post, Ad, Message, ChatRoom, Flyer, Blog } from '@/types';
import {
  Lock, LayoutDashboard, Library, GraduationCap, BrainCircuit, Users, Mail,
  Plus, Edit2, Trash2, X, Download, TrendingUp, Award, MessageSquare, Heart, FileText,
  Megaphone, Image as ImageIcon, Ban, VolumeX, Volume2, Trash, BarChart3, LayoutGrid,
  Link2, Search, Eye, CheckCircle, XCircle, Newspaper,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';

const ADMIN_PASSWORD = 'grace2024';
type Tab = 'dashboard' | 'books' | 'courses' | 'quizzes' | 'posts' | 'users' | 'chat' | 'ads' | 'messages' | 'flyers' | 'blogs';

export default function Admin() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      showToast('Welcome, Admin!', 'success');
    } else {
      showToast('Wrong password', 'error');
    }
  };

  if (!authed) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="glass-card p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-gold-500 mb-4 shadow-lg">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Admin Access</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Enter the admin password to continue</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="Admin password" autoFocus />
              <button type="submit" className="btn-primary w-full">Access Dashboard</button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'books', label: 'Books', icon: Library },
    { id: 'courses', label: 'Courses', icon: GraduationCap },
    { id: 'quizzes', label: 'Quizzes', icon: BrainCircuit },
    { id: 'posts', label: 'Posts', icon: LayoutGrid },
    { id: 'flyers', label: 'Flyers', icon: ImageIcon },
    { id: 'blogs', label: 'Blogs', icon: Newspaper },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'chat', label: 'Chat Control', icon: MessageSquare },
    { id: 'ads', label: 'Ads', icon: Megaphone },
    { id: 'messages', label: 'Messages', icon: Mail },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-gold-500 flex items-center justify-center">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-slate-500">Manage all content, users, and ads</p>
          </div>
          {profile?.is_admin && <span className="ml-auto px-3 py-1 rounded-lg bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 text-sm font-semibold">Verified Admin</span>}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg' : 'glass hover:scale-105'}`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'books' && <BooksTab showToast={showToast} />}
        {tab === 'courses' && <CoursesTab showToast={showToast} />}
        {tab === 'quizzes' && <QuizzesTab showToast={showToast} />}
        {tab === 'posts' && <PostsTab showToast={showToast} />}
        {tab === 'flyers' && <FlyersTab showToast={showToast} />}
        {tab === 'blogs' && <BlogsTab showToast={showToast} />}
        {tab === 'users' && <UsersTab showToast={showToast} />}
        {tab === 'chat' && <ChatControlTab showToast={showToast} />}
        {tab === 'ads' && <AdsTab showToast={showToast} />}
        {tab === 'messages' && <MessagesTab />}
      </div>
    </div>
  );
}

/* ==================== Dashboard ==================== */

function DashboardTab() {
  const [stats, setStats] = useState({ users: 0, books: 0, downloads: 0, quizzes: 0, messages: 0, courses: 0, posts: 0, postDownloads: 0, flyers: 0, blogs: 0 });
  const [recent, setRecent] = useState<{ id: string; score: number; category: string; created_at: string }[]>([]);
  const [liveUsers, setLiveUsers] = useState(0);

  useEffect(() => {
    (async () => {
      const [u, b, dl, q, m, c, p, pd, fl, bl] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('book_downloads').select('id', { count: 'exact', head: true }),
        supabase.from('quiz_results').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('post_downloads').select('id', { count: 'exact', head: true }),
        supabase.from('flyers').select('id', { count: 'exact', head: true }),
        supabase.from('blogs').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        users: u.count ?? 0, books: b.count ?? 0, downloads: dl.count ?? 0,
        quizzes: q.count ?? 0, messages: m.count ?? 0,
        courses: c.count ?? 0, posts: p.count ?? 0, postDownloads: pd.count ?? 0,
        flyers: fl.count ?? 0, blogs: bl.count ?? 0,
      });
      const { data } = await supabase.from('quiz_results').select('id, score, category, created_at').order('created_at', { ascending: false }).limit(5);
      setRecent((data as { id: string; score: number; category: string; created_at: string }[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    const fetchLive = async () => {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      setLiveUsers(count ?? 0);
    };
    fetchLive();
    const interval = setInterval(fetchLive, 10000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    { label: 'Total Users', value: liveUsers || stats.users, icon: Users, color: 'from-primary-500 to-primary-700', live: true },
    { label: 'Books Downloaded', value: stats.downloads, icon: Download, color: 'from-gold-400 to-gold-600' },
    { label: 'Quiz Attempts', value: stats.quizzes, icon: Award, color: 'from-rose-500 to-rose-700' },
    { label: 'Messages Sent', value: stats.messages, icon: MessageSquare, color: 'from-accent-500 to-accent-700' },
    { label: 'Courses', value: stats.courses, icon: GraduationCap, color: 'from-violet-500 to-violet-700' },
    { label: 'Community Posts', value: stats.posts, icon: LayoutGrid, color: 'from-teal-500 to-teal-700' },
    { label: 'Flyers', value: stats.flyers, icon: ImageIcon, color: 'from-cyan-500 to-cyan-700' },
    { label: 'Blogs', value: stats.blogs, icon: Newspaper, color: 'from-indigo-500 to-indigo-700' },
    { label: 'Post Downloads', value: stats.postDownloads, icon: Download, color: 'from-orange-500 to-orange-700' },
  ];

  const exportCSV = () => {
    const csv = ['Label,Value', ...cards.map((c) => `${c.label},${c.value}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'grace-book-stats.csv'; a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary-600" /> Analytics Overview
        </h2>
        <button onClick={exportCSV} className="btn-ghost py-2"><Download className="h-4 w-4" /> Export CSV</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass-card p-5">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} mb-3`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">{card.value.toLocaleString()}</p>
                {card.live && (
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> live
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary-600" /> Recent Quiz Activity</h3>
        {recent.length === 0 ? (
          <p className="text-center text-slate-500 py-4">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-semibold text-sm">{r.category}</p>
                  <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <span className="font-bold text-lg text-primary-600">{r.score} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== Shared Helpers ==================== */

function CrudHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <button onClick={onAdd} className="btn-primary py-2"><Plus className="h-4 w-4" /> Add New</button>
    </div>
  );
}

function FormModal({ show, onClose, title, onSave, children }: {
  show: boolean; onClose: () => void; title: string; onSave: () => void; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{title}</h3>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">{children}</div>
            <div className="flex gap-2 mt-4">
              <button onClick={onSave} className="btn-primary flex-1">Save</button>
              <button onClick={onClose} className="btn-ghost">Cancel</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ==================== Books Tab ==================== */

function BooksTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState({ title: '', author: '', description: '', cloudinary_url: '', cover_url: '', category: 'General', file_format: 'PDF' });

  const load = async () => {
    const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    setItems((data as Book[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing) {
      await supabase.from('books').update(form).eq('id', editing.id);
    } else {
      await supabase.from('books').insert(form);
    }
    showToast(editing ? 'Book updated' : 'Book added', 'success');
    setShowForm(false); setEditing(null);
    setForm({ title: '', author: '', description: '', cloudinary_url: '', cover_url: '', category: 'General', file_format: 'PDF' });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this book?')) return;
    await supabase.from('books').delete().eq('id', id);
    showToast('Book deleted', 'info');
    load();
  };

  return (
    <div>
      <CrudHeader title="Books" onAdd={() => { setEditing(null); setForm({ title: '', author: '', description: '', cloudinary_url: '', cover_url: '', category: 'General', file_format: 'PDF' }); setShowForm(true); }} />
      {loading ? <div className="skeleton h-64 rounded-xl" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((b) => (
            <div key={b.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm">{b.title}</h3>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(b); setForm({ title: b.title, author: b.author, description: b.description ?? '', cloudinary_url: b.cloudinary_url, cover_url: b.cover_url ?? '', category: b.category, file_format: b.file_format }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5 text-slate-400" /></button>
                  <button onClick={() => del(b.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                </div>
              </div>
              {b.cover_url && <img src={b.cover_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />}
              <p className="text-xs text-slate-500">by {b.author} · {b.category} · {b.file_format}</p>
            </div>
          ))}
        </div>
      )}
      <FormModal show={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Book' : 'Add Book'} onSave={save}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input-field" />
        <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author" className="input-field" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="input-field min-h-[60px]" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
          {['Theology', 'Classic', 'Spiritual Growth', 'Devotional', 'Apologetics', 'General'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={form.file_format} onChange={(e) => setForm({ ...form, file_format: e.target.value })} className="input-field">
          {['PDF', 'EPUB', 'MOBI', 'AZW'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="text-sm font-medium">Cover Image</label>
        <UploadButton
          label="Upload Cover Image"
          accept="image/*"
          resourceType="image"
          currentUrl={form.cover_url}
          onUploaded={(url) => setForm((prev) => ({ ...prev, cover_url: url }))}
        />
        {form.cover_url && <img src={form.cover_url} alt="Cover preview" className="rounded-xl max-h-32 object-cover" />}
        <label className="text-sm font-medium">Book File (PDF / EPUB)</label>
        <UploadButton
          label="Upload Book File"
          accept=".pdf,.epub"
          resourceType="raw"
          currentUrl={form.cloudinary_url}
          onUploaded={(url) => setForm((prev) => ({ ...prev, cloudinary_url: url }))}
        />
      </FormModal>
    </div>
  );
}

/* ==================== Courses Tab ==================== */

function CoursesTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: '', description: '', youtube_video_id: '', thumbnail_url: '', duration: '', instructor: '', category: 'Bible Study' });

  const load = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setItems((data as Course[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing) {
      await supabase.from('courses').update(form).eq('id', editing.id);
    } else {
      await supabase.from('courses').insert(form);
    }
    showToast(editing ? 'Course updated' : 'Course added', 'success');
    setShowForm(false); setEditing(null);
    setForm({ title: '', description: '', youtube_video_id: '', thumbnail_url: '', duration: '', instructor: '', category: 'Bible Study' });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    await supabase.from('courses').delete().eq('id', id);
    showToast('Course deleted', 'info');
    load();
  };

  return (
    <div>
      <CrudHeader title="Courses" onAdd={() => { setEditing(null); setForm({ title: '', description: '', youtube_video_id: '', thumbnail_url: '', duration: '', instructor: '', category: 'Bible Study' }); setShowForm(true); }} />
      {loading ? <div className="skeleton h-64 rounded-xl" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm">{c.title}</h3>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(c); setForm({ title: c.title, description: c.description ?? '', youtube_video_id: c.youtube_video_id, thumbnail_url: c.thumbnail_url ?? '', duration: c.duration ?? '', instructor: c.instructor ?? '', category: c.category }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5 text-slate-400" /></button>
                  <button onClick={() => del(c.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                </div>
              </div>
              <p className="text-xs text-slate-500">{c.category} · {c.duration}</p>
            </div>
          ))}
        </div>
      )}
      <FormModal show={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Course' : 'Add Course'} onSave={save}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input-field" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="input-field min-h-[60px]" />
        <input value={form.youtube_video_id} onChange={(e) => setForm({ ...form, youtube_video_id: e.target.value })} placeholder="YouTube Video ID" className="input-field" />
        <input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="Thumbnail URL" className="input-field" />
        <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="Duration (e.g. 30 min)" className="input-field" />
        <input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} placeholder="Instructor name" className="input-field" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
          {['Bible Study', 'Prayer', 'Worship', 'Leadership', 'Apologetics', 'Devotional'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </FormModal>
    </div>
  );
}

/* ==================== Quizzes Tab ==================== */

function QuizzesTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<QuizType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuizType | null>(null);
  const [form, setForm] = useState({ question: '', options: ['', '', '', ''], correct_answer: 0, category: 'Bible', difficulty: 'Easy' });

  const load = async () => {
    const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    setItems((data as QuizType[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = {
      question: form.question.trim(),
      options: form.options.filter((o) => o.trim()),
      correct_answer: Number(form.correct_answer),
      category: form.category,
      difficulty: form.difficulty,
    };
    if (editing) {
      const { error } = await supabase.from('quizzes').update(payload).eq('id', editing.id);
      if (error) { showToast('Could not update question: ' + error.message, 'error'); return; }
    } else {
      const { error } = await supabase.from('quizzes').insert(payload);
      if (error) { showToast('Could not save question: ' + error.message, 'error'); return; }
    }
    showToast(editing ? 'Question updated' : 'Question added', 'success');
    setShowForm(false); setEditing(null);
    setForm({ question: '', options: ['', '', '', ''], correct_answer: 0, category: 'Bible', difficulty: 'Easy' });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    await supabase.from('quizzes').delete().eq('id', id);
    showToast('Question deleted', 'info');
    load();
  };

  return (
    <div>
      <CrudHeader title="Quiz Questions" onAdd={() => { setEditing(null); setForm({ question: '', options: ['', '', '', ''], correct_answer: 0, category: 'Bible', difficulty: 'Easy' }); setShowForm(true); }} />
      {loading ? <div className="skeleton h-64 rounded-xl" /> : (
        <div className="space-y-2">
          {items.map((q) => (
            <div key={q.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{q.question}</p>
                  <p className="text-xs text-slate-500 mt-1">{q.category} · {q.difficulty} · Answer: {q.options[q.correct_answer]}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(q); setForm({ question: q.question, options: [...q.options, '', '', '', ''].slice(0, 4), correct_answer: q.correct_answer, category: q.category, difficulty: q.difficulty }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5 text-slate-400" /></button>
                  <button onClick={() => del(q.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <FormModal show={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Question' : 'Add Question'} onSave={save}>
        <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Question" className="input-field min-h-[60px]" />
        {form.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" checked={form.correct_answer === i} onChange={() => setForm({ ...form, correct_answer: i })} className="w-4 h-4" />
            <input value={opt} onChange={(e) => { const next = [...form.options]; next[i] = e.target.value; setForm({ ...form, options: next }); }} placeholder={`Option ${i + 1}`} className="input-field" />
          </div>
        ))}
        <p className="text-xs text-slate-500">Select the radio button next to the correct answer.</p>
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
          {['Bible', 'General Knowledge', 'Science', 'History', 'Geography'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="input-field">
          {['Easy', 'Medium', 'Hard'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </FormModal>
    </div>
  );
}

/* ==================== Posts Management Tab ==================== */

function PostsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Post | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'text' as Post['type'], media_url: '', file_name: '', file_size: 0 });

  const load = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    setItems((data as Post[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) { showToast('Could not delete post', 'error'); return; }
    showToast('Post deleted', 'info');
    load();
  };

  const edit = (p: Post) => {
    setEditing(p);
    setForm({ title: p.title ?? '', content: p.content ?? '', type: p.type, media_url: p.media_url ?? '', file_name: p.file_name ?? '', file_size: p.file_size ?? 0 });
    setShowForm(true);
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from('posts').update({ title: form.title, content: form.content, type: form.type, media_url: form.media_url || null, file_name: form.file_name || null, file_size: form.file_size || null }).eq('id', editing.id);
    if (error) { showToast('Could not update post', 'error'); return; }
    showToast('Post updated', 'success');
    setShowForm(false); setEditing(null);
    load();
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300';
      case 'image': return 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300';
      case 'pdf': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300';
      case 'audio': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-600';
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Community Posts ({items.length})</h2>
      {loading ? <div className="skeleton h-64 rounded-xl" /> : items.length === 0 ? (
        <EmptyState icon={<LayoutGrid className="h-8 w-8 text-primary-500" />} title="No Posts" description="No community posts have been created yet." />
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="glass-card p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${typeColor(p.type)}`}>{p.type.toUpperCase()}</span>
                  {p.title && <span className="font-semibold text-sm truncate">{p.title}</span>}
                </div>
                {p.content && <p className="text-xs text-slate-500 truncate">{p.content}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span>{p.likes_count} likes</span>
                  <span>{p.downloads_count} downloads</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => edit(p)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Edit">
                  <Edit2 className="h-4 w-4 text-slate-400" />
                </button>
                <button onClick={() => del(p.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Delete">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <FormModal show={showForm} onClose={() => setShowForm(false)} title="Edit Post" onSave={save}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input-field" />
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Content" className="input-field min-h-[120px]" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Post['type'], media_url: '', file_name: '', file_size: 0 })} className="input-field">
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="pdf">PDF</option>
          <option value="audio">Audio</option>
        </select>
        {form.type !== 'text' && (
          <>
            <label className="text-sm font-medium">
              Upload {form.type === 'image' ? 'Image' : form.type === 'pdf' ? 'PDF' : 'Audio'}
            </label>
            <UploadButton
              label={`Upload ${form.type.toUpperCase()}`}
              accept={form.type === 'image' ? 'image/*' : form.type === 'pdf' ? '.pdf' : 'audio/*'}
              resourceType={form.type === 'image' ? 'image' : form.type === 'pdf' ? 'raw' : 'raw'}
              currentUrl={form.media_url}
              onUploaded={(url) => setForm((prev) => ({ ...prev, media_url: url }))}
            />
          </>
        )}
      </FormModal>
    </div>
  );
}

/* ==================== Users Tab ==================== */

function UsersTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleAdmin = async (p: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_admin: !p.is_admin }).eq('id', p.id);
    if (error) { showToast('Could not update user', 'error'); return; }
    showToast(`${p.username} ${p.is_admin ? 'removed from' : 'promoted to'} admin`, 'info');
    load();
  };

  const toggleBan = async (p: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_banned: !p.is_banned }).eq('id', p.id);
    if (error) { showToast('Could not update user', 'error'); return; }
    showToast(`${p.username} ${p.is_banned ? 'unbanned' : 'banned'}`, p.is_banned ? 'info' : 'warning');
    load();
  };

  const deleteUser = async (p: Profile) => {
    if (!confirm(`Delete user "${p.username}"? This will remove their profile. Their auth account remains.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', p.id);
    if (error) { showToast('Could not delete user', 'error'); return; }
    showToast('User deleted', 'info');
    load();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary-600" /> Users ({users.length})
      </h2>
      {loading ? <div className="skeleton h-64 rounded-xl" /> : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="glass-card p-4 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{u.username ?? 'Unknown'}</p>
                <p className="text-xs text-slate-500">{u.full_name ?? 'No name'}</p>
                <p className="text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {u.is_admin && <span className="px-2 py-0.5 rounded-lg bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 text-xs font-bold">Admin</span>}
                {u.is_banned && <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold">Banned</span>}
                {u.is_muted && <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold">Muted</span>}
                <button onClick={() => toggleAdmin(u)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                  {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                </button>
                <button onClick={() => toggleBan(u)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${u.is_banned ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'}`}>
                  <Ban className="h-3 w-3 inline mr-1" />{u.is_banned ? 'Unban' : 'Ban'}
                </button>
                <button onClick={() => deleteUser(u)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all">
                  <Trash2 className="h-3 w-3 inline mr-1" />Delete
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-center text-slate-500 py-8">No users registered yet.</p>}
        </div>
      )}
    </div>
  );
}

/* ==================== Chat Control Tab ==================== */

function ChatControlTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});

  const loadRooms = async () => {
    const { data } = await supabase.from('chat_rooms').select('*').order('created_at', { ascending: true });
    setRooms((data as ChatRoom[]) ?? []);
  };
  useEffect(() => { loadRooms(); }, []);

  const loadMessages = useCallback(async (room: ChatRoom) => {
    setSelectedRoom(room);
    setLoadingMessages(true);
    const { data } = await supabase.from('messages').select('*').eq('room_id', room.id).order('created_at', { ascending: false }).limit(50);
    const msgs = (data as Message[]) ?? [];
    setMessages(msgs);
    const senderIds = [...new Set(msgs.map((m) => m.sender_id).filter(Boolean))] as string[];
    if (senderIds.length > 0) {
      const { data: profData } = await supabase.from('profiles').select('*').in('id', senderIds);
      const map: Record<string, Profile> = {};
      (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
      setAuthors(map);
    }
    setLoadingMessages(false);
  }, []);

  const deleteMessage = async (msg: Message) => {
    if (!confirm('Delete this message?')) return;
    const { error } = await supabase.from('messages').delete().eq('id', msg.id);
    if (error) { showToast('Could not delete message', 'error'); return; }
    showToast('Message deleted', 'info');
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
  };

  const toggleMute = async (senderId: string) => {
    const author = authors[senderId];
    if (!author) return;
    const { error } = await supabase.from('profiles').update({ is_muted: !author.is_muted }).eq('id', senderId);
    if (error) { showToast('Could not update user', 'error'); return; }
    showToast(`${author.username} ${author.is_muted ? 'unmuted' : 'muted'}`, author.is_muted ? 'info' : 'warning');
    setAuthors((prev) => ({ ...prev, [senderId]: { ...prev[senderId], is_muted: !prev[senderId].is_muted } }));
  };

  const deleteRoom = async (room: ChatRoom) => {
    if (!confirm(`Delete room "${room.name}" and all its messages?`)) return;
    const { error } = await supabase.from('chat_rooms').delete().eq('id', room.id);
    if (error) { showToast('Could not delete room', 'error'); return; }
    showToast('Room deleted', 'info');
    if (selectedRoom?.id === room.id) { setSelectedRoom(null); setMessages([]); }
    loadRooms();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary-600" /> Chat Control
      </h2>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <h3 className="font-semibold text-sm mb-3">Chat Rooms ({rooms.length})</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-thin">
            {rooms.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <button
                  onClick={() => loadMessages(r)}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedRoom?.id === r.id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-slate-400 ml-2">{r.type}</span>
                </button>
                <button onClick={() => deleteRoom(r)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            ))}
            {rooms.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No rooms</p>}
          </div>
        </div>

        <div className="lg:col-span-2 glass-card p-4">
          {selectedRoom ? (
            <>
              <h3 className="font-semibold text-sm mb-3">{selectedRoom.name} — Recent Messages</h3>
              {loadingMessages ? (
                <div className="skeleton h-40 rounded-xl" />
              ) : messages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No messages in this room</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                  {messages.map((m) => {
                    const author = m.sender_id ? authors[m.sender_id] : null;
                    return (
                      <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{author?.username ?? 'Unknown'}</span>
                            <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString()}</span>
                            {author?.is_muted && <span className="text-xs text-amber-500 font-medium">muted</span>}
                          </div>
                          <div className="flex gap-1">
                            {m.sender_id && (
                              <button onClick={() => toggleMute(m.sender_id!)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600" title={author?.is_muted ? 'Unmute' : 'Mute'}>
                                {author?.is_muted ? <Volume2 className="h-3.5 w-3.5 text-emerald-500" /> : <VolumeX className="h-3.5 w-3.5 text-amber-500" />}
                              </button>
                            )}
                            <button onClick={() => deleteMessage(m)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600" title="Delete message">
                              <Trash className="h-3.5 w-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm">{m.content}</p>
                        {m.attachment_url && <p className="text-xs text-accent-500 mt-1">Attachment: {m.attachment_url}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Select a chat room to view and manage messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== Ads Management Tab ==================== */

function AdsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [form, setForm] = useState({ title: '', image_url: '', link_url: '', interval_minutes: 30, is_active: true });

  const load = async () => {
    const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
    setAds((data as Ad[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title || !form.image_url || !form.link_url) {
      showToast('Please fill all fields', 'warning');
      return;
    }
    if (editing) {
      await supabase.from('ads').update(form).eq('id', editing.id);
    } else {
      await supabase.from('ads').insert(form);
    }
    showToast(editing ? 'Ad updated' : 'Ad created', 'success');
    setShowForm(false); setEditing(null);
    setForm({ title: '', image_url: '', link_url: '', interval_minutes: 30, is_active: true });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this ad?')) return;
    await supabase.from('ads').delete().eq('id', id);
    showToast('Ad deleted', 'info');
    load();
  };

  const toggleActive = async (ad: Ad) => {
    await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    showToast(`Ad ${ad.is_active ? 'disabled' : 'enabled'}`, 'info');
    load();
  };

  return (
    <div>
      <CrudHeader title="Popup Ads" onAdd={() => { setEditing(null); setForm({ title: '', image_url: '', link_url: '', interval_minutes: 30, is_active: true }); setShowForm(true); }} />
      {loading ? <div className="skeleton h-64 rounded-xl" /> : ads.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-8 w-8 text-primary-500" />} title="No Ads" description="Create popup ads to display to your visitors." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <div key={ad.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm">{ad.title}</h3>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(ad)} className={`px-2 py-1 rounded-lg text-xs font-medium ${ad.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                    {ad.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => { setEditing(ad); setForm({ title: ad.title, image_url: ad.image_url, link_url: ad.link_url, interval_minutes: ad.interval_minutes, is_active: ad.is_active }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5 text-slate-400" /></button>
                  <button onClick={() => del(ad.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                </div>
              </div>
              <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover rounded-xl mb-2" />
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Link2 className="h-3 w-3" />
                <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary-500">{ad.link_url}</a>
              </div>
              <p className="text-xs text-slate-400 mt-1">Shows every {ad.interval_minutes} min</p>
            </div>
          ))}
        </div>
      )}
      <FormModal show={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Ad' : 'Create Ad'} onSave={save}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ad title" className="input-field" />
        <label className="text-sm font-medium">Ad Image or Video</label>
        <UploadButton
          label="Upload Image or Video"
          accept="image/*,video/*"
          resourceType="image"
          currentUrl={form.image_url}
          onUploaded={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
        />
        {form.image_url && <img src={form.image_url} alt="Preview" className="rounded-xl max-h-32 object-cover" />}
        <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="Link URL (e.g. https://example.com)" className="input-field" />
        <label className="text-sm font-medium">Display Interval (minutes)</label>
        <input type="number" value={form.interval_minutes} onChange={(e) => setForm({ ...form, interval_minutes: parseInt(e.target.value) || 30 })} min={1} className="input-field" />
        <p className="text-xs text-slate-500">Default: 30 minutes. The ad will reappear after this interval per visitor.</p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
          Active (show to visitors)
        </label>
      </FormModal>
    </div>
  );
}

/* ==================== Messages Tab ==================== */

function MessagesTab() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);

  useEffect(() => {
    (async () => {
      const [p, c, s] = await Promise.all([
        supabase.from('prayer_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }),
      ]);
      setPrayers((p.data as PrayerRequest[]) ?? []);
      setContacts((c.data as ContactMessage[]) ?? []);
      setSubscribers((s.data as NewsletterSubscriber[]) ?? []);
    })();
  }, []);

  const deletePrayer = async (id: string) => {
    await supabase.from('prayer_requests').delete().eq('id', id);
    setPrayers((prev) => prev.filter((p) => p.id !== id));
  };
  const deleteContact = async (id: string) => {
    await supabase.from('contact_messages').delete().eq('id', id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };
  const deleteSubscriber = async (id: string) => {
    await supabase.from('newsletter_subscribers').delete().eq('id', id);
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="glass-card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Heart className="h-4 w-4 text-rose-500" /> Prayer Requests ({prayers.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
          {prayers.map((p) => (
            <div key={p.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 relative group">
              <button onClick={() => deletePrayer(p.id)} className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3 text-red-400" /></button>
              <p className="text-xs font-semibold">{p.name}</p>
              <p className="text-xs text-slate-500">{p.email}</p>
              <p className="text-sm mt-1">{p.request}</p>
            </div>
          ))}
          {prayers.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No prayer requests</p>}
        </div>
      </div>
      <div className="glass-card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Mail className="h-4 w-4 text-accent-500" /> Contact Messages ({contacts.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
          {contacts.map((c) => (
            <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 relative group">
              <button onClick={() => deleteContact(c.id)} className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3 text-red-400" /></button>
              <p className="text-xs font-semibold">{c.name}</p>
              <p className="text-xs text-slate-500">{c.email}</p>
              <p className="text-sm font-medium mt-1">{c.subject ?? 'No subject'}</p>
              <p className="text-xs mt-1">{c.message}</p>
            </div>
          ))}
          {contacts.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No messages</p>}
        </div>
      </div>
      <div className="glass-card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-500" /> Subscribers ({subscribers.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
          {subscribers.map((s) => (
            <div key={s.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between group">
              <div>
                <p className="text-sm font-medium">{s.email}</p>
                <p className="text-xs text-slate-500">{new Date(s.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => deleteSubscriber(s.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3 text-red-400" /></button>
            </div>
          ))}
          {subscribers.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No subscribers</p>}
        </div>
      </div>
    </div>
  );
}

/* ==================== Flyers Management Tab ==================== */

const FLYER_CATEGORIES = [
  'Evangelism', 'Salvation', 'Prayer', 'Youth', 'Women', 'Men',
  'Outreach', 'Events', 'Testimony', 'Other',
];

function FlyersTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<Flyer[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [viewFlyer, setViewFlyer] = useState<Flyer | null>(null);
  const [editing, setEditing] = useState<Flyer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Evangelism', images: [] as string[] });

  const load = async () => {
    const { data } = await supabase.from('flyers').select('*').order('created_at', { ascending: false });
    const fetched = (data as Flyer[]) ?? [];
    setItems(fetched);
    setLoading(false);

    const authorIds = [...new Set(fetched.map((f) => f.user_id).filter(Boolean))] as string[];
    if (authorIds.length > 0) {
      const { data: profData } = await supabase.from('profiles').select('*').in('id', authorIds);
      const map: Record<string, Profile> = {};
      (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
      setAuthors(map);
    }
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm('Delete this flyer?')) return;
    const { error } = await supabase.from('flyers').delete().eq('id', id);
    if (error) { showToast('Could not delete flyer', 'error'); return; }
    showToast('Flyer deleted', 'info');
    load();
  };

  const toggleApproval = async (flyer: Flyer) => {
    const { error } = await supabase.from('flyers').update({ is_approved: !flyer.is_approved }).eq('id', flyer.id);
    if (error) { showToast('Could not update flyer', 'error'); return; }
    showToast(`Flyer ${flyer.is_approved ? 'hidden' : 'approved'}`, flyer.is_approved ? 'warning' : 'success');
    load();
  };

  const edit = (f: Flyer) => {
    setEditing(f);
    setForm({ title: f.title ?? '', description: f.description ?? '', category: f.category ?? 'Evangelism', images: f.images ?? [] });
    setShowForm(true);
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from('flyers').update({ title: form.title, description: form.description, category: form.category, images: form.images }).eq('id', editing.id);
    if (error) { showToast('Could not update flyer', 'error'); return; }
    showToast('Flyer updated', 'success');
    setShowForm(false); setEditing(null);
    load();
  };

  const addImage = (url: string) => {
    setForm((prev) => ({ ...prev, images: [...prev.images, url].slice(0, 5) }));
  };

  const removeImage = (idx: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const filtered = items.filter((f) => {
    const matchesCat = category === 'all' || f.category === category;
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      (f.title?.toLowerCase().includes(q)) ||
      (f.description?.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-primary-600" /> Flyers ({items.length})
      </h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flyers by title or description..."
            className="input-field pl-10"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field sm:w-48">
          <option value="all">All Categories</option>
          {FLYER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ImageIcon className="h-8 w-8 text-primary-500" />} title="No Flyers" description="No flyers match your search." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-2">Flyer</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Author</th>
                <th className="py-3 px-2">Likes</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const author = f.user_id ? authors[f.user_id] : null;
                return (
                  <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {f.images?.[0] && <img src={f.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                        <span className="font-medium line-clamp-1 max-w-[200px]">{f.title ?? 'Untitled'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">{f.category ?? '—'}</span>
                    </td>
                    <td className="py-3 px-2 text-xs">{author?.username ?? 'Unknown'}</td>
                    <td className="py-3 px-2">
                      <span className="flex items-center gap-1 text-xs"><Heart className="h-3 w-3 text-red-400" /> {f.likes_count}</span>
                    </td>
                    <td className="py-3 px-2">
                      {f.is_approved ? (
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">Approved</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">Hidden</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewFlyer(f)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="View details">
                          <Eye className="h-4 w-4 text-slate-400" />
                        </button>
                        <button onClick={() => edit(f)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Edit">
                          <Edit2 className="h-4 w-4 text-slate-400" />
                        </button>
                        <button onClick={() => toggleApproval(f)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title={f.is_approved ? 'Hide' : 'Approve'}>
                          {f.is_approved ? <XCircle className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
                        </button>
                        <button onClick={() => del(f.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Delete">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FormModal show={showForm} onClose={() => setShowForm(false)} title="Edit Flyer" onSave={save}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input-field" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="input-field min-h-[100px]" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
          {FLYER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="text-sm font-medium">Images ({form.images.length}/5)</label>
        {form.images.length < 5 && (
          <UploadButton
            label="Upload Image"
            accept="image/*"
            resourceType="image"
            onUploaded={addImage}
          />
        )}
        {form.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {form.images.map((url, idx) => (
              <div key={idx} className="relative group">
                <img src={url} alt={`Image ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </FormModal>

      <AnimatePresence>
        {viewFlyer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewFlyer(null)}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Flyer Details</h3>
                <button onClick={() => setViewFlyer(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Title</p>
                  <p className="font-semibold">{viewFlyer.title ?? 'Untitled'}</p>
                </div>
                {viewFlyer.description && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Description</p>
                    <p className="text-sm">{viewFlyer.description}</p>
                  </div>
                )}
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Category</p>
                    <p>{viewFlyer.category ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Likes</p>
                    <p className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" /> {viewFlyer.likes_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Author</p>
                    <p>{viewFlyer.user_id ? authors[viewFlyer.user_id]?.username ?? 'Unknown' : 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Status</p>
                    <p>{viewFlyer.is_approved ? 'Approved' : 'Hidden'}</p>
                  </div>
                </div>
                {viewFlyer.images?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">Images ({viewFlyer.images.length})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {viewFlyer.images.map((url, idx) => (
                        <img key={idx} src={url} alt={`Flyer image ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ==================== Blogs Management Tab ==================== */

const BLOG_CATEGORIES = [
  'Theology', 'Devotional', 'Testimony', 'Teaching', 'News', 'Other',
];

function BlogsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<Blog[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'Theology', tags: '', image_url: '' });

  const load = async () => {
    const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
    const fetched = (data as Blog[]) ?? [];
    setItems(fetched);
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

  const del = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (error) { showToast('Could not delete blog', 'error'); return; }
    showToast('Blog deleted', 'info');
    load();
  };

  const edit = (b: Blog) => {
    setEditing(b);
    setForm({
      title: b.title ?? '',
      content: b.content ?? '',
      category: b.category ?? 'Theology',
      tags: (b.tags ?? []).join(', '),
      image_url: b.image_url ?? '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!editing) return;
    const tagsArray = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from('blogs').update({
      title: form.title,
      content: form.content,
      category: form.category,
      tags: tagsArray.length > 0 ? tagsArray : null,
      image_url: form.image_url || null,
    }).eq('id', editing.id);
    if (error) { showToast('Could not update blog', 'error'); return; }
    showToast('Blog updated', 'success');
    setShowForm(false); setEditing(null);
    load();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Newspaper className="h-5 w-5 text-primary-600" /> Blogs ({items.length})
      </h2>
      {loading ? (
        <div className="skeleton h-64 rounded-xl" />
      ) : items.length === 0 ? (
        <EmptyState icon={<Newspaper className="h-8 w-8 text-primary-500" />} title="No Blogs" description="No blog posts have been created yet." />
      ) : (
        <div className="space-y-2">
          {items.map((b) => {
            const author = b.user_id ? authors[b.user_id] : null;
            return (
              <div key={b.id} className="glass-card p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {b.image_url && <img src={b.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                    <span className="font-semibold text-sm line-clamp-1">{b.title ?? 'Untitled'}</span>
                  </div>
                  {b.content && <p className="text-xs text-slate-500 line-clamp-2">{b.content}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    <span>{author?.username ?? 'Unknown'}</span>
                    {b.category && <span className="px-2 py-0.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">{b.category}</span>}
                    {b.tags && b.tags.length > 0 && b.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">#{tag}</span>
                    ))}
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" /> {b.likes_count}</span>
                    <span>{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => edit(b)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Edit">
                    <Edit2 className="h-4 w-4 text-slate-400" />
                  </button>
                  <button onClick={() => del(b.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Delete">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <FormModal show={showForm} onClose={() => setShowForm(false)} title="Edit Blog" onSave={save}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input-field" />
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Content" className="input-field min-h-[140px]" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
          {BLOG_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated, e.g. faith, prayer, healing)" className="input-field" />
        <label className="text-sm font-medium">Cover Image</label>
        <UploadButton
          label="Upload Cover Image"
          accept="image/*"
          resourceType="image"
          currentUrl={form.image_url}
          onUploaded={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
        />
        {form.image_url && <img src={form.image_url} alt="Cover preview" className="rounded-xl max-h-32 object-cover" />}
      </FormModal>
    </div>
  );
}
