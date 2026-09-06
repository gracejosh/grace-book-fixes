import { useEffect, useMemo, useRef, useState } from 'react';
import { MeetingProvider, useMeeting, useParticipant } from '@videosdk.live/react-sdk';
import { Realtime } from 'ably';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, CameraOff, LogIn, LogOut, MessageCircle, Mic, MicOff, Send, Users, Video } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { LiveChatMessage } from '@/types';

const VIDEO_SDK_TOKEN = import.meta.env.VITE_VIDEOSDK_TOKEN as string | undefined;
const VIDEO_SDK_API_KEY = import.meta.env.VITE_VIDEOSDK_API_KEY as string | undefined;
const ABLY_API_KEY = import.meta.env.VITE_ABLY_API_KEY as string | undefined;
const DEFAULT_MEETING_ID = 'grace-book-live';

function ParticipantVideo({ participantId, featured = false }: { participantId: string; featured?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { displayName, webcamStream, webcamOn, micOn } = useParticipant(participantId);

  useEffect(() => {
    if (!videoRef.current || !webcamStream) return;
    const mediaStream = new MediaStream();
    mediaStream.addTrack(webcamStream.track);
    videoRef.current.srcObject = mediaStream;
    void videoRef.current.play().catch(() => undefined);
  }, [webcamStream]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900 ${featured ? 'aspect-video' : 'aspect-video'}`}>
      {webcamOn && webcamStream ? <video ref={videoRef} muted playsInline className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Video className="h-10 w-10 text-slate-600" /></div>}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-white">
        <span className="truncate text-sm font-semibold">{displayName || 'Guest'}</span>
        <span className="flex items-center gap-1 text-xs text-white/80">{micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}</span>
      </div>
    </div>
  );
}

function LiveRoom({ meetingId, isHost, displayName }: { meetingId: string; isHost: boolean; displayName: string }) {
  const { participants, join, leave, toggleMic, toggleWebcam, localWebcamOn, localMicOn, isMeetingJoined } = useMeeting();
  const participantIds = useMemo(() => Array.from(participants.keys()), [participants]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [chatReady, setChatReady] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const ablyRef = useRef<Realtime | null>(null);
  const channelName = `grace-book-live:${meetingId}`;

  useEffect(() => {
    if (!ABLY_API_KEY) {
      setChatError('Add the Ably key to enable live chat.');
      return undefined;
    }
    const client = new Realtime({ key: ABLY_API_KEY, clientId: `viewer-${crypto.randomUUID()}` });
    const channel = client.channels.get(channelName);
    const receiveMessage = (incoming: { data: unknown }) => {
      const data = incoming.data as LiveChatMessage;
      if (data && typeof data.text === 'string') setChatMessages((current) => [...current, data]);
    };
    channel.subscribe('message', receiveMessage).then(() => setChatReady(true)).catch(() => setChatError('Chat is temporarily unavailable.'));
    ablyRef.current = client;
    return () => {
      void channel.unsubscribe('message', receiveMessage);
      void client.close();
      ablyRef.current = null;
    };
  }, [channelName]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || !ablyRef.current) return;
    const chatMessage: LiveChatMessage = { id: crypto.randomUUID(), text, author: displayName, createdAt: new Date().toISOString() };
    await ablyRef.current.channels.get(channelName).publish('message', chatMessage);
    setMessage('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Live now</div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Grace Book Live</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Gather together, worship together, grow together.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm dark:bg-slate-800"><Users className="h-4 w-4 text-primary-600" /> {participants.size} watching</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          {participantIds.length > 0 ? <ParticipantVideo participantId={participantIds[0]} featured /> : <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-900 text-center text-slate-400"><div><Video className="mx-auto mb-3 h-12 w-12 text-slate-600" /><p>Waiting for the host to start the broadcast.</p></div></div>}
          {participantIds.length > 1 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{participantIds.slice(1).map((id) => <ParticipantVideo key={id} participantId={id} />)}</div>}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            {!isMeetingJoined ? <button onClick={() => void join()} className="btn-primary"><LogIn className="h-4 w-4" /> Join broadcast</button> : <button onClick={() => void leave()} className="btn-ghost"><LogOut className="h-4 w-4" /> Leave</button>}
            {isMeetingJoined && <><button onClick={() => void toggleWebcam()} className="btn-ghost px-4" aria-label={localWebcamOn ? 'Turn camera off' : 'Turn camera on'}>{localWebcamOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}</button><button onClick={() => void toggleMic()} className="btn-ghost px-4" aria-label={localMicOn ? 'Mute microphone' : 'Unmute microphone'}>{localMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button></>}
            {isHost && <span className="ml-auto rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-800 dark:bg-gold-900/30 dark:text-gold-300">Host controls</span>}
          </div>
        </section>
        <aside className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700"><MessageCircle className="h-5 w-5 text-primary-600" /><div><h2 className="font-bold">Live chat</h2><p className="text-xs text-slate-500">Encourage one another</p></div></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">{chatMessages.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500"><MessageCircle className="mb-3 h-10 w-10 text-slate-300" /><p>Be the first to say hello.</p></div> : chatMessages.map((chat) => <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} key={chat.id}><p className="text-xs font-semibold text-primary-600 dark:text-primary-400">{chat.author}</p><p className="text-sm text-slate-700 dark:text-slate-200">{chat.text}</p></motion.div>)}<div ref={chatEndRef} /></div>
          <div className="border-t border-slate-200 p-3 dark:border-slate-700"><div className="flex gap-2"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void sendMessage(); }} disabled={!chatReady} placeholder={chatError || 'Share a message...'} className="input-field py-2.5" maxLength={500} /><button onClick={() => void sendMessage()} disabled={!chatReady || !message.trim()} className="rounded-xl bg-primary-600 px-3 text-white transition hover:bg-primary-700 disabled:opacity-50"><Send className="h-4 w-4" /></button></div></div>
        </aside>
      </div>
    </div>
  );
}

export default function Live() {
  const { user, profile } = useAuth();
  const [meetingId, setMeetingId] = useState(() => new URLSearchParams(window.location.search).get('meeting') || DEFAULT_MEETING_ID);
  const [name, setName] = useState(profile?.username || user?.email?.split('@')[0] || 'Guest');
  const [joined, setJoined] = useState(false);
  const isHost = new URLSearchParams(window.location.search).get('host') === 'true';
  const ready = Boolean(VIDEO_SDK_API_KEY && VIDEO_SDK_TOKEN);

  if (!ready) return <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4"><div className="glass-card w-full p-8 text-center"><Video className="mx-auto mb-4 h-12 w-12 text-primary-600" /><h1 className="mb-2 text-2xl font-bold">Live broadcast setup needed</h1><p className="text-slate-500 dark:text-slate-400">Add the VideoSDK key and token to connect this room.</p></div></div>;
  if (!joined) return <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4"><div className="glass-card w-full p-8"><div className="mb-6 text-center"><Video className="mx-auto mb-4 h-12 w-12 text-primary-600" /><h1 className="text-3xl font-bold">Join Grace Book Live</h1><p className="mt-2 text-slate-500 dark:text-slate-400">Watch the broadcast and join the conversation.</p></div><label className="mb-2 block text-sm font-semibold">Your name<input value={name} onChange={(event) => setName(event.target.value)} className="input-field mt-2" maxLength={60} /></label><label className="mb-5 block text-sm font-semibold">Meeting ID<input value={meetingId} onChange={(event) => setMeetingId(event.target.value)} className="input-field mt-2" /></label><button onClick={() => { if (name.trim() && meetingId.trim()) setJoined(true); }} disabled={!name.trim() || !meetingId.trim()} className="btn-primary w-full"><LogIn className="h-4 w-4" /> Enter live room</button><p className="mt-4 text-center text-xs text-slate-500">Hosts can share this page with <Link to="/live?host=true" className="font-semibold text-primary-600">host mode</Link>.</p></div></div>;

  return <MeetingProvider config={{ meetingId, name: name.trim(), micEnabled: isHost, webcamEnabled: isHost, mode: isHost ? 'SEND_AND_RECV' : 'RECV_ONLY', debugMode: false }} token={VIDEO_SDK_TOKEN} joinWithoutUserInteraction><LiveRoom meetingId={meetingId} isHost={isHost} displayName={name.trim()} /></MeetingProvider>;
}
