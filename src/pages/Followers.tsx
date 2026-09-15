import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Profile, ChatRoom } from '@/types';
import { ArrowLeft, UserPlus, UserCheck, MessageCircle, Users, UserX } from 'lucide-react';
import { EmptyState, SkeletonCard } from '@/components/ui';

interface FollowersProps {
  type: 'followers' | 'following';
}

export default function Followers({ type }: FollowersProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [actionPending, setActionPending] = useState<Set<string>>(new Set());

  const title = type === 'followers' ? 'Followers' : 'Following';

  const loadProfiles = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let query;
      if (type === 'followers') {
        query = supabase
          .from('follows')
          .select('follower_id, created_at, profiles!follows_follower_id_fkey1(*)')
          .eq('following_id', user.id)
          .order('created_at', { ascending: false });
      } else {
        query = supabase
          .from('follows')
          .select('following_id, created_at, profiles!follows_following_id_fkey1(*)')
          .eq('follower_id', user.id)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows: Profile[] = (data ?? []).map((row: Record<string, unknown>) => {
        return row.profiles as Profile;
      }).filter((p) => p.id);

      setProfiles(rows);

      if (rows.length > 0) {
        const { data: myFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', rows.map((r) => r.id));
        setFollowedIds(new Set((myFollows ?? []).map((f: Record<string, unknown>) => f.following_id as string)));
      }
    } catch {
      showToast('Could not load ' + title.toLowerCase(), 'error');
    } finally {
      setLoading(false);
    }
  }, [user, type, title, showToast]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const goToProfile = (profileId: string) => {
    navigate(`/profile?user=${encodeURIComponent(profileId)}`);
  };

  const toggleFollow = async (profileId: string) => {
    if (!user || profileId === user.id) return;
    if (actionPending.has(profileId)) return;

    setActionPending((prev) => new Set(prev).add(profileId));
    const isFollowing = followedIds.has(profileId);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profileId);
        if (error) throw error;
        setFollowedIds((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
        showToast('Unfollowed', 'info');
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: profileId });
        if (error) throw error;
        setFollowedIds((prev) => new Set(prev).add(profileId));
        showToast('Following', 'success');
      }
    } catch {
      showToast('Could not update follow status', 'error');
    } finally {
      setActionPending((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  };

  const startDirectChat = async (person: Profile) => {
    if (!user || !person.id || person.id === user.id) return;

    try {
      const { data: privateRooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'private')
        .eq('is_active', true)
        .contains('participants', [user.id, person.id]);

      if (roomsError) throw roomsError;

      const existingRoom = ((privateRooms as ChatRoom[] | null) ?? []).find((room) => {
        const participants = room.participants || [];
        return participants.length === 2 && participants.includes(user.id) && participants.includes(person.id);
      });

      if (!existingRoom) {
        const { error: createError } = await supabase
          .from('chat_rooms')
          .insert({
            name: 'Chat with ' + (person.username || 'user'),
            type: 'private',
            created_by: user.id,
            participants: [user.id, person.id],
            is_active: true,
          });
        if (createError) throw createError;
      }

      navigate('/chat');
      showToast('Chat opened', 'success');
    } catch {
      showToast('Could not start direct chat', 'error');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-14 z-30 glass border-b border-white/20 dark:border-slate-700/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all duration-300 hover:scale-105 hover:bg-white dark:hover:bg-slate-800 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-gold-400 text-white shadow-lg shadow-primary-500/25">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">{title}</h1>
              {!loading && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {profiles.length} {profiles.length === 1 ? 'person' : 'people'}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <EmptyState
            icon={<UserX className="h-9 w-9 text-primary-500" />}
            title={type === 'followers' ? 'No followers yet' : 'You are not following anyone'}
            description={
              type === 'followers'
                ? 'When people follow you, they will appear here.'
                : 'Discover and follow people to see them here.'
            }
          />
        ) : (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            <AnimatePresence>
              {profiles.map((person) => {
                const isOwnProfile = person.id === user?.id;
                const isFollowing = followedIds.has(person.id);
                const pending = actionPending.has(person.id);

                return (
                  <motion.div
                    key={person.id}
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 },
                      exit: { opacity: 0, x: -30 },
                    }}
                    className="glass-card p-4 flex items-center gap-4 group hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300"
                  >
                    {/* Avatar */}
                    <button
                      onClick={() => goToProfile(person.id)}
                      className="flex-shrink-0 relative group/avatar"
                      aria-label={`View ${person.username || 'user'}'s profile`}
                    >
                      {person.avatar_url ? (
                        <img
                          src={person.avatar_url}
                          alt={person.username || 'User avatar'}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-primary-200 dark:ring-primary-800 group-hover/avatar:ring-gold-400 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white font-bold text-lg ring-2 ring-primary-200 dark:ring-primary-800 group-hover/avatar:ring-gold-400 transition-all duration-300">
                          {(person.username || person.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-full bg-primary-600/0 group-hover/avatar:bg-primary-600/10 transition-all duration-300" />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => goToProfile(person.id)}
                        className="block text-left group/name"
                      >
                        <h3 className="font-semibold text-base truncate group-hover/name:text-primary-600 dark:group-hover/name:text-primary-400 transition-colors duration-200">
                          {person.username || person.full_name || 'Unknown user'}
                        </h3>
                      </button>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {person.bio || 'No bio available'}
                      </p>
                    </div>

                    {/* Actions */}
                    {!isOwnProfile && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleFollow(person.id)}
                          disabled={pending}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isFollowing
                              ? 'btn-ghost !py-2 !px-4'
                              : 'btn-primary !py-2 !px-4'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="h-4 w-4" />
                              <span className="hidden sm:inline">Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => startDirectChat(person)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-gold-500/30 active:scale-95"
                          aria-label={`Message ${person.username || 'user'}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
