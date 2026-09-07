import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Library, MessageCircle, User, Moon, Sun, Menu, X,
  Image as ImageIcon, GraduationCap, BrainCircuit, Newspaper,
  Sparkles, Settings as SettingsIcon, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LanguageContext';

const LOGO_URL = 'https://raw.githubusercontent.com/gracejosh/grace-book-fixes/5cf59f361da74053f2131bd04d4964123cdb927f/grace-logo.png';

const bottomNavLinks = [
  { to: '/', key: 'nav.home', icon: Home },
  { to: '/books', key: 'nav.books', icon: Library },
  { to: '/posts', key: 'nav.posts', icon: MessageCircle },
  { to: '/chat', key: 'nav.chat', icon: MessageCircle },
  { to: '/profile', key: 'nav.profile', icon: User },
];

const drawerLinks = [
  { to: '/flyers', key: 'nav.flyers', icon: ImageIcon },
  { to: '/courses', key: 'nav.courses', icon: GraduationCap },
  { to: '/quiz', key: 'nav.quiz', icon: BrainCircuit },
  { to: '/blogs', key: 'nav.blogs', icon: Newspaper },
  { to: '/about', key: 'nav.about', icon: Sparkles },
  { to: '/settings', key: 'nav.settings', icon: SettingsIcon },
];

const MARQUEE_TEXT = '✦ Grace Book — Your Faith, Beautifully Nourished ✦ Daily Bible Verses ✦ Free Christian Books ✦ Inspiring Courses ✦ Community Chat ✦ Walk Closer With God Every Day ✦';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const { t } = useLang();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));
  const showMarquee = !location.pathname.startsWith('/chat');

  return (
    <>
      {/* ===== Header ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3">
        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo + "Grace" text */}
        <Link to="/" className="flex flex-col items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          <img src={LOGO_URL} alt="Grace Book" className="h-8 w-auto" />
          <span className="text-[10px] font-semibold tracking-wide gradient-text leading-none">Grace</span>
        </Link>

        {/* Dark toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait">
            {theme === 'light' ? (
              <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <Moon className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Sun className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </header>

      {/* ===== Marquee ===== */}
      {showMarquee && (
        <div className="fixed top-14 left-0 right-0 z-40 h-7 bg-primary-600 dark:bg-primary-800 overflow-hidden flex items-center">
          <div className="marquee-track flex items-center whitespace-nowrap text-xs font-medium text-white">
            <span className="px-4">{MARQUEE_TEXT}</span>
            <span className="px-4">{MARQUEE_TEXT}</span>
          </div>
        </div>
      )}

      {/* ===== Side Drawer ===== */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 z-[61] w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <img src={LOGO_URL} alt="Grace Book" className="h-9 w-auto rounded-lg" />
                  <span className="font-bold text-lg gradient-text">Grace Book</span>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* User card */}
              {user && (
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{profile?.username ?? 'User'}</p>
                      <p className="text-xs text-slate-400 truncate">{profile?.full_name ?? ''}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Drawer links */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {drawerLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {t(link.key)}
                      <ChevronRight className="h-4 w-4 ml-auto text-slate-300 dark:text-slate-600" />
                    </Link>
                  );
                })}
              </nav>

              {/* Drawer footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
                &copy; {new Date().getFullYear()} Grace Book
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== Bottom Nav ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2">
        {bottomNavLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? 'text-gold-500 dark:text-gold-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'fill-gold-100 dark:fill-gold-900/30' : ''}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>{t(link.key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
