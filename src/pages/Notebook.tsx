import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/ui';
import {
  Notebook as NotebookIcon, Plus, Trash2, X, Pencil,
  Image as ImageIcon, Calendar, Palette, Check,
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'grace-notebook-notes';

const COLORS = [
  { name: 'Default', value: 'default', class: 'bg-white dark:bg-slate-800', dot: 'bg-slate-400' },
  { name: 'Yellow', value: 'yellow', class: 'bg-amber-50 dark:bg-amber-900/20', dot: 'bg-amber-400' },
  { name: 'Green', value: 'green', class: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-400' },
  { name: 'Blue', value: 'blue', class: 'bg-sky-50 dark:bg-sky-900/20', dot: 'bg-sky-400' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-50 dark:bg-pink-900/20', dot: 'bg-pink-400' },
  { name: 'Purple', value: 'purple', class: 'bg-violet-50 dark:bg-violet-900/20', dot: 'bg-violet-400' },
];

const colorClassMap = Object.fromEntries(COLORS.map((c) => [c.value, c.class]));

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Notebook() {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    color: 'default',
    image: null as string | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  const persist = (updated: Note[]) => {
    setNotes(updated);
    saveNotes(updated);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ title: '', content: '', color: 'default', image: null });
    setShowForm(true);
  };

  const openEdit = (note: Note) => {
    setEditingId(note.id);
    setForm({ title: note.title, content: note.content, color: note.color, image: note.image });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2 MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setForm((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const save = () => {
    if (!form.title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }
    const now = new Date().toISOString();

    if (editingId) {
      const updated = notes.map((n) =>
        n.id === editingId
          ? {
              ...n,
              title: form.title.trim(),
              content: form.content.trim(),
              color: form.color,
              image: form.image,
              updatedAt: now,
            }
          : n,
      );
      persist(updated);
      showToast('Note updated', 'success');
    } else {
      const note: Note = {
        id: crypto.randomUUID(),
        title: form.title.trim(),
        content: form.content.trim(),
        color: form.color,
        image: form.image,
        createdAt: now,
        updatedAt: now,
      };
      persist([note, ...notes]);
      showToast('Note saved', 'success');
    }

    setForm({ title: '', content: '', color: 'default', image: null });
    setShowForm(false);
    setEditingId(null);
  };

  const del = (id: string) => {
    persist(notes.filter((n) => n.id !== id));
    showToast('Note deleted', 'info');
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <NotebookIcon className="h-6 w-6 text-primary-600" /> Notebook
        </h1>
        <button onClick={openNew} className="btn-primary py-2 px-4 text-sm">
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
                <h3 className="font-bold">{editingId ? 'Edit Note' : 'New Note'}</h3>
                <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Note title"
                className="input-field"
                maxLength={100}
              />

              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your reflection..."
                className="input-field min-h-[120px]"
                maxLength={5000}
              />

              {/* Image preview */}
              {form.image && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={form.image} alt="Note attachment" className="w-full max-h-48 object-cover" />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Color picker */}
              <div className="flex items-center gap-2 flex-wrap">
                <Palette className="h-4 w-4 text-slate-400" />
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`relative w-7 h-7 rounded-full ${c.dot} transition-transform ${
                      form.color === c.value ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-slate-800 scale-110' : 'hover:scale-110'
                    }`}
                    aria-label={c.name}
                  >
                    {form.color === c.value && <Check className="h-3.5 w-3.5 text-white absolute inset-0 m-auto" />}
                  </button>
                ))}
              </div>

              {/* Image attach */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
              {!form.image && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors"
                >
                  <ImageIcon className="h-4 w-4" /> Attach image
                </button>
              )}

              <button onClick={save} className="btn-primary w-full">
                {editingId ? 'Update Note' : 'Save Note'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {notes.length === 0 ? (
        <EmptyState
          icon={<NotebookIcon className="h-8 w-8 text-primary-500" />}
          title="No Notes Yet"
          description="Create your first note to start journaling your faith journey. Notes are saved on your device and work offline."
          action={
            <button onClick={openNew} className="btn-primary">
              <Plus className="h-4 w-4" /> Create Note
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm group ${colorClassMap[note.color] ?? colorClassMap.default}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm">{note.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(note)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                    aria-label="Edit note"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                  <button
                    onClick={() => del(note.id)}
                    className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              {note.image && (
                <img
                  src={note.image}
                  alt=""
                  className="w-full max-h-40 object-cover rounded-lg mb-2"
                />
              )}

              {note.content && (
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-6 mb-2">
                  {note.content}
                </p>
              )}

              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="h-3 w-3" />
                {formatDate(note.updatedAt)}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
