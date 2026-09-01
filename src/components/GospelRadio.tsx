import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Radio, ChevronDown } from 'lucide-react';

const stations = [
  { name: 'K-LOVE', url: 'https://maestro.emfcdn.com/stream/k-love/tunein/aac', desc: 'Contemporary Christian' },
  { name: 'Air1', url: 'https://maestro.emfcdn.com/stream/air1/tunein/aac', desc: 'Positive Hits' },
  { name: 'BBN Radio', url: 'https://bbnradio-lh.akamaihd.net/i/BBNRadio_1@174570/master.m3u8', desc: 'Bible Broadcasting Network' },
];

export default function GospelRadio() {
  const [currentStation, setCurrentStation] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [showStations, setShowStations] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      setError(false);
      audioRef.current.play().catch(() => {
        setError(true);
        setPlaying(false);
      });
      setPlaying(true);
    }
  };

  const switchStation = (idx: number) => {
    setCurrentStation(idx);
    setPlaying(false);
    setError(false);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(() => {
          setError(true);
          setPlaying(false);
        });
        setPlaying(true);
      }
    }, 100);
    setShowStations(false);
  };

  const station = stations[currentStation];

  return (
    <section className="py-12 bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 dark:from-slate-950 dark:via-primary-950 dark:to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-20 w-72 h-72 bg-gold-500 rounded-full blur-3xl animate-float" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
            <Radio className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-white/90 font-medium">Gospel Radio</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">Listen to Christian Radio</h2>
          <p className="text-white/70">Worship music and Bible teaching, 24/7</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-xl mx-auto glass-card p-6 border-white/30">
          <audio ref={audioRef} src={station.url} preload="none" onError={() => { setError(true); setPlaying(false); }} />

          {/* LIVE badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
              </span>
              {playing && <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> On Air</span>}
            </div>
            {/* Station selector */}
            <div className="relative">
              <button onClick={() => setShowStations(!showStations)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm font-medium hover:bg-white/20 transition-all">
                {station.name} <ChevronDown className={`h-4 w-4 transition-transform ${showStations ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showStations && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-52 glass-card p-2 z-50">
                    {stations.map((s, idx) => (
                      <button key={s.name} onClick={() => switchStation(idx)}
                        className={`w-full flex flex-col items-start px-3 py-2 rounded-lg text-sm transition-all ${idx === currentStation ? 'bg-primary-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-xs opacity-70">{s.desc}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Play/pause + visualizer */}
          <div className="flex items-center gap-4 mb-4">
            <button onClick={togglePlay}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
              {playing ? <Pause className="h-8 w-8 text-white" fill="white" /> : <Play className="h-8 w-8 text-white ml-1" fill="white" />}
            </button>
            <div className="flex-1">
              <p className="text-white font-bold text-lg">{station.name}</p>
              <p className="text-white/60 text-sm">{station.desc}</p>
              {error && <p className="text-amber-400 text-xs mt-1">Stream unavailable. Try another station.</p>}
            </div>
            {/* Visualizer bars */}
            <div className="flex items-end gap-1 h-12">
              {Array.from({ length: 7 }).map((_, i) => (
                <motion.div key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-primary-400 to-gold-400"
                  animate={playing ? { height: [8, 30 + Math.random() * 20, 12, 25 + Math.random() * 15, 8] } : { height: 8 }}
                  transition={playing ? { duration: 0.8, repeat: Infinity, delay: i * 0.1 } : { duration: 0.3 }}
                />
              ))}
            </div>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-3">
            <button onClick={() => setMuted(!muted)} className="text-white/70 hover:text-white transition-colors">
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              className="flex-1 h-2 rounded-full bg-white/20 appearance-none cursor-pointer accent-gold-500" />
            <span className="text-xs text-white/60 w-8 text-right">{Math.round((muted ? 0 : volume) * 100)}%</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
