import { motion } from 'framer-motion';
import { Moon, Sun, Coffee, Languages, User, Info } from 'lucide-react';
import { useTheme, type Theme } from '@/context/ThemeContext';
import { useLang } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

const themeOptions: { value: Theme; label: string; icon: typeof Moon; swatch: string }[] = [
  { value: 'dark', label: 'Dark', icon: Moon, swatch: 'bg-gradient-to-br from-primary-700 to-primary-950' },
  { value: 'coffee', label: 'Coffee', icon: Coffee, swatch: 'bg-gradient-to-br from-amber-700 to-amber-950' },
  { value: 'light', label: 'Light', icon: Sun, swatch: 'bg-gradient-to-br from-slate-100 to-slate-300' },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLang();
  const { user, profile } = useAuth();

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-4">
        {/* Appearance */}
        <div className="glass-card p-4">
          <h2 className="font-semibold text-sm mb-3 text-slate-500 dark:text-slate-400 uppercase tracking-wide">Appearance</h2>
          <p className="text-xs text-slate-400 mb-3">Choose a theme. The header toggle cycles through all three.</p>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                    active
                      ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full ${opt.swatch} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-primary-600 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
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
