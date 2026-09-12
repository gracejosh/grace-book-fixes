import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, uploadToCloudinary } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { QuizResult, BookDownload, CourseProgress } from '@/types';
import { User, Mail, Lock, Eye, EyeOff, Camera, Edit2, Save, X, Award, Download, GraduationCap, BrainCircuit, LogOut, KeyRound, Star, Link2, Send, MessageCircle, Music, Phone, Globe } from 'lucide-react';

export default function Profile() {
  const { user, profile, loading, signUp, signIn, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="skeleton h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSignUp={signUp} onSignIn={signIn} showToast={showToast} />;
  }

  return <ProfileDashboard user={user} profile={profile} showToast={showToast} signOut={signOut} refreshProfile={refreshProfile} />;
}

function AuthForm({ onSignUp, onSignIn, showToast }: {
  onSignUp: (e: string, p: string, u: string, f: string) => Promise<{ error: string | null }>;
  onSignIn: (e: string, p: string) => Promise<{ error: string | null }>;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === 'signup') {
      if (!username.trim()) {
        showToast('Please enter a username', 'error');
        setLoading(false);
        return;
      }
      const { error } = await onSignUp(email, password, username, fullName);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Account created! You are now signed in.', 'success');
      }
    } else {
      const { error } = await onSignIn(email, password);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Welcome back!', 'success');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-gold-500 mb-4 shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{mode === 'signin' ? 'Welcome Back' : 'Join Grace Book'}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {mode === 'signin' ? 'Sign in to your account' : 'Create your free account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={username} onChange={(e) => setUsername(e.target.value)} required className="input-field pl-10" placeholder="yourname" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <Edit2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field pl-10" placeholder="Your Name" />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field pl-10" placeholder="you@email.com" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input-field pl-10 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileDashboard({ user, profile, showToast, signOut, refreshProfile }: {
  user: { id: string; email?: string };
  profile: { username: string | null; full_name: string | null; avatar_url: string | null; bio: string | null; facebook_url: string | null; telegram_url: string | null; whatsapp_number: string | null; tiktok_url: string | null; phone_number: string | null; website_url: string | null; is_admin: boolean; created_at: string } | null;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? '');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [facebookUrl, setFacebookUrl] = useState(profile?.facebook_url ?? '');
  const [telegramUrl, setTelegramUrl] = useState(profile?.telegram_url ?? '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsapp_number ?? '');
  const [tiktokUrl, setTiktokUrl] = useState(profile?.tiktok_url ?? '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ quizzes: 0, books: 0, courses: 0, bestScore: 0 });
  const [recentResults, setRecentResults] = useState<QuizResult[]>([]);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    (async () => {
      const [quizRes, bookDl, courseProg] = await Promise.all([
        supabase.from('quiz_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('book_downloads').select('id').eq('user_id', user.id),
        supabase.from('course_progress').select('*').eq('user_id', user.id).eq('is_completed', true),
      ]);
      const results = (quizRes.data ?? []) as QuizResult[];
      setRecentResults(results.slice(0, 5));
      setStats({
        quizzes: results.length,
        books: (bookDl.data ?? []).length,
        courses: (courseProg.data ?? []).length,
        bestScore: results.reduce((max, r) => Math.max(max, r.score), 0),
      });
    })();
  }, [user.id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'image');
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      await refreshProfile();
      showToast('Profile picture updated!', 'success');
    } catch {
      showToast('Upload failed', 'error');
    }
    setUploading(false);
  };

  const saveProfile = async () => {
    const optionalValue = (value: string) => value.trim() || null;
    const { error } = await supabase.from('profiles').update({
      username: optionalValue(username),
      full_name: optionalValue(fullName),
      bio: optionalValue(bio),
      facebook_url: optionalValue(facebookUrl),
      telegram_url: optionalValue(telegramUrl),
      whatsapp_number: optionalValue(whatsappNumber),
      tiktok_url: optionalValue(tiktokUrl),
      phone_number: optionalValue(phoneNumber),
      website_url: optionalValue(websiteUrl),
    }).eq('id', user.id);
    if (error) {
      showToast('Could not save profile', 'error');
      return;
    }
    await refreshProfile();
    setEditing(false);
    showToast('Profile updated!', 'success');
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Password updated!', 'success');
    setShowPasswordChange(false);
    setNewPassword('');
  };

  const statItems = [
    { label: 'Quiz Attempts', value: stats.quizzes, icon: BrainCircuit, color: 'from-rose-500 to-rose-700' },
    { label: 'Books Downloaded', value: stats.books, icon: Download, color: 'from-gold-400 to-gold-600' },
    { label: 'Courses Completed', value: stats.courses, icon: GraduationCap, color: 'from-accent-500 to-accent-700' },
    { label: 'Best Quiz Score', value: stats.bestScore, icon: Award, color: 'from-primary-500 to-primary-700' },
  ];

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-white" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
              {uploading && <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center"><div className="skeleton h-8 w-8 rounded-full" /></div>}
            </div>

            <div className="flex-1 text-center sm:text-left">
              {editing ? (
                <div className="space-y-5 text-left">
                  <div>
                    <h2 className="text-lg font-bold">Edit profile</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add only the details you want to share. Every field is optional.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                      <span className="mb-1.5 flex items-center gap-2"><User className="h-4 w-4 text-primary-600" /> Full Name</span>
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your Name" className="input-field" />
                    </label>
                    <label className="text-sm font-medium">
                      <span className="mb-1.5 flex items-center gap-2"><User className="h-4 w-4 text-primary-600" /> Username</span>
                      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" className="input-field" />
                    </label>
                    <label className="text-sm font-medium sm:col-span-2">
                      <span className="mb-1.5 flex items-center gap-2"><Edit2 className="h-4 w-4 text-primary-600" /> Bio</span>
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." className="input-field min-h-[80px]" />
                    </label>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold mb-3">Social links</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        <span className="mb-1.5 flex items-center gap-2"><Link2 className="h-4 w-4 text-primary-600" /> Facebook URL</span>
                        <input type="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/yourname" className="input-field" />
                      </label>
                      <label className="text-sm font-medium">
                        <span className="mb-1.5 flex items-center gap-2"><Send className="h-4 w-4 text-primary-600" /> Telegram URL</span>
                        <input type="url" value={telegramUrl} onChange={(e) => setTelegramUrl(e.target.value)} placeholder="https://t.me/yourname" className="input-field" />
                      </label>
                      <label className="text-sm font-medium">
                        <span className="mb-1.5 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary-600" /> WhatsApp number</span>
                        <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+251..." className="input-field" />
                      </label>
                      <label className="text-sm font-medium">
                        <span className="mb-1.5 flex items-center gap-2"><Music className="h-4 w-4 text-primary-600" /> TikTok URL</span>
                        <input type="url" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@yourname" className="input-field" />
                      </label>
                      <label className="text-sm font-medium">
                        <span className="mb-1.5 flex items-center gap-2"><Phone className="h-4 w-4 text-primary-600" /> Phone number</span>
                        <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+251..." className="input-field" />
                      </label>
                      <label className="text-sm font-medium">
                        <span className="mb-1.5 flex items-center gap-2"><Globe className="h-4 w-4 text-primary-600" /> Website URL</span>
                        <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." className="input-field" />
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={saveProfile} className="btn-primary"><Save className="h-4 w-4" /> Save</button>
                    <button onClick={() => setEditing(false)} className="btn-ghost"><X className="h-4 w-4" /> Cancel</button>
                  </div>
                </div>              ) : (
                <>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <h1 className="text-2xl font-bold">{profile?.username ?? 'User'}</h1>
                    {profile?.is_admin && (
                      <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-gold-400 to-gold-600 text-white text-xs font-bold flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white" /> Admin
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">{profile?.full_name || user.email}</p>
                  {profile?.bio && <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 max-w-md">{profile.bio}</p>}
                  <p className="text-xs text-slate-400">Member since {new Date(profile?.created_at ?? Date.now()).toLocaleDateString()}</p>
                  <div className="flex gap-2 mt-4 justify-center sm:justify-start">
                    <button onClick={() => setEditing(true)} className="btn-ghost py-2"><Edit2 className="h-4 w-4" /> Edit Profile</button>
                    <button onClick={() => setShowPasswordChange(!showPasswordChange)} className="btn-ghost py-2"><KeyRound className="h-4 w-4" /> Password</button>
                    <button onClick={signOut} className="btn-ghost py-2 text-red-600 dark:text-red-400"><LogOut className="h-4 w-4" /> Logout</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Password change */}
        <AnimatePresence>
          {showPasswordChange && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
              <div className="glass-card p-6">
                <h3 className="font-bold mb-3 flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary-600" /> Change Password</h3>
                <div className="flex gap-2">
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="input-field" />
                  <button onClick={changePassword} className="btn-primary whitespace-nowrap">Update</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statItems.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-5 text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Recent activity */}
        {recentResults.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary-600" /> Recent Quiz Results</h3>
            <div className="space-y-2">
              {recentResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <p className="font-semibold text-sm">{r.category}</p>
                    <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary-600 dark:text-primary-400">{r.score}</p>
                    <p className="text-xs text-slate-500">{r.total_questions} questions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
