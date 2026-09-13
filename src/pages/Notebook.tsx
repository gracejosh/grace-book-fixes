import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/ui';
import { saveNote, getNotes, deleteNote } from '@/lib/db';
import {
  Notebook as NotebookIcon, Plus, Trash2, X, Pencil,
  Image as ImageIcon, Calendar, Palette, Check, Search,
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

const COLORS = [
  { name: 'Gold',    value: 'gold',    class: 'bg-gold-50 dark:bg-gold-900/20',    dot: 'bg-gold-400' },
  { name: 'Purple',  value: 'purple',  class: 'bg-primary-50 dark:bg-primary-900/20', dot: 'bg-primary-400' },
  { name: 'Green',   value: 'green',   class: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-400' },
  { name: 'Blue',    value: 'blue',    class: 'bg-sky-50 dark:bg-sky-900/20',     dot: 'bg-sky-400' },
  { name: 'Rose',    value: 'rose',    class: 'bg-rose-50 dark:bg-rose-900/20',   dot: 'bg-rose-400' },
];

const colorClassMap = Object.fromEntries(COLORS.map((c) => [c.value, c.class]));

type DbNote = Parameters<typeof saveNote>[0];

function toDbNote(note: Note): DbNote {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    color: note.color,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    imageUrl: note.image,
  } as unknown as DbNote;
}

function fromDbNote(record: Record<string, unknown>): Note | null {
  if (typeof record.id !== 'string') return null;

  const image = typeof record.imageUrl === 'string'
    ? record.imageUrl
    : typeof record.image === 'string'
      ? record.image
      : null;
  const dateValue = (value: unknown) => {
    if (typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) return value;
    if (typeof value === 'number') return new Date(value).toISOString();
    return new Date().toISOString();
  };

  return {
    id: record.id,
    title: typeof record.title === 'string' ? record.title : '',
    content: typeof record.content === 'string' ? record.content : '',
    color: typeof record.color === 'string' ? record.color : 'gold',
    image,
    createdAt: dateValue(record.createdAt),
    updatedAt: dateValue(record.updatedAt ?? record.createdAt),
  };
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
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '',
    content: '',
    color: 'gold',
    image: null as string | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const stored = await getNotes();
        const loaded = stored
          .map((record) => fromDbNote(record))
          .filter((note): note is Note => note !== null)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        if (active) setNotes(loaded);
      } catch {
        if (active) showToast('Could not load notes', 'error');
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [showToast]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    );
  }, [notes, search]);

  const openNew = () => {
    setEditingId(null);
    setForm({ title: '', content: '', color: 'gold', image: null });
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

  const save = async () => {
    if (!form.title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }

    const now = new Date().toISOString();
    const note: Note = editingId
      ? {
          ...(notes.find((n) => n.id === editingId) as Note),
          title: form.title.trim(),
          content: form.content.trim(),
          color: form.color,
          image: form.image,
          updatedAt: now,
        }
      : {
          id: crypto.randomUUID(),
          title: form.title.trim(),
          content: form.content.trim(),
          color: form.color,
          image: form.image,
          createdAt: now,
          updatedAt: now,
        };

    if (editingId && !notes.some((n) => n.id === editingId)) {
      showToast('Note not found', 'error');
      return;
    }

    try {
      const saved = await saveNote(toDbNote(note));
      if (!saved) throw new Error('IndexedDB did not save the note.');

      setNotes((current) => editingId
        ? current.map((existing) => existing.id === editingId ? note : existing)
        : [note, ...current]);
      showToast(editingId ? 'Note updated' : 'Note saved', 'success');
      setForm({ title: '', content: '', color: 'gold', image: null });
      setShowForm(false);
      setEditingId(null);
    } catch {
      showToast('Could not save note', 'error');
    }
  };

  const del = async (id: string) => {
    try {
      await deleteNote(id);
      setNotes((current) => current.filter((note) => note.id !== id));
      showToast('Note deleted', 'info');
    } catch {
      showToast('Could not delete note', 'error');
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <NotebookIcon className="h-6 w-6 text-primary-600" /> Notebook
        </h1>
        <button onClick={openNew} className="btn-primary py-2 px-4 text-sm">
          <Plus className="h-4 w-4" /> New Note
        </button>
      </div>

      {/* Search */}
      {notes.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="input-field pl-10"
          />
        </div>
      )}

      {/* Form */}
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

              {/* Color picker — 5 marks */}
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

      {/* Notes list */}
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
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No notes match your search.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm group ${colorClassMap[note.color] ?? colorClassMap.gold}`}
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
