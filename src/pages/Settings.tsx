import { motion } from 'framer-motion';
import { Moon, Sun, Languages, User, Bell, Shield, Info } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const { user, profile } = useAuth();

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-4">
        {/* Appearance */}
        <div className="glass-card p-4">
          <h2 className="font-semibold text-sm mb-3 text-slate-500 dark:text-slate-400 uppercase tracking-wide">Appearance</h2>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-primary-500" /> : <Sun className="h-5 w-5 text-gold-500" />}
              <span className="text-sm font-medium">Dark Mode</span>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary-600' : 'bg-slate-300'} relative`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Language */}
        <div className="glass-card p-4">
          <h2 className="font-semibold text-sm mb-3 text-slate-500 dark:text-slate-400 uppercase tracking-wide">Language</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setLang('en')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all flex-1 ${lang === 'en' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Languages className="h-4 w-4" /> English
            </button>
            <button
              onClick={() => setLang('am')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all flex-1 ${lang === 'am' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Languages className="h-4 w-4" /> አማርኛ
            </button>
          </div>
        </div>

        {/* Account */}
        <div className="glass-card p-4">
          <h2 className="font-semibold text-sm mb-3 text-slate-500 dark:text-slate-400 uppercase tracking-wide">Account</h2>
          <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <User className="h-5 w-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">{profile?.username ?? 'Guest'}</p>
              <p className="text-xs text-slate-400">{user ? 'View your profile' : 'Sign in to your account'}</p>
            </div>
          </Link>
        </div>

        {/* About */}
        <div className="glass-card p-4">
          <h2 className="font-semibold text-sm mb-3 text-slate-500 dark:text-slate-400 uppercase tracking-wide">About</h2>
          <Link to="/about" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Info className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium">About Grace Book</span>
          </Link>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-slate-400 pt-4"
        >
          Grace Book v1.0 &middot; &copy; {new Date().getFullYear()}
        </motion.p>
      </div>
    </div>
  );
}
