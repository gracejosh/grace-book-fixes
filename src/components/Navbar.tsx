import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Home, Library, GraduationCap, BrainCircuit, MessageCircle, User,
  Moon, Sun, Menu, X, Sparkles, Newspaper, Image as ImageIcon,
  FileText, HandHeart, Settings as SettingsIcon, Notebook as NotebookIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

// Bottom nav (mobile only): 5 items
const bottomLinks = [
  { to: '/', key: 'Home', icon: Home },
  { to: '/books', key: 'Books', icon: Library },
  { to: '/posts', key: 'Posts', icon: FileText },
  { to: '/chat', key: 'Chat', icon: MessageCircle },
  { to: '/profile', key: 'Profile', icon: User },
];

// Side drawer items
const drawerLinks = [
  { to: '/verses', key: 'Bible', icon: BookOpen },
  { to: '/flyers', key: 'Flyers', icon: ImageIcon },
  { to: '/courses', key: 'Courses', icon: GraduationCap },
  { to: '/quiz', key: 'Quiz', icon: BrainCircuit },
  { to: '/blog', key: 'Blog', icon: Newspaper },
  { to: '/notebook', key: 'Notebook', icon: NotebookIcon },
  { to: '/donate', key: 'Donate', icon: HandHeart },
  { to: '/about', key: 'About', icon: Sparkles },
  { to: '/settings', key: 'Settings', icon: SettingsIcon },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20 dark:border-slate-700/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-gold-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">Grace</span>
              </Link>
            </div>

            {/* Right: Dark toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Side Drawer */}
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
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-gold-500 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold gradient-text">Grace</span>
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
                  <p className="font-semibold text-sm">{user ? profile?.username ?? 'Profile' : 'Sign In'}</p>
                  <p className="text-xs text-slate-500">{user ? 'View profile' : 'Tap to sign in'}</p>
                </div>
              </Link>

              {/* Drawer links */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
                {drawerLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {link.key}
                    </Link>
                  );
                })}
              </div>

              {/* Admin link */}
              {profile?.is_admin && (
                <Link
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 mx-3 mb-3 rounded-xl text-sm font-medium bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300 hover:scale-[1.02] transition-transform"
                >
                  <Sparkles className="h-5 w-5" />
                  Admin
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
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-all duration-200 ${
                  active
                    ? 'text-gold-500 dark:text-gold-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium">{link.key}</span>
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
