import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { uploadToCloudinary } from '@/lib/supabase';
import type { Flyer } from '@/types';
import { Image as ImageIcon, Heart, Share2, Upload, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { SkeletonCard, EmptyState } from '@/components/ui';

const categories = ['All', 'Events', 'Sermons', 'Conferences', 'Youth', 'Music', 'General'];

export default function Flyers() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState<number | null>(null);
  const [likedFlyers, setLikedFlyers] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ title: '', description: '', category: 'General' });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('flyers').select('*').order('created_at', { ascending: false });
      if (error) {
        showToast('Could not load flyers', 'error');
        setLoading(false);
        return;
      }
      setFlyers((data as Flyer[]) ?? []);
      setLoading(false);
    })();
  }, [showToast]);

  const filtered = category === 'All' ? flyers : flyers.filter((f) => f.category === category);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingImages(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadToCloudinary(file, 'image');
        urls.push(url);
      }
      setImageUrls((prev) => [...prev, ...urls]);
      showToast('Images uploaded', 'success');
    } catch {
      showToast('Upload failed', 'error');
    }
    setUploadingImages(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitFlyer = async () => {
    if (!user) {
      showToast('Please sign in to upload flyers', 'info');
      return;
    }
    if (!form.title.trim() || imageUrls.length === 0) {
      showToast('Title and at least one image required', 'error');
      return;
    }
    const { data, error } = await supabase.from('flyers').insert({
      title: form.title.trim(),
      description: form.description,
      images: imageUrls,
      category: form.category,
    }).select().single();
    if (error) {
      showToast('Could not upload flyer', 'error');
      return;
    }
    setFlyers((prev) => [data as Flyer, ...prev]);
    setForm({ title: '', description: '', category: 'General' });
    setImageUrls([]);
    setShowUpload(false);
    showToast('Flyer uploaded!', 'success');
  };

  const handleLike = async (flyer: Flyer) => {
    if (!user) {
      showToast('Sign in to like', 'info');
      return;
    }
    if (likedFlyers.has(flyer.id)) return;
    await supabase.from('flyers').update({ likes_count: flyer.likes_count + 1 }).eq('id', flyer.id);
    setLikedFlyers((prev) => new Set(prev).add(flyer.id));
    setFlyers((prev) => prev.map((f) => f.id === flyer.id ? { ...f, likes_count: f.likes_count + 1 } : f));
  };

  const handleShare = async (flyer: Flyer) => {
    const text = `Check out this flyer: ${flyer.title}`;
    if (navigator.share) {
      navigator.share({ text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      showToast('Link copied!', 'success');
    }
  };

  const openCarousel = (flyerIdx: number) => setCarouselIdx(flyerIdx);

  const nextImage = useCallback(() => {
    setCarouselIdx((prev) => {
      if (prev === null) return prev;
      return prev + 1 >= filtered.length ? 0 : prev + 1;
    });
  }, [filtered.length]);

  const prevImage = useCallback(() => {
    setCarouselIdx((prev) => {
      if (prev === null) return prev;
      return prev - 1 < 0 ? filtered.length - 1 : prev - 1;
    });
  }, [filtered.length]);

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 to-slate-900 dark:from-slate-950 dark:to-primary-950 py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-20 w-72 h-72 bg-gold-500 rounded-full blur-3xl animate-float" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <ImageIcon className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-white/90 font-medium">Community Flyers</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Flyers & Events</h1>
          <p className="text-white/80 max-w-2xl mx-auto">Share and discover Christian event flyers, conference announcements, and more.</p>
          {user && (
            <button onClick={() => setShowUpload(true)} className="btn-gold mt-6">
              <Upload className="h-4 w-4" /> Upload Flyer
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
            <EmptyState icon={<ImageIcon className="h-8 w-8 text-primary-500" />} title="No Flyers Yet" description="Be the first to upload a flyer!" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((flyer, i) => (
                <motion.div key={flyer.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.06, 0.5) }}
                  className="glass-card overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="relative h-56 overflow-hidden cursor-pointer" onClick={() => openCarousel(i)}>
                    {flyer.images[0] ? (
                      <img src={flyer.images[0]} alt={flyer.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="flex items-center justify-center h-full"><ImageIcon className="h-16 w-16 text-primary-300" /></div>
                    )}
                    {flyer.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs">{flyer.images.length} images</div>
                    )}
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 mb-2 inline-block">{flyer.category}</span>
                    <h3 className="text-lg font-bold mb-1 line-clamp-1">{flyer.title}</h3>
                    {flyer.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{flyer.description}</p>}
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleLike(flyer)} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-colors">
                        <Heart className={`h-4 w-4 ${likedFlyers.has(flyer.id) ? 'fill-rose-500 text-rose-500' : ''}`} /> {flyer.likes_count}
                      </button>
                      <button onClick={() => handleShare(flyer)} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-primary-500 transition-colors">
                        <Share2 className="h-4 w-4" /> Share
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
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
              className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Upload Flyer</h2>
                <button onClick={() => setShowUpload(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Flyer title" className="input-field" />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="input-field min-h-[80px]" />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                  {['Events', 'Sermons', 'Conferences', 'Youth', 'Music', 'General'].map((c) => <option key={c}>{c}</option>)}
                </select>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="input-field" />
                {uploadingImages && <p className="text-xs text-amber-500">Uploading images...</p>}
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {imageUrls.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                        <button onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={submitFlyer} disabled={uploadingImages || !form.title.trim() || imageUrls.length === 0} className="btn-primary w-full">
                  <Plus className="h-4 w-4" /> Publish Flyer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Carousel viewer */}
      <AnimatePresence>
        {carouselIdx !== null && filtered[carouselIdx] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCarouselIdx(null)}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
            <button onClick={(e) => { e.stopPropagation(); setCarouselIdx(null); }} className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"><X className="h-6 w-6" /></button>
            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"><ChevronLeft className="h-8 w-8" /></button>
            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"><ChevronRight className="h-8 w-8" /></button>
            <motion.div key={carouselIdx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()} className="max-w-2xl w-full">
              <img src={filtered[carouselIdx].images[0]} alt={filtered[carouselIdx].title} className="w-full max-h-[70vh] object-contain rounded-xl" />
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold text-white">{filtered[carouselIdx].title}</h3>
                {filtered[carouselIdx].description && <p className="text-white/70 mt-1">{filtered[carouselIdx].description}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
