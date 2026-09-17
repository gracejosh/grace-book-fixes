import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Profile } from '@/types';
import { EmptyState } from '@/components/ui';
import {
  Bell, Heart, MessageCircle, UserPlus, Send,
  CheckCheck, Loader,
} from 'lucide-react';

type NotificationType = 'follow' | 'like' | 'comment' | 'message';

interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

const typeIcon = (type: NotificationType) => {
  switch (type) {
    case 'follow': return UserPlus;
    case 'like': return Heart;
    case 'comment': return MessageCircle;
    case 'message': return Send;
  }
};

const typeColor = (type: NotificationType) => {
  switch (type) {
    case 'follow': return 'from-primary-500 to-primary-700';
    case 'like': return 'from-rose-500 to-rose-700';
    case 'comment': return 'from-emerald-500 to-emerald-700';
    case 'message': return 'from-gold-500 to-amber-700';
  }
};

const typeMessage = (type: NotificationType, username: string) => {
  const name = username || 'Someone';
  switch (type) {
    case 'follow': return `${name} started following you`;
    case 'like': return `${name} liked your post`;
    case 'comment': return `${name} commented on your post`;
    case 'message': return `${name} sent you a message`;
  }
};

const typeRoute = (n: NotificationType, entityId: string | null) => {
  switch (n) {
    case 'follow': return entityId ? `/profile?user=${encodeURIComponent(entityId)}` : '/posts';
    case 'like': return entityId ? `/posts` : '/posts';
    case 'comment': return entityId ? `/posts` : '/posts';
    case 'message': return '/chat';
  }
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

export default function Notifications() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actors, setActors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      showToast('Could not load notifications', 'error');
      setLoading(false);
      return;
    }
    const fetched = (data as Notification[]) ?? [];
    setNotifications(fetched);

    const actorIds = [...new Set(fetched.map((n) => n.actor_id).filter(Boolean) as string[])];
    if (actorIds.length > 0) {
      const { data: profData } = await supabase.from('profiles').select('*').in('id', actorIds);
      const map: Record<string, Profile> = {};
      (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
      setActors(map);
    }
    setLoading(false);
  }, [user, showToast]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) {
      showToast('Could not mark all as read', 'error');
      setNotifications((prev) => prev.map((n) =>
        unread.some((u) => u.id === n.id) ? { ...n, is_read: false } : n
      ));
    } else {
      showToast('All notifications marked as read', 'success');
    }
    setMarkingAll(false);
  }, [user, notifications, showToast]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    ));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  }, [user]);

  const handleTap = useCallback((n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    const route = typeRoute(n.type, n.entity_id);
    navigate(route);
  }, [markAsRead, navigate]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 dark:from-slate-950 dark:via-primary-950 dark:to-slate-950 py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-64 h-64 bg-gold-500 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-20 w-64 h-64 bg-primary-500 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <Bell className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-white/90 font-medium">Activity</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Notifications</h1>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Stay up to date with follows, likes, comments, and messages.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="container-narrow">
          {/* Mark all as read */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
              <button
                onClick={markAllAsRead}
                disabled={markingAll || unreadCount === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium glass text-slate-600 dark:text-slate-300 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {markingAll ? (
                  <><Loader className="h-4 w-4 animate-spin" /> Marking...</>
                ) : (
                  <><CheckCheck className="h-4 w-4" /> Mark all read</>
                )}
              </button>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 flex items-center gap-3">
                  <div className="skeleton h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton h-5 w-2/3 rounded-lg mb-2" />
                    <div className="skeleton h-4 w-1/3 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-8 w-8 text-primary-500" />}
              title="No Notifications Yet"
              description="When someone follows you, likes your post, comments, or sends a message, you'll see it here."
            />
          ) : (
            <div className="space-y-2">
              {notifications.map((n, i) => {
                const actor = n.actor_id ? actors[n.actor_id] : undefined;
                const Icon = typeIcon(n.type);
                const gradient = typeColor(n.type);
                const message = typeMessage(n.type, actor?.username || 'Someone');
                return (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    onClick={() => handleTap(n)}
                    className={`w-full text-left glass-card p-4 flex items-center gap-3 transition-all hover:shadow-lg ${
                      !n.is_read ? 'ring-1 ring-primary-300 dark:ring-primary-700' : ''
                    }`}
                  >
                    {/* Type icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Actor avatar */}
                    {actor?.avatar_url ? (
                      <img src={actor.avatar_url} alt="" className="flex-shrink-0 w-8 h-8 rounded-full object-cover" />
                    ) : actor ? (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold">
                        {actor.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    ) : null}

                    {/* Message + time */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2">{message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>

                    {/* Unread dot */}
                    {!n.is_read && (
                      <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse" aria-label="Unread" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
