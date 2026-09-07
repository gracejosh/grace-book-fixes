import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, Radio, AlertCircle,
  Loader, ArrowLeft, Users, Eye,
} from 'lucide-react';
import {
  MeetingProvider, useMeeting, VideoPlayer,
} from '@videosdk.live/react-sdk';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/ui';

const VIDEOSDK_API_KEY = '552a12a6-b1d6-4f08-8e11-35e230feb9cb';
const VIDEOSDK_SECRET = 'f33a14df787965f1968c1beb9ab108a583ddca1aede08b77316f22357babc2d7';

function base64UrlEncodeString(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateVideoSDKToken(): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    apikey: VIDEOSDK_API_KEY,
    permissions: ['allow_join'],
    iat: now,
    exp: now + 86400,
  };

  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const CryptoJS = (window as any).CryptoJS;
  const signature = CryptoJS.HmacSHA256(signingInput, VIDEOSDK_SECRET);
  const sigB64 = CryptoJS.enc.Base64.stringify(signature)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

function generateRoomId(): string {
  return 'room-' + crypto.randomUUID();
}

async function createMeeting(token: string, customRoomId: string): Promise<{ roomId: string } | { error: string }> {
  try {
    const res = await fetch('https://api.videosdk.live/v2/rooms', {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ customRoomId }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      console.error('VideoSDK create room failed:', data);
      return { error: msg };
    }
    if (!data?.roomId) {
      console.error('VideoSDK response missing roomId:', data);
      return { error: 'No roomId in response' };
    }
    return { roomId: data.roomId };
  } catch (error) {
    console.error('VideoSDK create room error:', error);
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export default function Live() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const isHost = searchParams.get('host') === 'true';

  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Pre-join preview state
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Request camera permission and get preview stream
  const requestCamera = useCallback(async () => {
    setRequestingPermission(true);
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setPreviewStream(stream);
      setCamOn(true);
    } catch (err) {
      setCamOn(false);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setPermissionError('No camera found on this device.');
      } else {
        setPermissionError('Could not access camera.');
      }
    } finally {
      setRequestingPermission(false);
    }
  }, []);

  // Request microphone permission
  const requestMic = useCallback(async () => {
    if (!micOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setMicOn(true);
      } catch {
        setPermissionError('Microphone permission denied.');
        setMicOn(false);
      }
    } else {
      setMicOn(false);
    }
  }, [micOn]);

  // Toggle camera on/off in preview
  const toggleCamera = useCallback(async () => {
    if (camOn) {
      previewStream?.getVideoTracks().forEach((t) => (t.enabled = false));
      setCamOn(false);
    } else {
      if (!previewStream) {
        await requestCamera();
      } else {
        previewStream.getVideoTracks().forEach((t) => (t.enabled = true));
        setCamOn(true);
      }
    }
  }, [camOn, previewStream, requestCamera]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Auto-request camera on mount for host
  useEffect(() => {
    if (isHost) requestCamera();
  }, [isHost, requestCamera]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      previewStream?.getTracks().forEach((t) => t.stop());
    };
  }, [previewStream]);

  const [videosdkToken, setVideosdkToken] = useState<string | null>(null);

  const startBroadcast = async () => {
    setCreating(true);
    try {
      const token = generateVideoSDKToken();
      setVideosdkToken(token);
      const customRoomId = generateRoomId();
      const result = await createMeeting(token, customRoomId);
      if ('roomId' in result) {
        setMeetingId(result.roomId);
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('startBroadcast error:', error);
      showToast('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
    setCreating(false);
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <EmptyState
          icon={<Radio className="h-8 w-8 text-primary-500" />}
          title="Sign In to Go Live"
          description="Sign in to start broadcasting or join a live session."
        />
      </div>
    );
  }

  // If meetingId is set and we have a token, render the meeting view
  if (meetingId && videosdkToken) {
    return (
      <MeetingProvider
        config={{
          meetingId,
          name: user.email ?? 'Host',
          micEnabled: micOn,
          webcamEnabled: camOn,
          mode: 'SEND_AND_RECV',
          debugMode: false,
        }}
        token={videosdkToken}
      >
        <BroadcastView
          camOn={camOn}
          micOn={micOn}
          onLeave={() => {
            setMeetingId(null);
            previewStream?.getVideoTracks().forEach((t) => (t.enabled = true));
          }}
        />
      </MeetingProvider>
    );
  }

  if (!isHost) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-md">
          <Radio className="h-12 w-12 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Active Broadcast</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            There are no live broadcasts right now. Check back later or start your own.
          </p>
          <Link to="/live?host=true" className="btn-primary">
            <Radio className="h-4 w-4" /> Start Broadcasting
          </Link>
        </div>
      </div>
    );
  }

  // Host pre-join preview screen
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Start Broadcast</h1>
        </div>

        {/* Camera preview */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 mb-4">
          {camOn && previewStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              {requestingPermission ? (
                <>
                  <Loader className="h-10 w-10 animate-spin mb-3" />
                  <p className="text-sm">Requesting camera access...</p>
                </>
              ) : (
                <>
                  <VideoOff className="h-12 w-12 mb-3" />
                  <p className="text-sm mb-3">Camera is off</p>
                  <button onClick={requestCamera} className="btn-primary text-sm">
                    <Video className="h-4 w-4" /> Enable Camera
                  </button>
                </>
              )}
            </div>
          )}

          {/* Live badge overlay */}
          {camOn && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              PREVIEW
            </div>
          )}
        </div>

        {/* Permission error */}
        <AnimatePresence>
          {permissionError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm mb-4"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{permissionError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={toggleCamera}
            className={`flex flex-col items-center gap-1.5 px-6 py-3 rounded-xl font-medium transition-all ${
              camOn
                ? 'bg-primary-600 text-white'
                : 'glass hover:scale-105'
            }`}
          >
            {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            <span className="text-xs">Camera</span>
          </button>
          <button
            onClick={requestMic}
            className={`flex flex-col items-center gap-1.5 px-6 py-3 rounded-xl font-medium transition-all ${
              micOn
                ? 'bg-primary-600 text-white'
                : 'glass hover:scale-105'
            }`}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            <span className="text-xs">Microphone</span>
          </button>
        </div>

        {/* Start broadcast button */}
        <button
          onClick={startBroadcast}
          disabled={creating || (!camOn && !micOn)}
          className="w-full btn-primary py-3.5 text-base font-semibold disabled:opacity-50"
        >
          {creating ? (
            <><Loader className="h-5 w-5 animate-spin" /> Creating broadcast...</>
          ) : (
            <><Radio className="h-5 w-5" /> Start Broadcast</>
          )}
        </button>


      </div>
    </div>
  );
}

function BroadcastView({
  camOn, micOn, onLeave,
}: {
  camOn: boolean;
  micOn: boolean;
  onLeave: () => void;
}) {
  const { join, leave, toggleWebcam, toggleMic, webcamOn, micOn: meetingMicOn, participants, localParticipant } = useMeeting();
  const [joined, setJoined] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    join().then(() => setJoined(true));
  }, [join]);

  const participantIds = [...participants.keys()];
  const localId = localParticipant?.id;

  const handleLeave = () => {
    leave();
    onLeave();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
          <span className="text-sm text-slate-300 flex items-center gap-1">
            <Eye className="h-4 w-4" /> {viewerCount} viewers
          </span>
        </div>
        <button
          onClick={handleLeave}
          className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
        >
          End Broadcast
        </button>
      </div>

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {!joined ? (
          <div className="text-center">
            <Loader className="h-10 w-10 animate-spin text-primary-500 mx-auto mb-3" />
            <p className="text-slate-400">Joining broadcast...</p>
          </div>
        ) : (
          <div className="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative">
            {localId && webcamOn ? (
              <VideoPlayer
                participantId={localId}
                containerStyle={{ width: '100%', height: '100%', borderRadius: '1rem' }}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <VideoOff className="h-12 w-12 mb-3" />
                <p className="text-sm">Camera is off</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-slate-900 border-t border-slate-800">
        <button
          onClick={() => toggleWebcam()}
          className={`flex flex-col items-center gap-1 px-6 py-3 rounded-xl font-medium transition-all ${
            webcamOn ? 'bg-primary-600 text-white' : 'glass'
          }`}
        >
          {webcamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          <span className="text-xs">Camera</span>
        </button>
        <button
          onClick={() => toggleMic()}
          className={`flex flex-col items-center gap-1 px-6 py-3 rounded-xl font-medium transition-all ${
            meetingMicOn ? 'bg-primary-600 text-white' : 'glass'
          }`}
        >
          {meetingMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          <span className="text-xs">Microphone</span>
        </button>
      </div>
    </div>
  );
}
