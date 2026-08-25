import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';
import type { Ad } from '@/types';

const STORAGE_KEY = 'grace-last-ad-time';
const MIN_INTERVAL = 30; // fallback minutes

export default function AdPopup() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const checkAds = async () => {
      const { data } = await supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const ads = (data as Ad[]) ?? [];
      if (ads.length === 0) return;

      const lastShown = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (!lastShown) {
        const chosen = ads[Math.floor(Math.random() * ads.length)];
        setAd(chosen);
        setShow(true);
        localStorage.setItem(STORAGE_KEY, String(now));
        return;
      }

      const elapsed = now - parseInt(lastShown);
      const chosen = ads[Math.floor(Math.random() * ads.length)];
      const intervalMs = (chosen.interval_minutes || MIN_INTERVAL) * 60 * 1000;

      if (elapsed >= intervalMs) {
        setAd(chosen);
        setShow(true);
        localStorage.setItem(STORAGE_KEY, String(now));
      }
    };

    checkAds();
    interval = setInterval(checkAds, 60000);

    return () => { if (interval) clearInterval(interval); };
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  return (
    <AnimatePresence>
      {show && ad && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full"
          >
            <button
              onClick={close}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center z-10 hover:scale-110 transition-transform"
            >
              <X className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            </button>
            <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={ad.image_url} alt={ad.title} className="w-full rounded-2xl shadow-2xl" />
              <div className="glass-card p-4 mt-2 text-center">
                <h3 className="font-bold text-lg">{ad.title}</h3>
                <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">Click to learn more</p>
              </div>
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
