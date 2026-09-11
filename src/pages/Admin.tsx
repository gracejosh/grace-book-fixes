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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 
                to-gold-500 mb-4">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Admin Access</h2>
              <p className="text-sm text-slate-500 mt-1">Enter password to manage content</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="input-field"
                autoFocus
              />
              <button type="submit" className="btn-primary w-full">Unlock</button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'books', label: 'Books', icon: <Library className="h-4 w-4" /> },
    { id: 'courses', label: 'Courses', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'quizzes', label: 'Quizzes', icon: <BrainCircuit className="h-4 w-4" /> },
    { id: 'posts', label: 'Posts', icon: <FileText className="h-4 w-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'ads', label: 'Ads', icon: <Megaphone className="h-4 w-4" /> },
    { id: 'messages', label: 'Messages', icon: <Mail className="h-4 w-4" /> },
    { id: 'flyers', label: 'Flyers', icon: <ImageIcon className="h-4 w-4" /> },
    { id: 'blogs', label: 'Blogs', icon: <Newspaper className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-thin pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'glass-card hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'books' && <BooksTab showToast={showToast} />}
          {tab === 'courses' && <CoursesTab showToast={showToast} />}
          {tab === 'quizzes' && <QuizzesTab showToast={showToast} />}
          {tab === 'posts' && <PostsTab showToast={showToast} />}
          {tab === 'users' && <UsersTab showToast={showToast} />}
          {tab === 'chat' && <ChatControlTab showToast={showToast} />}
          {tab === 'ads' && <AdsTab showToast={showToast} />}
          {tab === 'messages' && <MessagesTab showToast={showToast} />}
          {tab === 'flyers' && <FlyersTab showToast={showToast} />}
          {tab === 'blogs' && <BlogsTab showToast={showToast} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ==================== Dashboard Tab ==================== */

function DashboardTab() {
  const [stats, setStats] = useState({ books: 0, courses: 0, quizzes: 0, users: 0, posts: 0, messages: 0, ads: 0, flyers: 0, blogs: 0, subscribers: 0, prayers: 0, contacts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const tables = ['books', 'courses', 'quizzes', 'profiles', 'posts', 'contact_messages', 'ads', 'flyers', 'blogs', 'newsletter_subscribers', 'prayer_requests', 'contact_messages'];
      const counts = await Promise.all(tables.map((t) => supabase.from(t).select('*', { count: 'exact', head: true })));
      setStats({
        books: counts[0].count ?? 0,
        courses: counts[1].count ?? 0,
        quizzes: counts[2].count ?? 0,
        users: counts[3].count ?? 0,
        posts: counts[4].count ?? 0,
        messages: counts[5].count ?? 0,
        ads: counts[6].count ?? 0,
        flyers: counts[7].count ?? 0,
        blogs: counts[8].count ?? 0,
        subscribers: counts[9].count ?? 0,
        prayers: counts[10].count ?? 0,
        contacts: counts[11].count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: 'Books', value: stats.books, icon: <Library className="h-5 w-5" />, color: 'from-blue-500 to-cyan-500' },
    { label: 'Courses', value: stats.courses, icon: <GraduationCap className="h-5 w-5" />, color: 'from-emerald-500 to-teal-500' },
    { label: 'Quizzes', value: stats.quizzes, icon: <BrainCircuit className="h-5 w-5" />, color: 'from-purple-500 to-pink-500' },
    { label: 'Users', value: stats.users, icon: <Users className="h-5 w-5" />, color: 'from-amber-500 to-orange-500' },
    { label: 'Posts', value: stats.posts, icon: <FileText className="h-5 w-5" />, color: 'from-rose-500 to-red-500' },
    { label: 'Messages', value: stats.messages, icon: <Mail className="h-5 w-5" />, color: 'from-indigo-500 to-blue-500' },
    { label: 'Ads', value: stats.ads, icon: <Megaphone className="h-5 w-5" />, color: 'from-slate-500 to-gray-500' },
    { label: 'Flyers', value: stats.flyers, icon: <ImageIcon className="h-5 w-5" />, color: 'from-lime-500 to-green-500' },
    { label: 'Blogs', value: stats.blogs, icon: <Newspaper className="h-5 w-5" />, color: 'from-cyan-500 to-sky-500' },
    { label: 'Subscribers', value: stats.subscribers, icon: <Heart className="h-5 w-5" />, color: 'from-pink-500 to-rose-500' },
    { label: 'Prayers', value: stats.prayers, icon: <Heart className="h-5 w-5" />, color: 'from-violet-500 to-purple-500' },
    { label: 'Contacts', value: stats.contacts, icon: <Mail className="h-5 w-5" />, color: 'from-teal-500 to-emerald-500' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Overview</h2>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="glass-card p-4">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} text-white mb-2`}>
                {c.icon}
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== Shared Components ==================== */

function CrudHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <button onClick={onAdd} className="btn-primary flex items-center gap-1.5">
        <Plus className="h-4 w-4" /> Add
      </button>
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
  const [form, setForm] = useState({ question: '', options: ['', '', '', ''], correct_answer: -1, category: 'Bible', difficulty: 'Easy' });

  const load = async () => {
    const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    setItems((data as QuizType[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (form.correct_answer < 0 || form.correct_answer > 3) {
      showToast('Please select the correct answer before saving', 'warning');
      return;
    }
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
    setForm({ question: '', options: ['', '', '', ''], correct_answer: -1, category: 'Bible', difficulty: 'Easy' });
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
      <CrudHeader title="Quiz Questions" onAdd={() => { setEditing(null); setForm({ question: '', options: ['', '', '', ''], correct_answer: -1, category: 'Bible', difficulty: 'Easy' }); setShowForm(true); }} />
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
                  <button onClick={() => { setEditing(q); setForm({ question: q.question, options: [...q.options, '', '', '', ''].slice(0, 4), correct_answer: Number(q.correct_answer), category: q.category, difficulty: q.difficulty }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5 text-slate-400" /></button>
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
            <input type="radio" name="correct_answer" checked={form.correct_answer === i} onChange={() => setForm({ ...form, correct_answer: i })} className="w-4 h-4" />
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
    const { error } = await supabase.from('messages').delete().eq('id', msg.id);
    if (error) { showToast('Could not delete message', 'error'); return; }
    showToast('Message deleted', 'info');
    if (selectedRoom) loadMessages(selectedRoom);
  };

  const toggleMute = async (userId: string, muted: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_muted: !muted }).eq('id', userId);
    if (error) { showToast('Could not update user', 'error'); return; }
    showToast(`User ${muted ? 'unmuted' : 'muted'}`, muted ? 'info' : 'warning');
    if (selectedRoom) loadMessages(selectedRoom);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary-600" /> Chat Control
      </h2>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => loadMessages(r)}
              className={`w-full text-left glass-card p-3 transition-all ${selectedRoom?.id === r.id ? 'ring-2 ring-primary-500' : ''}`}
            >
              <p className="font-semibold text-sm">{r.name}</p>
              <p className="text-xs text-slate-500">{r.description ?? 'No description'}</p>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2">
          {!selectedRoom ? (
            <div className="glass-card p-8 text-center text-slate-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Select a chat room to view messages
            </div>
          ) : loadingMessages ? (
            <div className="skeleton h-64 rounded-xl" />
          ) : messages.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-500">No messages in this room</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {messages.map((m) => {
                const author = authors[m.sender_id];
                return (
                  <div key={m.id} className="glass-card p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover rounded-lg" /> : author?.username?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{author?.username ?? 'Unknown'}</p>
                        <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 break-words">{m.content}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => toggleMute(m.sender_id, author?.is_muted ?? false)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title={author?.is_muted ? 'Unmute' : 'Mute'}
                      >
                        {author?.is_muted ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-amber-400" />}
                      </button>
                      <button
                        onClick={() => deleteMessage(m)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== Ads Tab ==================== */

function AdsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [form, setForm] = useState({ title: '', image_url: '', link_url: '', placement: 'sidebar', is_active: true });

  const load = async () => {
    const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
    setItems((data as Ad[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing) {
      const { error } = await supabase.from('ads').update(form).eq('id', editing.id);
      if (error) { showToast('Could not update ad', 'error'); return; }
    } else {
      const { error } = await supabase.from('ads').insert(form);
      if (error) { showToast('Could not create ad', 'error'); return; }
    }
    showToast(editing ? 'Ad updated' : 'Ad created', 'success');
    setShowForm(false); setEditing(null);
    setForm({ title: '', image_url: '', link_url: '', placement: 'sidebar', is_active: true });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this ad?')) return;
    const { error } = await supabase.from('ads').delete().eq('id', id);
    if (error) { showToast('Could not delete ad', 'error'); return; }
    showToast('Ad deleted', 'info');
    load();
  };

  const toggleActive = async (ad: Ad) => {
    const { error } = await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    if (error) { showToast('Could not update ad', 'error'); return; }
    load();
  };

  return (
    <div>
      <CrudHeader title="Advertisements" onAdd={() => { setEditing(null); setForm({ title: '', image_url: '', link_url: '', placement: 'sidebar', is_active: true }); setShowForm(true); }} />
      {loading ? <div className="skeleton h-64 rounded-xl" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <div key={a.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm">{a.title}</h3>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(a)} className={`p-1.5 rounded-lg ${a.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    {a.is_active ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-slate-400" />}
                  </button>
                  <button onClick={() => { setEditing(a); setForm({ title: a.title, image_url: a.image_url, link_url: a.link_url ?? '', placement: a.placement, is_active: a.is_active }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5 text-slate-400" /></button>
                  <button onClick={() => del(a.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                </div>
              </div>
              {a.image_url && <img src={a.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />}
              <p className="text-xs text-slate-500">{a.placement} · {a.is_active ? 'Active' : 'Inactive'}</p>
            </div>
          ))}
        </div>
      )}
      <FormModal show={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Ad' : 'Create Ad'} onSave={save}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ad title" className="input-field" />
        <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="Link URL" className="input-field" />
        <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} className="input-field">
          {['sidebar', 'header', 'footer', 'popup'].map((p) => <option key={p}>{p}</option>)}
        </select>
        <label className="text-sm font-medium">Ad Image</label>
        <UploadButton
          label="Upload Ad Image"
          accept="image/*"
          resourceType="image"
          currentUrl={form.image_url}
          onUploaded={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
        />
        {form.image_url && <img src={form.image_url} alt="Preview" className="rounded-xl max-h-32 object-cover" />}
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
          Active
        </label>
      </FormModal>
    </div>
  );
}

/* ==================== Messages Tab ==================== */

function MessagesTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    setItems((data as ContactMessage[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    const { error } = await supabase.from('contact_messages').delete().eq('id', id);
    if (error) { showToast('Could not delete message', 'error'); return; }
    showToast('Message deleted', 'info');
    load();
  };

  const markRead = async (msg: ContactMessage) => {
    const { error } = await supabase.from('contact_messages').update({ is_read: !msg.is_read }).eq('id', msg.id);
    if (error) { showToast('Could not update message', 'error'); return; }
    load();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary-600" /> Contact Messages ({items.length})
      </h2>
      {loading ? <div className="skeleton h-64 rounded-xl" /> : items.length === 0 ? (
        <EmptyState icon={<Mail className="h-8 w-8 text-primary-500" />} title="No Messages" description="No contact messages received yet." />
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <div key={m.id} className={`glass-card p-4 ${!m.is_read ? 'ring-2 ring-primary-500/30' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{m.name}</p>
                    <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleDateString()}</span>
                    {!m.is_read && <span className="px-2 py-0.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold">New</span>}
                  </div>
                  <p className="text-xs text-slate-500">{m.email}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{m.message}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => markRead(m)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title={m.is_read ? 'Mark unread' : 'Mark read'}>
                    {m.is_read ? <Eye className="h-3.5 w-3.5 text-slate-400" /> : <CheckCircle className="h-3.5 w-3.5 text-primary-500" />}
                  </button>
                  <button onClick={() => del(m.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== Flyers Tab ==================== */

function FlyersTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Flyer | null>(null);
  const [form, setForm] = useState({ title: '', description: '', image_url: '', link_url: '', is_active: true });

  const load = async () => {
    const { data } = await supabase.from('flyers').select('*').order('created_at', { ascending: false });
    setItems((data as Flyer[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing) {
      const { error } = await supabase.from('flyers').update(form).eq('id', editing.id);
      if (error) { showToast('Could not update flyer', 'error'); return; }
    } else {
      const { error } = await supabase.from('flyers').insert(form);
      if (error) { showToast('Could not create flyer', 'error'); return; }
    }
    showToast(editing ? 'Flyer updated' : 'Flyer created', 'success');
    setShowForm(false); setEditing(null);
    setForm({ title: '', description: '', image_url: '', link_url: '', is_active: true });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this flyer?')) return;
    const { error } = await supabase.from('flyers').delete().eq('id', id);
    if (error) { showToast('Could not delete flyer', 'error'); return; }
    showToast('Flyer deleted', 'info');
    load();
  };

  return (
    <div>
      <CrudHeader title="Flyers" onAdd={() => { setEditing(null); setForm({ title: '', description: '', image_url: '', link_url: '', is_active: true }); setShowForm(true); }} />
      {loading ? <div className="skeleton h-64 rounded-xl" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f) => (
            <div key={f.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm">{f.title}</h3>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(f); setForm({ title: f.title, description: f.description ?? '', image_url: f.image_url, link_url: f.link_url ?? '', is_active: f.is_active }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5 text-slate-400" /></button>
                  <button onClick={() => del(f.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                </div>
              </div>
              {f.image_url && <img src={f.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />}
              <p className="text-xs text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      )}
      <FormModal show={showForm} onClose={() => setShowForm(false)} title="Edit Flyer" onSave={save}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input-field" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="input-field min-h-[60px]" />
        <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="Link URL" className="input-field" />
        <label className="text-sm font-medium">Flyer Image</label>
        <UploadButton
          label="Upload Flyer Image"
          accept="image/*"
          resourceType="image"
          currentUrl={form.image_url}
          onUploaded={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
        />
        {form.image_url && <img src={form.image_url} alt="Preview" className="rounded-xl max-h-32 object-cover" />}
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
          Active
        </label>
      </FormModal>
    </div>
  );
}

/* ==================== Blogs Tab ==================== */

function BlogsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [items, setItems] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [form, setForm] = useState({ title: '', content: '', author: '', image_url: '', is_published: false });

  const load = async () => {
    const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
    setItems((data as Blog[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing) {
      const { error } = await supabase.from('blogs').update(form).eq('id', editing.id);
      if (error) { showToast('Could not update blog', 'error'); return; }
    } else {
      const { error } = await supabase.from('blogs').insert(form);
      if (error) { showToast('Could not create blog', 'error'); return; }
    }
    showToast(editing ? 'Blog updated' : 'Blog created', 'success');
    setShowForm(false); setEditing(null);
    setForm({ title: '', content: '', author: '', image_url: '', is_published: false });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (error) { showToast('Could not delete blog', 'error'); return; }
    showToast('Blog deleted', 'info');
    load();
  };

  return (
    <div>
      <CrudHeader title="Blog Posts" onAdd={() => { setEditing(null); setForm({ title: '', content: '', author: '', image_url: '', is_published: false }); setShowForm(true); }} />
      {loading ? <div className="skeleton h-64 rounded-xl" /> : (
        <div className="space-y-2">
          {items.map((b) => (
            <div key={b.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-xs text-slate-500 mt-1">by {b.author} · {b.is_published ? 'Published' : 'Draft'}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(b); setForm({ title: b.title, content: b.content, author: b.author ?? '', image_url: b.image_url ?? '', is_published: b.is_published }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5 text-slate-400" /></button>
                  <button onClick={() => del(b.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <FormModal show={showForm} onClose={() => setShowForm(false)} title="Edit Blog" onSave={save}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input-field" />
        <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author" className="input-field" />
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Content" className="input-field min-h-[120px]" />
        <label className="text-sm font-medium">Blog Image</label>
        <UploadButton
          label="Upload Blog Image"
          accept="image/*"
          resourceType="image"
          currentUrl={form.image_url}
          onUploaded={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
        />
        {form.image_url && <img src={form.image_url} alt="Preview" className="rounded-xl max-h-32 object-cover" />}
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-4 h-4" />
          Published
        </label>
      </FormModal>
    </div>
  );
}
