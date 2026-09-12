import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, uploadToCloudinary } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { ChatRoom, Message, Profile } from '@/types';
import {
  MessageCircle, Send, Plus, Users, Hash, Lock, Search, Smile,
  Image as ImageIcon, Reply, Trash2, Edit2, X, ArrowLeft, Check,
  AlertCircle, Loader, Mic, Square, BookOpen, Library,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';

const EMOJIS = ['😀', '😂', '❤️', '🙏', '🙌', '✨', '🔥', '👏', '😍', '🥰', '😇', '🕊️', '✝️', '📖', '⛪', '🎵', '💪', '🌟', '💙', '🙌'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DAILY_MESSAGE_LIMIT = 50;

export default function Chat() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'public' | 'private'>('public');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [users, setUsers] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [messagesToday, setMessagesToday] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const profilesRef = useRef<Record<string, Profile>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesLeft = Math.max(0, DAILY_MESSAGE_LIMIT - messagesToday);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        if (error) { setError(error.message); setLoading(false); return; }
        setRooms((data as ChatRoom[]) ?? []);
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    };
    fetchRooms();
  }, []);

  // Load the people directory separately from chat rooms so room behavior stays unchanged.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchUsers = async () => {
      setLoadingUsers(true);
      setUsersError(null);
      const { data, error: usersQueryError } = await supabase.from('profiles').select('*');
      if (cancelled) return;

      if (usersQueryError) {
        setUsersError('Could not load users.');
        setLoadingUsers(false);
        return;
      }

      const nextUsers = ((data as Profile[] | null) ?? []).filter((person) => person.id !== user.id);
      setUsers(nextUsers);
      setProfiles((previous) => {
        const next = { ...previous };
        nextUsers.forEach((person) => { next[person.id] = person; });
        profilesRef.current = next;
        return next;
      });
      setLoadingUsers(false);
    };

    fetchUsers();
    return () => { cancelled = true; };
  }, [user]);

  const loadProfiles = useCallback(async (ids: string[]) => {
    const uniqueIds = [...new Set(ids)].filter((id) => id && !profilesRef.current[id]);
    if (uniqueIds.length === 0) return;
    const { data } = await supabase.from('profiles').select('*').in('id', uniqueIds);
    if (data) {
      setProfiles((prev) => {
        const next = { ...prev };
        (data as Profile[]).forEach((p) => { next[p.id] = p; });
        profilesRef.current = next;
        return next;
      });
    }
  }, []);

  // Count today's messages for this user
  useEffect(() => {
    if (!user) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const fetchCount = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .gte('created_at', startOfDay.toISOString());
      setMessagesToday(count ?? 0);
    };
    fetchCount();
  }, [user]);

  // Load messages + realtime
  useEffect(() => {
    if (!selectedRoom) return;
    setLoadingMessages(true);

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', selectedRoom.id)
        .order('created_at', { ascending: true })
        .limit(100);
      const msgs = (data as Message[]) ?? [];
      setMessages(msgs);
      setShowMobileChat(true);
      const senderIds = msgs.map((m) => m.sender_id).filter(Boolean) as string[];
      if (senderIds.length > 0) loadProfiles(senderIds);

      // Mark unread messages from others as read
      const unreadIds = msgs.filter((m) => !m.is_read && m.sender_id !== user?.id).map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      }
      setLoadingMessages(false);
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages:${selectedRoom.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${selectedRoom.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id) loadProfiles([newMsg.sender_id]);
          if (newMsg.sender_id !== user?.id && !newMsg.is_read) {
            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${selectedRoom.id}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${selectedRoom.id}` },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const senderId = payload.payload?.sender_id as string;
        if (senderId && senderId !== user?.id) {
          setTypingUsers((prev) => prev.includes(senderId) ? prev : [...prev, senderId]);
          setTimeout(() => setTypingUsers((prev) => prev.filter((id) => id !== senderId)), 3000);
        }
      })
      .on('broadcast', { event: 'presence' }, (payload) => {
        const userId = payload.payload?.user_id as string;
        if (userId && payload.payload?.online) {
          setOnlineUsers((prev) => prev.includes(userId) ? prev : [...prev, userId]);
        } else if (userId) {
          setOnlineUsers((prev) => prev.filter((id) => id !== userId));
        }
      })
      .subscribe();

    // Broadcast presence
    if (user) {
      channel.send({ type: 'broadcast', event: 'presence', payload: { user_id: user.id, online: true } });
    }

    return () => {
      if (user) {
        channel.send({ type: 'broadcast', event: 'presence', payload: { user_id: user.id, online: false } });
      }
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Broadcast typing
  const handleTyping = useCallback(() => {
    if (!selectedRoom || !user) return;
    const channel = supabase.channel(`messages:${selectedRoom.id}`);
    channel.send({ type: 'broadcast', event: 'typing', payload: { sender_id: user.id } });
  }, [selectedRoom, user]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedRoom) {
        const ch = supabase.channel(`messages:${selectedRoom.id}`);
        ch.send({ type: 'broadcast', event: 'typing', payload: { sender_id: '' } });
      }
    }, 2000);
  };

  const sendMessage = async () => {
    if (!user || !selectedRoom || !newMessage.trim()) return;
    if (messagesLeft <= 0) {
      showToast('Daily limit reached. Read a Bible or Book instead!', 'warning');
      return;
    }
    setSendingMessage(true);
    const { error } = await supabase.from('messages').insert({
      room_id: selectedRoom.id,
      sender_id: user.id,
      content: newMessage.trim(),
      reply_to: replyTo?.id ?? null,
      is_read: false,
    });
    if (error) { showToast('Could not send message', 'error'); }
    else {
      setNewMessage('');
      setReplyTo(null);
      setShowEmoji(false);
      setMessagesToday((prev) => prev + 1);
    }
    setSendingMessage(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedRoom) return;
    if (file.size > MAX_FILE_SIZE) {
      showToast('Image must be under 5MB', 'error');
      return;
    }
    if (messagesLeft <= 0) {
      showToast('Daily limit reached. Read a Bible or Book instead!', 'warning');
      return;
    }
    setUploadProgress(0);
    try {
      const url = await uploadToCloudinary(file, 'image', (p) => setUploadProgress(p));
      const { error } = await supabase.from('messages').insert({
        room_id: selectedRoom.id,
        sender_id: user.id,
        content: '📷 Image',
        attachment_url: url,
        is_read: false,
      });
      if (error) throw error;
      setMessagesToday((prev) => prev + 1);
      showToast('Image sent!', 'success');
    } catch {
      showToast('Upload failed', 'error');
    }
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > MAX_FILE_SIZE) { showToast('Audio too large (5MB max)', 'error'); return; }
        if (messagesLeft <= 0) { showToast('Daily limit reached', 'warning'); return; }
        setUploadProgress(0);
        try {
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
          const url = await uploadToCloudinary(file, 'raw', (p) => setUploadProgress(p));
          const { error } = await supabase.from('messages').insert({
            room_id: selectedRoom!.id,
            sender_id: user!.id,
            content: '🎤 Voice message',
            attachment_url: url,
            is_read: false,
          });
          if (error) throw error;
          setMessagesToday((prev) => prev + 1);
          showToast('Voice message sent!', 'success');
        } catch { showToast('Voice upload failed', 'error'); }
        setUploadProgress(null);
      };
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      showToast('Microphone access denied', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const deleteMessage = async (msg: Message) => {
    if (msg.sender_id !== user?.id) return;
    await supabase.from('messages').delete().eq('id', msg.id);
    showToast('Message deleted', 'info');
  };

  const saveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    await supabase.from('messages').update({ content: editText.trim() }).eq('id', msgId);
    setEditingId(null); setEditText('');
    showToast('Message updated', 'success');
  };

  const createRoom = async () => {
    if (!user || !roomName.trim()) return;
    const { data, error } = await supabase.from('chat_rooms').insert({
      name: roomName.trim(), type: roomType, created_by: user.id,
      participants: [user.id], is_active: true,
    }).select().single();
    if (error) { showToast('Could not create room', 'error'); return; }
    setRooms((prev) => [...prev, data as ChatRoom]);
    setSelectedRoom(data as ChatRoom);
    setRoomName(''); setShowNewRoom(false);
    showToast('Room created!', 'success');
  };

  const joinRoom = (room: ChatRoom) => {
    if (!user) return;
    if (room.participants && !room.participants.includes(user.id)) {
      supabase.from('chat_rooms')
        .update({ participants: [...(room.participants || []), user.id] })
        .eq('id', room.id);
    }
    setSelectedRoom(room);
  };

  const startDirectChat = async (person: Profile) => {
    if (!user || !person.id || person.id === user.id || openingUserId) return;

    setOpeningUserId(person.id);
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

      let directRoom: ChatRoom | null = existingRoom || null;
      if (!directRoom) {
        const { data: createdRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert({
            name: 'Chat with ' + (person.username || 'user'),
            type: 'private',
            created_by: user.id,
            participants: [user.id, person.id],
            is_active: true,
          })
          .select()
          .single();
        if (createError) throw createError;
        directRoom = createdRoom as ChatRoom;
      }

      const roomToOpen = directRoom;
      setRooms((previous) => previous.some((room) => room.id === roomToOpen.id) ? previous : [...previous, roomToOpen]);
      setSelectedRoom(roomToOpen);
      setSelectedUser(null);
      setShowMobileChat(true);
    } catch {
      showToast('Could not start direct chat', 'error');
    } finally {
      setOpeningUserId(null);
    }
  };

  const filteredRooms = rooms.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()) ?? false);
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUsers = users.filter((person) => (person.username || '').toLowerCase().includes(normalizedUserSearch));
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <EmptyState icon={<MessageCircle className="h-8 w-8 text-primary-500" />} title="Sign In to Chat"
          description="Join our global community of believers. Sign in to start messaging, create groups, and connect with fellow Christians worldwide." />
      </div>
    );
  }

  if (error && !loading && rooms.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Chat</h2>
          <p className="text-slate-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <div className={`w-80 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary-600" /> Chat
            </h1>
            <button onClick={() => setShowNewRoom(!showNewRoom)} className="p-2 rounded-xl bg-primary-600 text-white hover:scale-105 transition-transform" title="Create new room">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rooms..." className="input-field pl-10 py-2 text-sm" />
          </div>
        </div>

        <AnimatePresence>
          {showNewRoom && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-slate-200 dark:border-slate-700">
              <div className="p-4 space-y-3">
                <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room name" className="input-field py-2 text-sm" />
                <div className="flex gap-2">
                  <button onClick={() => setRoomType('public')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${roomType === 'public' ? 'bg-primary-600 text-white' : 'glass'}`}>Public</button>
                  <button onClick={() => setRoomType('private')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${roomType === 'private' ? 'bg-primary-600 text-white' : 'glass'}`}>Private</button>
                </div>
                <button onClick={createRoom} className="btn-primary w-full py-2 text-sm">Create Room</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">{rooms.length === 0 ? 'No chat rooms yet. Create one!' : 'No rooms found'}</p>
            </div>
          ) : (
            filteredRooms.map((room) => (
              <button key={room.id} onClick={() => joinRoom(room)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left ${selectedRoom?.id === room.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center shrink-0">
                  {room.type === 'private' ? <Lock className="h-5 w-5 text-white" /> : <Hash className="h-5 w-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{room.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {room.participants?.length || 0} members
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary-600" /> People
            </h2>
            <span className="text-xs text-slate-500">{normalizedUserSearch ? filteredUsers.length + ' of ' + users.length : users.length}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search users..."
              className="input-field w-full py-2 pl-10 pr-10 text-sm transition-shadow focus:shadow-md"
              aria-label="Search users"
            />
            {userSearch && (
              <button
                type="button"
                onClick={() => setUserSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Clear user search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-3 max-h-56 overflow-y-auto scrollbar-thin">
            {loadingUsers ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-11 rounded-lg" />)}
              </div>
            ) : usersError ? (
              <p className="px-1 py-2 text-xs text-red-500">{usersError}</p>
            ) : filteredUsers.length === 0 ? (
              <p className="px-1 py-2 text-xs text-slate-500">{users.length === 0 ? 'No users found.' : 'No matching users.'}</p>
            ) : (
              <AnimatePresence initial={false}>
                <div className="space-y-1">
                  {filteredUsers.map((person) => (
                    <motion.button
                      key={person.id}
                      type="button"
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => setSelectedUser(person)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-slate-800"
                      aria-label="View user profile"
                    >
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-gold-500 text-xs font-bold text-white">
                          {(person.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{person.username || 'Unnamed user'}</span>
                      <span className="text-xs text-primary-600 dark:text-primary-400">View</span>
                    </motion.button>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedRoom ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <button onClick={() => setShowMobileChat(false)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center relative">
                {selectedRoom.type === 'private' ? <Lock className="h-5 w-5 text-white" /> : <Hash className="h-5 w-5 text-white" />}
              </div>
              <div className="flex-1">
                <h2 className="font-bold">{selectedRoom.name}</h2>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="flex items-center gap-1">
                    {onlineUsers.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                    {onlineUsers.length} online
                  </span>
                  <span className="mx-1">·</span>
                  <Users className="h-3 w-3" /> {selectedRoom.participants?.length || 0} members
                </p>
              </div>
            </div>

            {/* Daily limit banner */}
            <div className={`px-4 py-2 text-center text-xs font-medium transition-all ${messagesLeft <= 5 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              {messagesLeft <= 0 ? (
                <span className="flex items-center justify-center gap-2">
                  <BookOpen className="h-3 w-3" /> Daily limit reached — Read Bible or Book instead!
                </span>
              ) : (
                <span>{messagesToday} used, {messagesLeft} left today</span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const sender = msg.sender_id ? profiles[msg.sender_id] : null;
                  const isOwn = msg.sender_id === user.id;
                  const replyMsg = msg.reply_to ? messages.find((m) => m.id === msg.reply_to) : null;
                  const senderOnline = msg.sender_id ? onlineUsers.includes(msg.sender_id) : false;
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                          {sender?.avatar_url ? <img src={sender.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" /> : sender?.username?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        {senderOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950" />}
                      </div>
                      <div className={`max-w-[75%] group ${isOwn ? 'items-end' : ''}`}>
                        <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs font-semibold">{isOwn ? 'You' : sender?.username ?? 'Unknown'}</span>
                          <span className="text-xs text-slate-400">{formatTime(msg.created_at)}</span>
                        </div>
                        <div className={`rounded-2xl px-4 py-2 ${isOwn ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
                          {replyMsg && (
                            <div className={`text-xs mb-1 pb-1 border-b ${isOwn ? 'border-white/20' : 'border-slate-200 dark:border-slate-600'} opacity-70`}>
                              <Reply className="h-3 w-3 inline mr-1" />{replyMsg.content?.slice(0, 50)}
                            </div>
                          )}
                          {editingId === msg.id ? (
                            <div className="flex items-center gap-2">
                              <input value={editText} onChange={(e) => setEditText(e.target.value)} className="bg-white/20 rounded-lg px-2 py-1 text-sm flex-1 outline-none" autoFocus />
                              <button onClick={() => saveEdit(msg.id)} className="p-1 hover:bg-white/20 rounded"><Check className="h-3 w-3" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1 hover:bg-white/20 rounded"><X className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm">{msg.content}</p>
                              {msg.attachment_url && (
                                msg.content.includes('Image') ? (
                                  <img src={msg.attachment_url} alt="attachment" className="rounded-lg max-w-full max-h-48 mt-2" />
                                ) : msg.content.includes('Voice') ? (
                                  <audio controls src={msg.attachment_url} className="mt-2 w-full max-w-64" />
                                ) : (
                                  <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs underline">View attachment</a>
                                )
                              )}
                            </>
                          )}
                        </div>
                        {/* Read receipt */}
                        {isOwn && editingId !== msg.id && (
                          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                            {msg.is_read ? (
                              <span className="text-xs text-primary-500 flex items-center gap-0.5" title="Read">
                                <Check className="h-3 w-3" /><Check className="h-3 w-3 -ml-1.5" />
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 flex items-center" title="Sent">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        )}
                        {/* Actions */}
                        {isOwn && editingId !== msg.id && (
                          <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'justify-end' : ''}`}>
                            <button onClick={() => setReplyTo(msg)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Reply"><Reply className="h-3 w-3 text-slate-400" /></button>
                            <button onClick={() => { setEditingId(msg.id); setEditText(msg.content); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit"><Edit2 className="h-3 w-3 text-slate-400" /></button>
                            <button onClick={() => deleteMessage(msg)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Delete"><Trash2 className="h-3 w-3 text-slate-400" /></button>
                          </div>
                        )}
                        {!isOwn && (
                          <button onClick={() => setReplyTo(msg)} className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Reply className="h-3 w-3 text-slate-400" /></button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 px-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        className="w-2 h-2 rounded-full bg-slate-400" />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">
                    {typingUsers.map((id) => profiles[id]?.username ?? 'Someone').join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <Loader className="h-3 w-3 animate-spin text-primary-500" />
                  <span className="text-xs text-primary-600 dark:text-primary-400">Uploading... {uploadProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-gold-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Recording... {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}</span>
                </div>
                <button onClick={stopRecording} className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600">
                  <Square className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Reply preview */}
            {replyTo && (
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="text-xs flex items-center gap-2"><Reply className="h-3 w-3" /><span className="text-slate-500">Replying to: {replyTo.content?.slice(0, 40)}</span></div>
                <button onClick={() => setReplyTo(null)} className="p-1"><X className="h-3 w-3" /></button>
              </div>
            )}

            {/* Emoji picker */}
            <AnimatePresence>
              {showEmoji && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <div className="p-3 flex flex-wrap gap-1">
                    {EMOJIS.map((e, i) => (
                      <button key={i} onClick={() => { setNewMessage((prev) => prev + e); setShowEmoji(false); }} className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xl transition-transform hover:scale-125">{e}</button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Emoji"><Smile className="h-5 w-5 text-slate-400" /></button>
                <button onClick={() => fileInputRef.current?.click()} disabled={messagesLeft <= 0} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50" title="Send image"><ImageIcon className="h-5 w-5 text-slate-400" /></button>
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept="image/*" />
                <input value={newMessage} onChange={onInputChange}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={messagesLeft <= 0 ? 'Daily limit reached' : 'Type a message...'}
                  className="flex-1 input-field py-2.5" disabled={sendingMessage || messagesLeft <= 0} />
                <button onClick={isRecording ? stopRecording : startRecording}
                  disabled={messagesLeft <= 0}
                  className={`p-2.5 rounded-xl transition-colors disabled:opacity-50 ${isRecording ? 'bg-red-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  title={isRecording ? 'Stop recording' : 'Voice message'}>
                  {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5 text-slate-400" />}
                </button>
                <button onClick={sendMessage} disabled={!newMessage.trim() || sendingMessage || messagesLeft <= 0}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white disabled:opacity-50 hover:scale-105 transition-transform">
                  {sendingMessage ? <Loader className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={<MessageCircle className="h-8 w-8 text-primary-500" />} title="Select a Chat Room" description="Choose a room from the sidebar to start chatting with the community." />
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-label={selectedUser.username || 'User profile'}
              className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <h2 className="text-lg font-bold">User profile</h2>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Close user profile"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 text-center">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" className="mx-auto h-24 w-24 rounded-full object-cover ring-4 ring-primary-100 dark:ring-primary-900/40" />
                ) : (
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-gold-500 text-3xl font-bold text-white">
                    {(selectedUser.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="mt-4 text-xl font-bold">{selectedUser.username || 'Unnamed user'}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Community member</p>
                <button
                  type="button"
                  onClick={() => void startDirectChat(selectedUser)}
                  disabled={openingUserId === selectedUser.id}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70"
                >
                  {openingUserId === selectedUser.id ? <Loader className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  {openingUserId === selectedUser.id ? 'Opening chat...' : 'Start chat'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
