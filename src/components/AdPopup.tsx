import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';
import type { Ad } from '@/types';

const STORAGE_KEY = 'grace-last-ad-time';
const FIRST_AD_DELAY = 5 * 60 * 1000;   // 5 minutes
const REPEAT_INTERVAL = 30 * 60 * 1000;  // 30 minutes
const COUNTDOWN_START = 10;
const CHECK_TICK = 10_000; // check every 10s

export default function AdPopup() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const adIndexRef = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active ads once on mount
  useEffect(() => {
    supabase
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as Ad[]) ?? [];
        if (list.length > 0) setAds(list);
      });
  }, []);

  const showNextAd = useCallback(() => {
    if (ads.length === 0) return;
    const chosen = ads[adIndexRef.current % ads.length];
    adIndexRef.current += 1;
    setCurrentAd(chosen);
    setShow(true);
    setCountdown(COUNTDOWN_START);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }, [ads]);

  // Timing: first ad after 5 min, then every 30 min
  useEffect(() => {
    if (ads.length === 0) return;

    const pageLoadTime = Date.now();

    const check = () => {
      const lastShown = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (!lastShown) {
        // No ad shown yet — schedule first after 5 min from page load
        const elapsedSinceLoad = now - pageLoadTime;
        if (elapsedSinceLoad >= FIRST_AD_DELAY) {
          showNextAd();
        }
        return;
      }

      if (now - parseInt(lastShown) >= REPEAT_INTERVAL) {
        showNextAd();
      }
    };

    const interval = setInterval(check, CHECK_TICK);
    const initial = setTimeout(check, FIRST_AD_DELAY + 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(initial);
    };
  }, [ads, showNextAd]);

  // Countdown timer
  useEffect(() => {
    if (!show) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShow(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [show]);

  const close = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const openLink = () => {
    if (currentAd?.link_url) {
      window.open(currentAd.link_url, '_blank', 'noopener,noreferrer');
    }
    close();
  };

  return (
    <AnimatePresence>
      {show && currentAd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={close}
          className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-[80%] max-w-md"
          >
            {/* Close button — white circle top-right */}
            <button
              onClick={close}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center z-10 hover:scale-110 active:scale-95 transition-transform"
              aria-label="Close ad"
            >
              <X className="h-5 w-5 text-slate-700" />
            </button>

            {/* Tap ad opens link */}
            <div onClick={openLink} className="cursor-pointer rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={currentAd.image_url}
                alt={currentAd.title}
                className="w-full max-h-[60vh] object-cover"
              />
              <div className="glass-card p-4 text-center">
                <h3 className="font-bold text-lg">{currentAd.title}</h3>
                <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                  Tap to learn more
                </p>
              </div>
            </div>

            {/* Countdown */}
            <div className="mt-3 text-center text-sm font-medium text-white/80">
              ⏳ {countdown}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
