import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Home, Library, GraduationCap, BrainCircuit, MessageCircle, User,
  Moon, Sun, Menu, X, Sparkles, Languages, Newspaper, Image as ImageIcon,
  FileText, HandHeart, Settings as SettingsIcon, Notebook as NotebookIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LanguageContext';

// Desktop top nav links
const desktopLinks = [
  { to: '/', key: 'nav.home', icon: Home },
  { to: '/verses', key: 'nav.bible', icon: BookOpen },
  { to: '/books', key: 'nav.books', icon: Library },
  { to: '/courses', key: 'nav.courses', icon: GraduationCap },
  { to: '/quiz', key: 'nav.quiz', icon: BrainCircuit },
  { to: '/chat', key: 'nav.chat', icon: MessageCircle },
  { to: '/flyers', key: 'nav.flyers', icon: ImageIcon },
  { to: '/posts', key: 'nav.posts', icon: FileText },
  { to: '/blog', key: 'nav.blog', icon: Newspaper },
  { to: '/about', key: 'nav.about', icon: Sparkles },
];

// Bottom nav (mobile only): 5 items
const bottomLinks = [
  { to: '/', key: 'nav.home', icon: Home },
  { to: '/books', key: 'nav.books', icon: Library },
  { to: '/posts', key: 'nav.posts', icon: FileText },
  { to: '/chat', key: 'nav.chat', icon: MessageCircle },
  { to: '/profile', key: 'nav.profile', icon: User },
];

// Side drawer items
const drawerLinks = [
  { to: '/verses', key: 'nav.bible', icon: BookOpen },
  { to: '/flyers', key: 'nav.flyers', icon: ImageIcon },
  { to: '/courses', key: 'nav.courses', icon: GraduationCap },
  { to: '/quiz', key: 'nav.quiz', icon: BrainCircuit },
  { to: '/blog', key: 'nav.blog', icon: Newspaper },
  { to: '/notebook', key: 'nav.notebook', icon: NotebookIcon },
  { to: '/about', key: 'nav.donate', icon: HandHeart },
  { to: '/about', key: 'nav.about', icon: Sparkles },
  { to: '/settings', key: 'nav.settings', icon: SettingsIcon },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const { lang, setLang, t } = useLang();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20 dark:border-slate-700/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Hamburger (mobile only) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-gold-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">Grace</span>
              </Link>
            </div>

            {/* Center: Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {desktopLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(link.key)}
                    {active && (
                      <motion.div
                        layoutId="navIndicator"
                        className="absolute inset-0 -z-10 rounded-xl bg-primary-50 dark:bg-primary-900/30"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right: Dark toggle + Profile */}
            <div className="flex items-center gap-1.5">
              {/* Language toggle - desktop only */}
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1 p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  aria-label="Language"
                >
                  <Languages className="h-5 w-5" />
                  <span className="text-xs font-semibold">{lang === 'en' ? 'EN' : 'አማ'}</span>
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-40 glass-card p-2 z-50"
                    >
                      <button
                        onClick={() => { setLang('en'); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${lang === 'en' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => { setLang('am'); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${lang === 'am' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      >
                        Amharic
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
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

              {/* Profile - desktop only */}
              <Link
                to="/profile"
                className="hidden lg:flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className="text-sm font-medium max-w-[80px] truncate">
                  {user ? profile?.username || t('nav.profile') : t('nav.signIn')}
                </span>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Side Drawer (mobile only) */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="lg:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-[61] w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-gold-500 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold gradient-text">Grace Book</span>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Profile link */}
              <Link
                to="/profile"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{user ? profile?.username ?? 'Profile' : t('nav.signIn')}</p>
                  <p className="text-xs text-slate-500">{user ? 'View profile' : 'Tap to sign in'}</p>
                </div>
              </Link>

              {/* Drawer links */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
                {drawerLinks.map((link, i) => {
                  const Icon = link.icon;
                  const active = isActive(link.to);
                  // Skip duplicate About if it's the donate entry pointing to /about
                  const isDonateEntry = link.key === 'nav.donate';
                  const targetPath = isDonateEntry ? '/about' : link.to;
                  return (
                    <Link
                      key={`${link.to}-${i}`}
                      to={targetPath}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        active && !isDonateEntry
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {t(link.key)}
                    </Link>
                  );
                })}

                {/* Language selector in drawer */}
                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 mb-2">Language</p>
                  <div className="flex gap-2 px-3">
                    <button
                      onClick={() => setLang('en')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${lang === 'en' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLang('am')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${lang === 'am' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      Amharic
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin link */}
              {profile?.is_admin && (
                <Link
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 mx-3 mb-3 rounded-xl text-sm font-medium bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300 hover:scale-[1.02] transition-transform"
                >
                  <Sparkles className="h-5 w-5" />
                  {t('nav.admin')}
                </Link>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav (mobile only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/20 dark:border-slate-700/50 safe-area-pb">
        <div className="flex items-center justify-around h-16 px-1">
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-all duration-200 ${
                  active
                    ? 'text-gold-500 dark:text-gold-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium">{t(link.key)}</span>
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 w-8 h-0.5 rounded-full bg-gold-500 dark:bg-gold-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
