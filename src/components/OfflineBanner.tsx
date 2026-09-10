import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { useOffline } from '@/context/OfflineContext';

export default function OfflineBanner() {
  const { isOnline } = useOffline();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOnlineRef = useRef(true);

  useEffect(() => {
    if (isOnline) {
      if (!wasOnlineRef.current) {
        setShowBackOnline(true);
        const timer = setTimeout(() => setShowBackOnline(false), 3000);
        wasOnlineRef.current = true;
        return () => clearTimeout(timer);
      }
      wasOnlineRef.current = true;
    } else {
      wasOnlineRef.current = false;
      setShowBackOnline(false);
    }
  }, [isOnline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9998] bg-amber-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg"
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">You are offline</span>
        </motion.div>
      )}
      {showBackOnline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9998] bg-emerald-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg"
        >
          <Wifi className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Back online</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
