import { motion } from 'framer-motion';
import { useState } from 'react';
import { Heart, Copy, Check, Send, Mail, MessageCircle, Music2, Phone } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const TELEBIRR_NUMBER = '251911573334';
const TELEGRAM_URL = 'https://t.me/graceapp7';
const EMAIL = 'graceapp@proton.me';
const TIKTOK_URL = 'https://www.tiktok.com/@graceapp7';

export default function Donate() {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyTelebirr = async () => {
    try {
      await navigator.clipboard.writeText(TELEBIRR_NUMBER);
      setCopied(true);
      showToast('Telebirr number copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy. Please write the number manually.', 'error');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 dark:from-slate-950 dark:via-primary-950 dark:to-slate-950 py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-72 h-72 bg-gold-500 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-20 w-72 h-72 bg-primary-500 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 mb-6 mx-auto"
          >
            <Heart className="h-8 w-8 text-white" fill="white" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Support Grace Book</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            Support to grow the service
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="max-w-2xl mx-auto">
          {/* Support message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-8 text-center"
          >
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Grace Book is free for everyone. Your support helps us keep Bible verses, books,
              courses, and community features accessible to all. Every contribution makes a difference.
            </p>
          </motion.div>

          {/* Telebirr */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 mb-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Telebirr</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Send via Telebirr</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <code className="flex-1 text-lg font-semibold tracking-wide text-primary-700 dark:text-primary-300">
                {TELEBIRR_NUMBER}
              </code>
              <button
                onClick={copyTelebirr}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </motion.div>

          {/* Telegram */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6 mb-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Telegram Group</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Join our community</p>
              </div>
            </div>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full"
            >
              <MessageCircle className="h-4 w-4" />
              Open Telegram
            </a>
          </motion.div>

          {/* Email */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 mb-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Email</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{EMAIL}</p>
              </div>
            </div>
            <a
              href={`mailto:${EMAIL}`}
              className="btn-ghost w-full"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </a>
          </motion.div>

          {/* TikTok */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-black">
                <Music2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">TikTok</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Follow us for updates</p>
              </div>
            </div>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-black px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] w-full"
            >
              <Music2 className="h-4 w-4" />
              Follow on TikTok
            </a>
          </motion.div>

          {/* Thank you */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-sm text-slate-400"
          >
            Thank you for your support &middot; Grace Book
          </motion.p>
        </div>
      </section>
    </div>
  );
}
