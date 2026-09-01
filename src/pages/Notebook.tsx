import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Notebook as NotebookIcon, Plus, Trash2, X } from 'lucide-react';
import { EmptyState } from '@/components/ui';

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function Notebook() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const load = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setNotes((data as Note[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user || !form.title.trim()) return;
    const { error } = await supabase.from('notes').insert({
      user_id: user.id,
      title: form.title.trim(),
      content: form.content.trim(),
    });
    if (error) {
      showToast('Could not save note', 'error');
      return;
    }
    showToast('Note saved!', 'success');
    setForm({ title: '', content: '' });
    setShowForm(false);
    load();
  };

  const del = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id);
    showToast('Note deleted', 'info');
    load();
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <EmptyState
          icon={<NotebookIcon className="h-8 w-8 text-primary-500" />}
          title="Sign In to Use Notebook"
          description="Keep track of your personal reflections, sermon notes, and prayer insights."
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <NotebookIcon className="h-6 w-6 text-primary-600" /> Notebook
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary py-2 px-4 text-sm">
          <Plus className="h-4 w-4" /> New Note
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">New Note</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button>
              </div>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Note title" className="input-field" />
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your reflection..." className="input-field min-h-[120px]" />
              <button onClick={save} className="btn-primary w-full">Save Note</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<NotebookIcon className="h-8 w-8 text-primary-500" />}
          title="No Notes Yet"
          description="Create your first note to start journaling your faith journey."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm">{note.title}</h3>
                <button onClick={() => del(note.id)} className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-6">{note.content}</p>
              <p className="text-xs text-slate-400 mt-2">{new Date(note.created_at).toLocaleDateString()}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
