import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, uploadToCloudinary } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { filterText } from '@/lib/profanityFilter';
import type { ChatRoom, Message, Profile } from '@/types';
import {
  MessageCircle, Send, Plus, Users, Hash, Lock, Search, Smile,
  Image as ImageIcon, Reply, Trash2, Edit2, X, ArrowLeft, Check,
  AlertCircle, Loader, Mic, Square, BookOpen, Library, UserPlus, UserMinus, Settings,
  ArrowLeft as BackIcon, Circle, User as UserIcon,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';

const EMOJIS = ['😀', '😂', '❤️', '🙏', '🙌', '✨', '🔥', '👏', '😍', '🥰', '😇', '🕊️', '✝️', '📖', '⛪', '🎵', '💪', '🌟', '💙', '🙌'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DAILY_MESSAGE_LIMIT = 50;

type SidebarTab = 'rooms' | 'users';

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
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<Profile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [messagesToday, setMessagesToday] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [groupUserSearch, setGroupUserSearch] = useState('');
  const [groupUserResults, setGroupUserResults] = useState<Profile[]>([]);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<Profile[]>([]);
  const [roomParticipants, setRoomParticipants] = useState<Profile[]>([]);

  // New state for user list and profile panel
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('rooms');
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<Profile | null>(null);
  const [globalOnlineIds, setGlobalOnlineIds] = useState<string[]>([]);

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
      if (!user) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('is_active', true)
          .or(`type.eq.public,participants.cs.{${user.id}}`)
          .order('created_at', { ascending: true });
        if (error) { setError(error.message); setLoading(false); return; }
        setRooms((data as ChatRoom[]) ?? []);
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    };
    fetchRooms();
  }, [user]);

  // Fetch all users for the user list tab
  const fetchAllUsers = useCallback(async () => {
    if (!user) return;
    setLoadingUsers(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('username', { ascending: true });
    setAllUsers((data as Profile[]) ?? []);
    setLoadingUsers(false);
  }, [user]);

  useEffect(() => {
    if (sidebarTab === 'users' && user) {
      fetchAllUsers();
    }
  }, [sidebarTab, user, fetchAllUsers]);

  // Global presence channel for user list online status
  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel('global-presence');

    presenceChannel
      .on('broadcast', { event: 'presence' }, (payload) => {
        const userId = payload.payload?.user_id as string;
        const isOnline = payload.payload?.online as boolean;
        if (userId) {
          setGlobalOnlineIds((prev) =>
            isOnline ? (prev.includes(userId) ? prev : [...prev, userId]) : prev.filter((id) => id !== userId)
          );
        }
      })
      .subscribe();

    presenceChannel.send({ type: 'broadcast', event: 'presence', payload: { user_id: user.id, online: true } });

    const handleUnload = () => {
      presenceChannel.send({ type: 'broadcast', event: 'presence', payload: { user_id: user.id, online: false } });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      presenceChannel.send({ type: 'broadcast', event: 'presence', payload: { user_id: user.id, online: false } });
      supabase.removeChannel(presenceChannel);
      window.removeEventListener('beforeunload', handleUnload);
    };
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
    const msgResult = filterText(newMessage);
    if (msgResult.blocked) {
      showToast('Please keep it respectful', 'warning');
      return;
    }
    if (msgResult.hasProfanity) {
      showToast('Please keep it respectful', 'warning');
    }
    setSendingMessage(true);
    const { error } = await supabase.from('messages').insert({
      room_id: selectedRoom.id,
      sender_id: user.id,
      content: msgResult.cleaned.trim(),
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
    const editResult = filterText(editText);
    if (editResult.blocked) {
      showToast('Please keep it respectful', 'warning');
      return;
    }
    if (editResult.hasProfanity) {
      showToast('Please keep it respectful', 'warning');
    }
    await supabase.from('messages').update({ content: editResult.cleaned.trim() }).eq('id', msgId);
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

  // Hide orphaned rooms (participants < 2) — only show rooms with 2+ participants
  const visibleRooms = rooms.filter((r) => (r.participants?.length ?? 0) >= 2);
  const filteredRooms = visibleRooms.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()) ?? false);

  // Search users by username from profiles table
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return; }
    setSearchingUsers(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${userSearch.trim()}%`)
        .limit(10);
      setUserResults((data as Profile[]) ?? []);
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  // Find or create a 1-to-1 room with exactly 2 participants
  const startDirectChat = async (otherUser: Profile) => {
    if (!user) return;

    // Check if a 1-to-1 room already exists with exactly these two participants
    const { data: existingRooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('type', 'private')
      .eq('is_active', true)
      .contains('participants', [user.id, otherUser.id]);

    const existingDirect = (existingRooms as ChatRoom[])?.find(
      (r) =>
        r.participants?.length === 2 &&
        r.participants.includes(user.id) &&
        r.participants.includes(otherUser.id)
    );

    if (existingDirect) {
      setSelectedRoom(existingDirect);
      setSelectedUserProfile(null);
      setSidebarTab('rooms');
      showToast(`Chat with ${otherUser.username ?? 'user'} opened!`, 'success');
      return;
    }

    // Create new 1-to-1 room
    const roomName = `${profile?.username ?? 'Me'} & ${otherUser.username ?? 'User'}`;
    const { data, error } = await supabase.from('chat_rooms').insert({
      name: roomName,
      type: 'private',
      created_by: user.id,
      participants: [user.id, otherUser.id],
      is_active: true,
    }).select().single();
    if (error) { showToast('Could not create chat', 'error'); return; }
    setRooms((prev) => [...prev, data as ChatRoom]);
    setSelectedRoom(data as ChatRoom);
    setSelectedUserProfile(null);
    setSidebarTab('rooms');
    showToast(`Private chat with ${otherUser.username ?? 'user'} started!`, 'success');
  };

  const startPrivateChat = async (otherUser: Profile) => {
    await startDirectChat(otherUser);
    setUserSearch('');
    setUserResults([]);
  };

  // Search users for group creation
  useEffect(() => {
    if (!groupUserSearch.trim()) { setGroupUserResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${groupUserSearch.trim()}%`)
        .limit(10);
      setGroupUserResults((data as Profile[]) ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [groupUserSearch]);

  const toggleGroupMember = (p: Profile) => {
    setGroupMembers((prev) =>
      prev.some((m) => m.id === p.id)
        ? prev.filter((m) => m.id !== p.id)
        : [...prev, p]
    );
  };

  const createGroupChat = async () => {
    if (!user || !groupName.trim() || groupMembers.length === 0) return;
    const participantIds = [user.id, ...groupMembers.map((m) => m.id)];
    const { data, error } = await supabase.from('chat_rooms').insert({
      name: groupName.trim(),
      type: 'private',
      created_by: user.id,
      participants: participantIds,
      is_active: true,
    }).select().single();
    if (error) { showToast('Could not create group', 'error'); return; }
    setRooms((prev) => [...prev, data as ChatRoom]);
    setSelectedRoom(data as ChatRoom);
    setGroupName('');
    setGroupMembers([]);
    setGroupUserSearch('');
    setGroupUserResults([]);
    setShowCreateGroup(false);
    showToast(`Group "${groupName.trim()}" created!`, 'success');
  };

  const resetGroupForm = () => {
    setGroupName('');
    setGroupMembers([]);
    setGroupUserSearch('');
    setGroupUserResults([]);
    setShowCreateGroup(false);
  };

  // Load participants for selected room
  useEffect(() => {
    if (!selectedRoom?.participants || selectedRoom.type !== 'private') {
      setRoomParticipants([]);
      return;
    }
    const ids = selectedRoom.participants.filter((id) => id !== user?.id);
    if (ids.length === 0) { setRoomParticipants([]); return; }
    supabase.from('profiles').select('*').in('id', ids).then(({ data }) => {
      setRoomParticipants((data as Profile[]) ?? []);
    });
  }, [selectedRoom, user]);

  // Search users for member management
  useEffect(() => {
    if (!memberSearch.trim()) { setMemberResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${memberSearch.trim()}%`)
        .limit(10);
      setMemberResults((data as Profile[]) ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [memberSearch]);

  const addMember = async (p: Profile) => {
    if (!selectedRoom || !user || !selectedRoom.participants) return;
    if (selectedRoom.participants.includes(p.id)) return;
    const updated = [...selectedRoom.participants, p.id];
    const { error } = await supabase.from('chat_rooms')
      .update({ participants: updated }).eq('id', selectedRoom.id);
    if (error) { showToast('Could not add member', 'error'); return; }
    setSelectedRoom({ ...selectedRoom, participants: updated });
    setRoomParticipants((prev) => [...prev, p]);
    setMemberSearch('');
    setMemberResults([]);
    showToast(`${p.username ?? 'User'} added to group`, 'success');
  };

  const removeMember = async (p: Profile) => {
    if (!selectedRoom || !user || !selectedRoom.participants) return;
    if (p.id === user.id) return;
    const updated = selectedRoom.participants.filter((id) => id !== p.id);
    const { error } = await supabase.from('chat_rooms')
      .update({ participants: updated }).eq('id', selectedRoom.id);
    if (error) { showToast('Could not remove member', 'error'); return; }
    setSelectedRoom({ ...selectedRoom, participants: updated });
    setRoomParticipants((prev) => prev.filter((m) => m.id !== p.id));
    showToast(`${p.username ?? 'User'} removed from group`, 'info');
  };

  const isRoomAdmin = selectedRoom?.created_by === user?.id;
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleUserClick = (p: Profile) => {
    setSelectedUserProfile(p);
  };

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
        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSidebarTab('rooms')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'rooms' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Hash className="h-4 w-4" /> Rooms
          </button>
          <button
            onClick={() => setSidebarTab('users')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'users' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Users className="h-4 w-4" /> Users
          </button>
        </div>

        {/* User profile panel overlay */}
        <AnimatePresence>
          {selectedUserProfile && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="absolute inset-0 z-20 bg-white dark:bg-slate-900 flex flex-col"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <button onClick={() => setSelectedUserProfile(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold">User Profile</span>
              </div>
              <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto scrollbar-thin">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-3xl font-bold overflow-hidden mb-4">
                  {selectedUserProfile.avatar_url ? (
                    <img src={selectedUserProfile.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    selectedUserProfile.username?.charAt(0).toUpperCase() ?? '?'
                  )}
                </div>
                <h2 className="text-xl font-bold mb-1">{selectedUserProfile.username ?? 'Unknown'}</h2>
                <div className="flex items-center gap-1.5 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${globalOnlineIds.includes(selectedUserProfile.id) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span className="text-xs font-medium text-slate-500">
                    {globalOnlineIds.includes(selectedUserProfile.id) ? 'Online' : 'Offline'}
                  </span>
                </div>
                {selectedUserProfile.bio ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6 max-w-xs">{selectedUserProfile.bio}</p>
                ) : (
                  <p className="text-sm text-slate-400 text-center mb-6 max-w-xs italic">No bio yet</p>
                )}
                <button
                  onClick={() => startDirectChat(selectedUserProfile)}
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" /> Send Message
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {sidebarTab === 'rooms' && (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary-600" /> Chat
                </h1>
                <button onClick={() => setShowNewRoom(!showNewRoom)} className="p-2 rounded-xl bg-primary-600 text-white hover:scale-105 transition-transform" title="Create new room">
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={() => setShowCreateGroup(true)} className="p-2 rounded-xl bg-gold-500 text-white hover:scale-105 transition-transform" title="Create group chat">
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rooms..." className="input-field pl-10 py-2 text-sm" />
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users to chat..." className="input-field pl-10 py-2 text-sm" />
              </div>
              {userResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                  {userResults.map((u) => (
                    <button key={u.id} onClick={() => startPrivateChat(u)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" /> : u.username?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm font-medium truncate">{u.username ?? 'Unknown'}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchingUsers && <p className="text-xs text-slate-400 mt-1 px-2">Searching...</p>}
            </div>

            <AnimatePresence>
              {showCreateGroup && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-slate-200 dark:border-slate-700">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Create Group Chat</span>
                      <button onClick={resetGroupForm} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
                    </div>
                    <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="input-field py-2 text-sm" />
                    {groupMembers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {groupMembers.map((m) => (
                          <span key={m.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-xs font-medium">
                            {m.username ?? 'Unknown'}
                            <button onClick={() => toggleGroupMember(m)} className="text-slate-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input value={groupUserSearch} onChange={(e) => setGroupUserSearch(e.target.value)} placeholder="Search users to add..." className="input-field pl-10 py-2 text-sm" />
                    </div>
                    {groupUserResults.length > 0 && (
                      <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                        {groupUserResults
                          .filter((u) => !groupMembers.some((m) => m.id === u.id) && u.id !== user?.id)
                          .map((u) => (
                            <button key={u.id} onClick={() => toggleGroupMember(u)}
                              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                                {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" /> : u.username?.charAt(0).toUpperCase() ?? '?'}
                              </div>
                              <span className="text-sm font-medium truncate">{u.username ?? 'Unknown'}</span>
                              <Plus className="h-3 w-3 text-primary-500 ml-auto" />
                            </button>
                          ))}
                      </div>
                    )}
                    <button onClick={createGroupChat} disabled={!groupName.trim() || groupMembers.length === 0} className="btn-primary w-full py-2 text-sm disabled:opacity-50">Create Group ({groupMembers.length + 1} members)</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                  <p className="text-slate-500 text-sm">{visibleRooms.length === 0 ? 'No chat rooms yet. Create one!' : 'No rooms found'}</p>
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
          </>
        )}

        {sidebarTab === 'users' && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h1 className="text-xl font-bold flex items-center gap-2 mb-1">
                <Users className="h-5 w-5 text-primary-600" /> All Users
              </h1>
              <p className="text-xs text-slate-500">Tap a user to view their profile and send a message</p>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {loadingUsers ? (
                <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <UserIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No other users yet</p>
                </div>
              ) : (
                allUsers.map((u) => {
                  const isOnline = globalOnlineIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleUserClick(u)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                          {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" /> : u.username?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{u.username ?? 'Unknown'}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Circle className={`h-2 w-2 ${isOnline ? 'text-emerald-500 fill-emerald-500' : 'text-slate-400 fill-slate-400'}`} />
                          {isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
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
                  {selectedRoom.type === 'private' && isRoomAdmin && selectedRoom.participants.length > 2 && (
                    <>
                      <span className="mx-1">·</span>
                      <button onClick={() => setShowManageMembers(!showManageMembers)} className="text-primary-500 hover:text-primary-600 font-medium flex items-center gap-0.5">
                        <Settings className="h-3 w-3" /> Manage
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Member management panel */}
            <AnimatePresence>
              {showManageMembers && selectedRoom.type === 'private' && isRoomAdmin && selectedRoom.participants.length > 2 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Manage Members</span>
                      <button onClick={() => setShowManageMembers(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button>
                    </div>
                    {/* Current members */}
                    <div className="space-y-1">
                      {roomParticipants.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-700">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                            {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" /> : p.username?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <span className="text-sm font-medium flex-1 truncate">{p.username ?? 'Unknown'}</span>
                          <button onClick={() => removeMember(p)} className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove member">
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-700">
                        <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{profile?.username?.charAt(0).toUpperCase() ?? 'Y'}</div>
                        <span className="text-sm font-medium flex-1 truncate">{profile?.username ?? 'You'} (Admin)</span>
                      </div>
                    </div>
                    {/* Add members */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search users to add..." className="input-field pl-10 py-2 text-sm" />
                    </div>
                    {memberResults.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                        {memberResults
                          .filter((u) => !selectedRoom.participants?.includes(u.id))
                          .map((u) => (
                            <button key={u.id} onClick={() => addMember(u)}
                              className="w-full flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                                {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" /> : u.username?.charAt(0).toUpperCase() ?? '?'}
                              </div>
                              <span className="text-sm font-medium truncate">{u.username ?? 'Unknown'}</span>
                              <UserPlus className="h-4 w-4 text-primary-500 ml-auto" />
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
    </div>
  );
}
