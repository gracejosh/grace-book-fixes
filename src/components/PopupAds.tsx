import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { PopupAd } from '@/types';
import { X, ExternalLink } from 'lucide-react';

const POPUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY = 'grace_book_last_popup';

export default function PopupAds() {
  const [ad, setAd] = useState<PopupAd | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkAndShow = async () => {
      const lastShown = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();
      if (lastShown && now - parseInt(lastShown) < POPUP_INTERVAL) return;

      const { data } = await supabase.from('popup_ads').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        setAd(data[0] as PopupAd);
        setVisible(true);
        localStorage.setItem(STORAGE_KEY, now.toString());
      }
    };

    const timer = setTimeout(checkAndShow, 3000);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(() => setAd(null), 300);
  };

  return (
    <AnimatePresence>
      {visible && ad && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-md w-full overflow-hidden relative"
          >
            <button onClick={close} className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all">
              <X className="h-5 w-5" />
            </button>
            {ad.image_url && (
              <div className="relative h-56 overflow-hidden">
                <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">{ad.title}</h2>
              {ad.content && <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">{ad.content}</p>}
              {ad.link_url && (
                <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={close}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  Learn More <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {!ad.link_url && (
                <button onClick={close} className="btn-ghost w-full">Close</button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
