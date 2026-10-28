"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Users,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Radio,
  Send,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  CircleDot,
  Pin,
  PinOff,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { MeetingRecorder, type RecorderState } from "@/lib/recording/meeting-recorder";
import {
  playUserJoinSound,
  playUserLeaveSound,
  playScreenShareStartSound,
  playScreenShareStopSound,
  playMessageSentSound,
  playMessageReceivedSound,
  playToggleMuteSound,
  isSoundEffectsEnabled,
  setSoundEffectsEnabled,
} from "@/lib/audio/sound-effects";
import {
  Room,
  RoomEvent,
  VideoPresets,
  createLocalTracks,
  LocalTrack,
  RemoteParticipant,
  ParticipantEvent,
  Track,
} from "livekit-client";

interface ActiveRoomProps {
  serverUrl: string;
  token: string;
  roomName: string;
  displayName: string;
  isHost: boolean;
  expectedInviteeName?: string;
  initialAudioEnabled: boolean;
  initialVideoEnabled: boolean;
  onLeaveRoom: () => void;
  onRetryRoom: () => void;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

function RemoteParticipantTile({ participant }: { participant: RemoteParticipant }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [hasVideo, setHasVideo] = React.useState(false);
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    let attachedVideoTrack: any = null;
    let attachedAudioTrack: any = null;

    const syncTracks = () => {
      // Prioritize camera track for participant tile
      const videoPubs = Array.from(participant.videoTrackPublications.values());
      const cameraPub = videoPubs.find((p) => p.source === Track.Source.Camera && p.isSubscribed && p.track);
      const activeVideoPub = cameraPub || videoPubs.find((p) => p.source !== Track.Source.ScreenShare && p.isSubscribed && p.track);

      if (activeVideoPub?.track && videoRef.current) {
        if (attachedVideoTrack !== activeVideoPub.track) {
          if (attachedVideoTrack) attachedVideoTrack.detach(videoRef.current);
          activeVideoPub.track.attach(videoRef.current);
          attachedVideoTrack = activeVideoPub.track;
        }
        setHasVideo(!activeVideoPub.isMuted);
      } else {
        if (attachedVideoTrack && videoRef.current) {
          attachedVideoTrack.detach(videoRef.current);
          attachedVideoTrack = null;
        }
        setHasVideo(false);
      }

      // Find subscribed audio track
      const audioPub = Array.from(participant.audioTrackPublications.values()).find(
        (p) => p.isSubscribed && p.track
      );
      if (audioPub?.track && audioRef.current) {
        if (attachedAudioTrack !== audioPub.track) {
          if (attachedAudioTrack) attachedAudioTrack.detach(audioRef.current);
          audioPub.track.attach(audioRef.current);
          attachedAudioTrack = audioPub.track;
        }
        setIsAudioMuted(audioPub.isMuted);
      } else {
        if (attachedAudioTrack && audioRef.current) {
          attachedAudioTrack.detach(audioRef.current);
          attachedAudioTrack = null;
        }
        setIsAudioMuted(true);
      }
    };

    syncTracks();

    const handleUpdate = () => {
      syncTracks();
      forceUpdate();
    };

    participant.on(ParticipantEvent.TrackSubscribed, handleUpdate);
    participant.on(ParticipantEvent.TrackUnsubscribed, handleUpdate);
    participant.on(ParticipantEvent.TrackMuted, handleUpdate);
    participant.on(ParticipantEvent.TrackUnmuted, handleUpdate);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, handleUpdate);
      participant.off(ParticipantEvent.TrackUnsubscribed, handleUpdate);
      participant.off(ParticipantEvent.TrackMuted, handleUpdate);
      participant.off(ParticipantEvent.TrackUnmuted, handleUpdate);
      if (attachedVideoTrack && videoRef.current) {
        attachedVideoTrack.detach(videoRef.current);
      }
      if (attachedAudioTrack && audioRef.current) {
        attachedAudioTrack.detach(audioRef.current);
      }
    };
  }, [participant]);

  const pName = participant.name || participant.identity || "Guest";
  const [isPortrait, setIsPortrait] = React.useState(false);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setIsPortrait(videoRef.current.videoHeight > videoRef.current.videoWidth);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl border ${
        isPinned ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "border-zinc-800"
      } bg-zinc-900 overflow-hidden shadow-md flex items-center justify-center transition-all ${
        isTwoPersonLayout
          ? "h-full flex-1 min-h-0 min-w-0"
          : isPortrait
          ? "aspect-[9/16] max-h-[75vh]"
          : "aspect-video max-h-[70vh]"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        className={`h-full w-full transition-opacity duration-300 ${
          isPortrait ? "object-contain bg-zinc-950" : "object-cover"
        } ${hasVideo ? "opacity-100" : "opacity-0"}`}
      />
      <audio ref={audioRef} autoPlay />

      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 space-y-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 border border-zinc-700 shadow-sm">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">{pName}</span>
          <span className="text-[11px] text-zinc-500 font-mono">Camera Off</span>
        </div>
      )}

      {/* Participant Name Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-mono text-zinc-300 border border-zinc-800 shadow-sm">
        <span>{pName}</span>
        {isAudioMuted && <MicOff className="h-3 w-3 text-destructive" />}
      </div>

      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-lg border text-xs backdrop-blur-md transition-colors ${
            isPinned
              ? "bg-emerald-600/90 text-white border-emerald-400"
              : "bg-zinc-950/70 text-zinc-400 hover:text-white border-zinc-800"
          }`}
          title={isPinned ? "Détacher" : "Épingler en vue principale"}
        >
          {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

interface ClickRipple {
  id: string;
  xPercent: number;
  yPercent: number;
  label?: string;
}

interface ActivePointer {
  identity: string;
  name: string;
  xPercent: number;
  yPercent: number;
}

function ScreenShareStage({
  track,
  presenterName,
  isLocal,
  onStopShare,
  onBroadcastClick,
  onBroadcastPointerMove,
  onBroadcastPointerLeave,
  externalRipples,
  externalPointers,
}: {
  track: any;
  presenterName: string;
  isLocal: boolean;
  onStopShare?: () => void;
  onBroadcastClick?: (xPercent: number, yPercent: number) => void;
  onBroadcastPointerMove?: (xPercent: number, yPercent: number) => void;
  onBroadcastPointerLeave?: () => void;
  externalRipples?: ClickRipple[];
  externalPointers?: ActivePointer[];
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [localRipples, setLocalRipples] = React.useState<ClickRipple[]>([]);
  const [isTrackMuted, setIsTrackMuted] = React.useState(false);
  const lastMoveRef = React.useRef<number>(0);

  React.useEffect(() => {
    let attachedTrack: any = null;
    if (track && videoRef.current) {
      track.attach(videoRef.current);
      attachedTrack = track;
      setIsTrackMuted(Boolean(track.isMuted));

      const onMuted = () => setIsTrackMuted(true);
      const onUnmuted = () => setIsTrackMuted(false);

      track.on?.("muted", onMuted);
      track.on?.("unmuted", onUnmuted);

      return () => {
        track.off?.("muted", onMuted);
        track.off?.("unmuted", onUnmuted);
        if (attachedTrack && videoRef.current) {
          attachedTrack.detach(videoRef.current);
        }
      };
    }
  }, [track]);

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const newRipple: ClickRipple = {
      id: `ripple-${Date.now()}-${Math.random()}`,
      xPercent,
      yPercent,
      label: isLocal ? "You" : presenterName,
    };

    setLocalRipples((prev) => [...prev.slice(-10), newRipple]);
    setTimeout(() => {
      setLocalRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 1500);

    onBroadcastClick?.(xPercent, yPercent);
  };

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const now = Date.now();
    if (now - lastMoveRef.current < 40) return; // ~25 fps throttle
    lastMoveRef.current = now;

    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    onBroadcastPointerMove?.(xPercent, yPercent);
  };

  const handleStageMouseLeave = () => {
    onBroadcastPointerLeave?.();
  };

  const allRipples = [...localRipples, ...(externalRipples || [])];

  return (
    <div
      ref={containerRef}
      onClick={handleStageClick}
      onMouseMove={handleStageMouseMove}
      onMouseLeave={handleStageMouseLeave}
      className="relative h-full w-full bg-zinc-950 flex items-center justify-center overflow-hidden cursor-crosshair select-none"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="max-h-full max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl pointer-events-none"
      />

      {/* Mobile background / paused overlay */}
      {isTrackMuted && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/85 backdrop-blur-sm text-center p-6 space-y-2">
          <div className="h-10 w-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ScreenShare className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-zinc-200">Partage d&apos;écran mobile en pause</p>
          <p className="text-xs text-zinc-400 max-w-sm">Le présentateur navigue sur son téléphone. La diffusion reprendra dès son retour dans la salle.</p>
        </div>
      )}

      {/* Live Remote Pointers (Laser pointer + name tag as in Image 3) */}
      {(externalPointers || []).map((ptr) => (
        <div
          key={ptr.identity}
          className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75 ease-out"
          style={{ left: `${ptr.xPercent}%`, top: `${ptr.yPercent}%` }}
        >
          <div className="relative flex h-6 w-6 items-center justify-center">
            <span className="absolute -inset-2 rounded-full bg-emerald-400/30 animate-ping opacity-60" />
            <span className="h-3 w-3 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_15px_rgba(52,211,153,1)]" />
          </div>
          <span className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-950/90 border border-zinc-700 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-300 shadow-xl">
            {ptr.name}
          </span>
        </div>
      ))}

      {/* Ripple click animations */}
      {allRipples.map((ripple) => (
        <div
          key={ripple.id}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${ripple.xPercent}%`, top: `${ripple.yPercent}%` }}
        >
          <span className="absolute -inset-4 rounded-full border-2 border-emerald-400 bg-emerald-400/20 animate-ping opacity-75" />
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.9)] animate-pulse">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
          </span>
          {ripple.label && (
            <span className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900/90 border border-zinc-700 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300 shadow">
              {ripple.label}
            </span>
          )}
        </div>
      ))}

      {/* Top Banner / Indicator */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 text-xs font-mono text-zinc-200 shadow-xl pointer-events-auto max-w-[calc(100%-24px)]">
        <div className="flex items-center gap-2">
          <ScreenShare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="font-medium">
            {isLocal ? "Vous partagez votre écran" : `Écran partagé par ${presenterName}`}
          </span>
        </div>
        {isLocal && (
          <span className="text-[10px] text-zinc-400 border-l border-zinc-700 pl-2 hidden md:inline">
            Curseur visible en mode « Tout l&apos;écran »
          </span>
        )}
        {isLocal && onStopShare && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStopShare}
            className="ml-auto h-6 px-2.5 text-[10px] rounded-full"
          >
            Arrêter le partage
          </Button>
        )}
      </div>
    </div>
  );
}

function RemoteCameraPiPTile({
  participant,
  isPinned,
  onTogglePin,
}: {
  participant: RemoteParticipant;
  isPinned?: boolean;
  onTogglePin?: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [hasVideo, setHasVideo] = React.useState(false);
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [isPortrait, setIsPortrait] = React.useState(false);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setIsPortrait(videoRef.current.videoHeight > videoRef.current.videoWidth);
    }
  };

  React.useEffect(() => {
    let attachedVideoTrack: any = null;
    let attachedAudioTrack: any = null;

    const syncTracks = () => {
      const videoPubs = Array.from(participant.videoTrackPublications.values());
      const cameraPub = videoPubs.find((p) => p.source === Track.Source.Camera && p.isSubscribed && p.track);
      const activeVideoPub = cameraPub || videoPubs.find((p) => p.source !== Track.Source.ScreenShare && p.isSubscribed && p.track);

      if (activeVideoPub?.track && videoRef.current) {
        if (attachedVideoTrack !== activeVideoPub.track) {
          if (attachedVideoTrack) attachedVideoTrack.detach(videoRef.current);
          activeVideoPub.track.attach(videoRef.current);
          attachedVideoTrack = activeVideoPub.track;
        }
        setHasVideo(!activeVideoPub.isMuted);
      } else {
        if (attachedVideoTrack && videoRef.current) {
          attachedVideoTrack.detach(videoRef.current);
          attachedVideoTrack = null;
        }
        setHasVideo(false);
      }

      const audioPub = Array.from(participant.audioTrackPublications.values()).find(
        (p) => p.isSubscribed && p.track
      );
      if (audioPub?.track && audioRef.current) {
        if (attachedAudioTrack !== audioPub.track) {
          if (attachedAudioTrack) attachedAudioTrack.detach(audioRef.current);
          audioPub.track.attach(audioRef.current);
          attachedAudioTrack = audioPub.track;
        }
        setIsAudioMuted(audioPub.isMuted);
      } else {
        if (attachedAudioTrack && audioRef.current) {
          attachedAudioTrack.detach(audioRef.current);
          attachedAudioTrack = null;
        }
        setIsAudioMuted(true);
      }
    };

    syncTracks();
    participant.on(ParticipantEvent.TrackSubscribed, syncTracks);
    participant.on(ParticipantEvent.TrackUnsubscribed, syncTracks);
    participant.on(ParticipantEvent.TrackMuted, syncTracks);
    participant.on(ParticipantEvent.TrackUnmuted, syncTracks);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, syncTracks);
      participant.off(ParticipantEvent.TrackUnsubscribed, syncTracks);
      participant.off(ParticipantEvent.TrackMuted, syncTracks);
      participant.off(ParticipantEvent.TrackUnmuted, syncTracks);
      if (attachedVideoTrack && videoRef.current) attachedVideoTrack.detach(videoRef.current);
      if (attachedAudioTrack && audioRef.current) attachedAudioTrack.detach(audioRef.current);
    };
  }, [participant]);

  const pName = participant.name || participant.identity || "Guest";

  return (
    <div
      className={`relative w-full ${
        isPortrait ? "aspect-[9/16]" : "aspect-video"
      } shrink-0 rounded-xl border ${
        isPinned ? "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "border-zinc-700/80"
      } bg-zinc-900/95 overflow-hidden shadow-md flex items-center justify-center backdrop-blur-md transition-all`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        className={`h-full w-full ${
          isPortrait ? "object-contain bg-zinc-950" : "object-cover"
        } transition-opacity ${hasVideo ? "opacity-100" : "opacity-0"}`}
      />
      <audio ref={audioRef} autoPlay />
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 space-y-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[9px] font-semibold text-zinc-300 truncate max-w-[90%]">{pName}</span>
        </div>
      )}
      <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-zinc-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-300 border border-zinc-800">
        <span className="truncate max-w-[85px]">{pName}</span>
        {isAudioMuted && <MicOff className="h-2 w-2 text-destructive" />}
      </div>
      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          className={`absolute top-1 right-1 p-1 rounded-md text-[10px] border backdrop-blur-md transition-colors ${
            isPinned
              ? "bg-emerald-600 text-white border-emerald-400"
              : "bg-zinc-950/80 text-zinc-400 hover:text-white border-zinc-800"
          }`}
          title={isPinned ? "Détacher" : "Épingler en haut"}
        >
          {isPinned ? <PinOff className="h-2.5 w-2.5" /> : <Pin className="h-2.5 w-2.5" />}
        </button>
      )}
    </div>
  );
}

export function ActiveRoom({
  serverUrl,
  token,
  roomName,
  displayName,
  isHost,
  expectedInviteeName,
  initialAudioEnabled,
  initialVideoEnabled,
  onLeaveRoom,
  onRetryRoom,
}: ActiveRoomProps) {
  const [connectionState, setConnectionState] = React.useState<string>("connecting");
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [inviteLinkStatus, setInviteLinkStatus] = React.useState("");
  const [audioEnabled, setAudioEnabled] = React.useState(initialAudioEnabled);
  const [videoEnabled, setVideoEnabled] = React.useState(initialVideoEnabled);
  const [screenSharing, setScreenSharing] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [participantsCount, setParticipantsCount] = React.useState(1);
  const [remoteParticipants, setRemoteParticipants] = React.useState<RemoteParticipant[]>([]);
  const [isLocked, setIsLocked] = React.useState(false);

  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([
    {
      id: "sys-1",
      sender: "System",
      text: `Connected to LiveKit Room: ${roomName}. Token verified with ${
        isHost ? "Host / Room Admin" : "Attendee"
      } privileges.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [messageInput, setMessageInput] = React.useState("");

  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const localPipVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const carouselVerticalRef = React.useRef<HTMLDivElement | null>(null);
  const [participantsSidebarOpen, setParticipantsSidebarOpen] = React.useState(true);
  const roomRef = React.useRef<Room | null>(null);
  const localTracksRef = React.useRef<LocalTrack[]>([]);

  // Ensure browser getDisplayMedia requests continuous cursor capture
  React.useEffect(() => {
    if (typeof window !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
      const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getDisplayMedia = async (constraints?: DisplayMediaStreamOptions) => {
        const merged: any = { ...constraints };
        merged.cursor = "always";
        if (typeof merged.video === "object") {
          merged.video = {
            ...merged.video,
            cursor: "always",
          };
        } else if (merged.video === true || merged.video === undefined) {
          merged.video = { cursor: "always" };
        }
        return origGetDisplayMedia(merged);
      };
    }
  }, []);

  const [pinnedParticipantId, setPinnedParticipantId] = React.useState<string | null>(null);
  const [localIsPortrait, setLocalIsPortrait] = React.useState(false);
  const recorderRef = React.useRef<MeetingRecorder | null>(null);
  const [recorderState, setRecorderState] = React.useState<RecorderState>({
    isRecording: false,
    durationSeconds: 0,
    formattedDuration: "00:00",
  });

  const handleLocalVideoMetadata = () => {
    if (localVideoRef.current) {
      setLocalIsPortrait(localVideoRef.current.videoHeight > localVideoRef.current.videoWidth);
    }
  };

  React.useEffect(() => {
    recorderRef.current = new MeetingRecorder((state) => {
      setRecorderState(state);
    });
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stopRecording();
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (!recorderRef.current) return;
    if (recorderState.isRecording) {
      recorderRef.current.stopRecording(`meet-${roomName}`);
    } else {
      const audioStreams: MediaStream[] = [];
      if (localTracksRef.current) {
        const audioTrack = localTracksRef.current.find((t) => t.kind === "audio");
        if (audioTrack?.mediaStreamTrack) {
          audioStreams.push(new MediaStream([audioTrack.mediaStreamTrack]));
        }
      }
      remoteParticipants.forEach((p) => {
        p.audioTrackPublications.forEach((pub) => {
          if (pub.isSubscribed && pub.track?.mediaStreamTrack) {
            audioStreams.push(new MediaStream([pub.track.mediaStreamTrack]));
          }
        });
      });
      await recorderRef.current.startRecording(null, audioStreams);
    }
  };

  const pinnedParticipant = React.useMemo(() => {
    if (!pinnedParticipantId) return null;
    return remoteParticipants.find((p) => p.identity === pinnedParticipantId) || null;
  }, [pinnedParticipantId, remoteParticipants]);

  const [soundEffectsOn, setSoundEffectsOn] = React.useState(isSoundEffectsEnabled());
  const [externalRipples, setExternalRipples] = React.useState<ClickRipple[]>([]);
  const [externalPointers, setExternalPointers] = React.useState<ActivePointer[]>([]);

  const broadcastClickRipple = (xPercent: number, yPercent: number) => {
    if (roomRef.current?.localParticipant) {
      const payload = new TextEncoder().encode(
        JSON.stringify({
          type: "CLICK_RIPPLE",
          xPercent,
          yPercent,
        })
      );
      roomRef.current.localParticipant.publishData(payload, { reliable: true }).catch(() => {});
    }
  };

  const broadcastPointerMove = (xPercent: number, yPercent: number) => {
    if (roomRef.current?.localParticipant) {
      const payload = new TextEncoder().encode(
        JSON.stringify({
          type: "POINTER_MOVE",
          xPercent,
          yPercent,
          name: displayName,
        })
      );
      roomRef.current.localParticipant.publishData(payload, { reliable: false }).catch(() => {});
    }
  };

  const broadcastPointerLeave = () => {
    if (roomRef.current?.localParticipant) {
      const payload = new TextEncoder().encode(
        JSON.stringify({
          type: "POINTER_LEAVE",
        })
      );
      roomRef.current.localParticipant.publishData(payload, { reliable: false }).catch(() => {});
    }
  };

  const remoteScreenShare = React.useMemo(() => {
    for (const p of remoteParticipants) {
      for (const pub of p.videoTrackPublications.values()) {
        if (pub.source === Track.Source.ScreenShare && pub.isSubscribed && pub.track) {
          return {
            track: pub.track,
            presenterName: p.name || p.identity || "Guest",
            isLocal: false,
          };
        }
      }
    }
    return null;
  }, [remoteParticipants]);

  const localScreenTrack = React.useMemo(() => {
    if (!screenSharing || !roomRef.current?.localParticipant) return null;
    const pub = roomRef.current.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    return pub?.track || null;
  }, [screenSharing, remoteParticipants]);

  const activeScreenShare = remoteScreenShare || (localScreenTrack ? {
    track: localScreenTrack,
    presenterName: `${displayName} (You)`,
    isLocal: true,
  } : null);

  React.useEffect(() => {
    const videoTrack = localTracksRef.current.find((t) => t.kind === "video");
    if (!videoTrack) return;

    if (activeScreenShare && localPipVideoRef.current) {
      videoTrack.attach(localPipVideoRef.current);
    } else if (!activeScreenShare && localVideoRef.current) {
      videoTrack.attach(localVideoRef.current);
    }
  }, [activeScreenShare, videoEnabled, connectionState]);

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setInviteLinkStatus("Invite link copied");
    } catch {
      setInviteLinkStatus("Copy failed — copy the URL from your address bar");
    }
    window.setTimeout(() => setInviteLinkStatus(""), 2500);
  };

  React.useEffect(() => {
    let mounted = true;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });
    roomRef.current = room;

    const connectLiveKit = async () => {
      try {
        setConnectionState("connecting");
        setConnectionError(null);

        const updateRemoteParticipants = () => {
          if (!mounted) return;
          const remotes = Array.from(room.remoteParticipants.values());
          setRemoteParticipants(remotes);
          setParticipantsCount(1 + remotes.length);
        };

        // Set up event listeners
        room.on(RoomEvent.Connected, () => {
          if (!mounted) return;
          setConnectionState("connected");
          setConnectionError(null);
          updateRemoteParticipants();
        });

        room.on(RoomEvent.Disconnected, () => {
          if (!mounted) return;
          setConnectionState("disconnected");
          setConnectionError("The LiveKit connection ended. Check the network and reconnect to the room.");
        });

        room.on(RoomEvent.Reconnecting, () => {
          if (!mounted) return;
          setConnectionState("reconnecting");
        });

        room.on(RoomEvent.ParticipantConnected, () => {
          updateRemoteParticipants();
          playUserJoinSound();
        });
        room.on(RoomEvent.ParticipantDisconnected, () => {
          updateRemoteParticipants();
          playUserLeaveSound();
        });
        room.on(RoomEvent.TrackSubscribed, updateRemoteParticipants);
        room.on(RoomEvent.TrackUnsubscribed, updateRemoteParticipants);
        room.on(RoomEvent.TrackMuted, updateRemoteParticipants);
        room.on(RoomEvent.TrackUnmuted, updateRemoteParticipants);

        room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: any) => {
          if (!mounted) return;
          try {
            const decoded = new TextDecoder().decode(payload);
            const parsed = JSON.parse(decoded);

            if (parsed.type === "CLICK_RIPPLE") {
              const rippleId = `ext-${Date.now()}-${Math.random()}`;
              setExternalRipples((prev) => [
                ...prev.slice(-10),
                {
                  id: rippleId,
                  xPercent: parsed.xPercent,
                  yPercent: parsed.yPercent,
                  label: participant?.name || participant?.identity || "Presenter",
                },
              ]);
              setTimeout(() => {
                setExternalRipples((prev) => prev.filter((r) => r.id !== rippleId));
              }, 1600);
              return;
            }

            if (parsed.type === "POINTER_MOVE") {
              const peerIdentity = participant?.identity || "unknown";
              const peerName = parsed.name || participant?.name || participant?.identity || "Guest";
              setExternalPointers((prev) => {
                const filtered = prev.filter((p) => p.identity !== peerIdentity);
                return [
                  ...filtered,
                  {
                    identity: peerIdentity,
                    name: peerName,
                    xPercent: parsed.xPercent,
                    yPercent: parsed.yPercent,
                  },
                ];
              });
              return;
            }

            if (parsed.type === "POINTER_LEAVE") {
              const peerIdentity = participant?.identity || "unknown";
              setExternalPointers((prev) => prev.filter((p) => p.identity !== peerIdentity));
              return;
            }

            setChatMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}-${Math.random()}`,
                sender: participant?.name || participant?.identity || "Peer",
                text: parsed.text || decoded,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ]);
            playMessageReceivedSound();
          } catch {
            // plain text fallback
          }
        });

        // Acquire local tracks
        try {
          const tracks = await createLocalTracks({
            audio: initialAudioEnabled,
            video: initialVideoEnabled,
          });
          localTracksRef.current = tracks;

          const videoTrack = tracks.find((t) => t.kind === "video");
          if (videoTrack && localVideoRef.current) {
            videoTrack.attach(localVideoRef.current);
          }
        } catch (mediaErr) {
          console.warn("[ActiveRoom] Local media capture skipped:", mediaErr);
        }

        // Connect to LiveKit server
        await room.connect(serverUrl, token);

        // Publish acquired tracks
        for (const track of localTracksRef.current) {
          await room.localParticipant.publishTrack(track);
        }
      } catch (err: any) {
        console.warn("[ActiveRoom] LiveKit connection failed:", err.message);
        localTracksRef.current.forEach((track) => track.stop());
        localTracksRef.current = [];
        if (mounted) {
          setConnectionState("error");
          setConnectionError(err.message || "Unable to connect to the meeting server.");
        }
      }
    };

    connectLiveKit();

    return () => {
      mounted = false;
      localTracksRef.current.forEach((track) => track.stop());
      room.disconnect();
    };
  }, [serverUrl, token, roomName, initialAudioEnabled, initialVideoEnabled]);

  const toggleAudio = async () => {
    const nextState = !audioEnabled;
    playToggleMuteSound(audioEnabled);
    setAudioEnabled(nextState);
    if (roomRef.current?.localParticipant) {
      await roomRef.current.localParticipant.setMicrophoneEnabled(nextState).catch(() => {});
    }
  };

  const toggleVideo = async () => {
    const nextState = !videoEnabled;
    setVideoEnabled(nextState);
    if (roomRef.current?.localParticipant) {
      await roomRef.current.localParticipant.setCameraEnabled(nextState).catch(() => {});
    }
  };

  const toggleScreenShare = async () => {
    const nextState = !screenSharing;
    try {
      if (roomRef.current?.localParticipant) {
        if (nextState) {
          const pub = await roomRef.current.localParticipant.setScreenShareEnabled(true, {
            audio: true,
            selfBrowserSurface: "include",
            surfaceSwitching: "include",
            systemAudio: "include",
            video: {
              cursor: "always",
              displaySurface: "monitor",
            } as any,
            contentHint: "detail",
          });
          const mediaStreamTrack = (pub?.track as any)?.mediaStreamTrack;
          if (mediaStreamTrack) {
            mediaStreamTrack.addEventListener(
              "ended",
              () => {
                setScreenSharing(false);
                playScreenShareStopSound();
              },
              { once: true }
            );
          }
          setScreenSharing(true);
          playScreenShareStartSound();
        } else {
          await roomRef.current.localParticipant.setScreenShareEnabled(false);
          setScreenSharing(false);
          playScreenShareStopSound();
        }
      } else {
        setScreenSharing(nextState);
      }
    } catch (err) {
      console.warn("Screen share error:", err);
      setScreenSharing(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: displayName,
      text: messageInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    playMessageSentSound();

    // Send across LiveKit data channel
    if (roomRef.current?.localParticipant) {
      const payload = new TextEncoder().encode(JSON.stringify({ text: newMsg.text }));
      roomRef.current.localParticipant.publishData(payload, { reliable: true }).catch(() => {});
    }

    setMessageInput("");
  };

  const notifyLeave = React.useCallback(() => {
    try {
      const payload = JSON.stringify({ roomUid: roomName, action: "LEAVE" });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/rooms/lifecycle", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/rooms/lifecycle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [roomName]);

  React.useEffect(() => {
    const onPageHide = () => {
      notifyLeave();
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
    };
  }, [notifyLeave]);

  const handleLeave = () => {
    notifyLeave();
    localTracksRef.current.forEach((track) => track.stop());
    roomRef.current?.disconnect();
    onLeaveRoom();
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Top Session Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <BrandLogo size="small" className="border-zinc-700" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                {roomName}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400">
              Role: <strong className={isHost ? "text-primary" : "text-zinc-300"}>{isHost ? "Host (Admin)" : "Guest"}</strong>
            </span>
          </div>
        </div>

        {/* Live Status Pill & Header Actions */}
        <div className="flex items-center gap-3 text-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const next = !soundEffectsOn;
              setSoundEffectsOn(next);
              setSoundEffectsEnabled(next);
            }}
            className="h-8 w-8 p-0 border-zinc-700 text-zinc-300 hover:text-zinc-100"
            title={soundEffectsOn ? "Mute sound effects" : "Enable sound effects"}
            aria-label={soundEffectsOn ? "Mute sound effects" : "Enable sound effects"}
          >
            {soundEffectsOn ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-zinc-500" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyInviteLink}
            className="h-8 gap-1.5 border-zinc-700 px-2.5 text-zinc-300"
            aria-label="Copy meeting invite link"
          >
            {inviteLinkStatus === "Invite link copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{inviteLinkStatus || "Copy invite link"}</span>
          </Button>
          <span className="sr-only" role="status" aria-live="polite">{inviteLinkStatus}</span>
          {/* In-Browser Recording Indicator */}
          {recorderState.isRecording && (
            <div
              className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 font-mono text-[11px] text-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]"
              role="status"
              aria-live="polite"
            >
              <CircleDot className="h-3 w-3 text-red-500" />
              <span>REC {recorderState.formattedDuration}</span>
            </div>
          )}

          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] ${
              connectionState === "connected"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : connectionState === "error" || connectionState === "disconnected"
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
            role="status"
            aria-live="polite"
          >
            <Radio className={`h-3 w-3 ${connectionState === "connected" ? "animate-pulse" : ""}`} />
            <span>
              {connectionState === "connected"
                ? "SESSION LIVE"
                : connectionState === "error"
                  ? "CONNECTION FAILED"
                  : connectionState.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
            <Users className="h-3.5 w-3.5" />
            <span>{participantsCount}</span>
          </div>
        </div>
      </header>

      {/* Main Video Viewport & Sidebars */}
      <main className="flex-1 flex overflow-hidden relative">
        {connectionError && (
          <div className="absolute left-4 right-4 top-4 z-20 rounded-lg border border-red-500/30 bg-red-950/90 p-3 text-sm text-red-100 sm:left-6 sm:right-auto sm:max-w-lg" role="alert">
            <p>Could not stay connected to the meeting server. <span className="text-red-200/80">{connectionError}</span></p>
            <Button type="button" size="sm" variant="outline" onClick={onRetryRoom} className="mt-2 h-8 border-red-300/30 text-red-50 hover:bg-red-900">
              Return to pre-join and reconnect
            </Button>
          </div>
        )}
        {/* Main Stage: Screen Share with Right Vertical Participant Rail or Regular Grid */}
        {activeScreenShare ? (
          <div className="relative flex-1 h-full w-full bg-zinc-950 overflow-hidden flex flex-col md:flex-row">
            {/* Mobile-only Top Camera Spotlight (Pinned Participant or Host/You) */}
            <div className="md:hidden w-full shrink-0 bg-zinc-900/90 border-b border-zinc-800/80 px-3 py-1.5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-zinc-300">
                  {pinnedParticipant
                    ? `Épinglé: ${pinnedParticipant.name || pinnedParticipant.identity}`
                    : "Caméra Hôte"}
                </span>
                {pinnedParticipant && (
                  <button
                    type="button"
                    onClick={() => setPinnedParticipantId(null)}
                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5 underline"
                  >
                    <PinOff className="h-2.5 w-2.5" /> Revenir à l&apos;hôte
                  </button>
                )}
              </div>

              {/* Mobile button to toggle participant drawer to choose who to pin */}
              <button
                type="button"
                onClick={() => setParticipantsSidebarOpen((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700"
              >
                <Users className="h-3 w-3" />
                <span>Changer ({participantsCount})</span>
              </button>
            </div>

            {/* Mobile Spotlight Video Feed (Above ScreenShare on small screens) */}
            <div className="md:hidden w-full shrink-0 bg-zinc-950 flex justify-center py-1.5 px-2 border-b border-zinc-800/60 max-h-36">
              {pinnedParticipant ? (
                <div className="h-28 w-auto aspect-video max-w-full rounded-xl overflow-hidden border border-emerald-500/80 bg-zinc-900 shadow relative">
                  <RemoteCameraPiPTile
                    participant={pinnedParticipant}
                    isPinned={true}
                    onTogglePin={() => setPinnedParticipantId(null)}
                  />
                </div>
              ) : (
                <div className="h-28 w-auto aspect-video max-w-full rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shadow relative">
                  <video
                    ref={localPipVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover transform -scale-x-100 transition-opacity ${
                      videoEnabled ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {!videoEnabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-[10px]">
                      <VideoOff className="h-4 w-4 mb-1" />
                      <span>{displayName} (Off)</span>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 bg-zinc-950/80 px-1 py-0.5 rounded text-[8px] font-mono text-zinc-300">
                    {displayName} (Hôte)
                  </div>
                </div>
              )}
            </div>

            {/* Presentation Stage - Fits entirely without any overlap */}
            <div className="relative flex-1 h-full min-w-0 min-h-0 flex items-center justify-center p-1.5 sm:p-2 overflow-hidden">
              <ScreenShareStage
                track={activeScreenShare.track}
                presenterName={activeScreenShare.presenterName}
                isLocal={activeScreenShare.isLocal}
                onStopShare={activeScreenShare.isLocal ? toggleScreenShare : undefined}
                onBroadcastClick={broadcastClickRipple}
                onBroadcastPointerMove={broadcastPointerMove}
                onBroadcastPointerLeave={broadcastPointerLeave}
                externalRipples={externalRipples}
                externalPointers={externalPointers}
              />
            </div>

            {/* Right Vertical Participants Rail (Docked on right side, never masks screen share) */}
            <aside
              className={`${
                participantsSidebarOpen ? "w-48 sm:w-52 md:w-56" : "w-0 border-l-0 p-0 hidden md:flex"
              } shrink-0 h-full border-l border-zinc-800/90 bg-zinc-950/95 flex flex-col items-center py-2 px-2 z-20 transition-all duration-200 select-none overflow-hidden ${
                participantsSidebarOpen ? "absolute right-0 top-0 bottom-0 md:relative" : ""
              }`}
            >
              {/* Header / Toggle */}
              <div className="w-full flex items-center justify-between px-1 pb-1.5 mb-1 border-b border-zinc-800/60 text-[11px] font-mono text-zinc-400 shrink-0">
                <span className="flex items-center gap-1.5 truncate">
                  <Users className="h-3 w-3 text-zinc-400" />
                  <span>Participants ({participantsCount})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setParticipantsSidebarOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors"
                  title="Masquer la liste"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Scroll Up Button (^) */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => carouselVerticalRef.current?.scrollBy({ top: -160, behavior: "smooth" })}
                className="h-7 w-full rounded-lg bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white shrink-0 mb-1 border border-zinc-800/80 shadow-sm"
                aria-label="Faire défiler vers le haut"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>

              {/* Vertical scrollable participants list */}
              <div
                ref={carouselVerticalRef}
                className="flex-1 w-full overflow-y-auto scrollbar-none scroll-smooth space-y-2 py-1 px-0.5"
              >
                {/* Local User Card */}
                <div className="relative w-full aspect-video rounded-xl border border-zinc-700/80 bg-zinc-900/95 overflow-hidden shadow-md flex items-center justify-center shrink-0">
                  <video
                    ref={localPipVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover transform -scale-x-100 transition-opacity ${
                      videoEnabled ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {!videoEnabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 space-y-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
                        <VideoOff className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[9px] font-medium text-zinc-300 truncate max-w-[90%]">
                        {displayName} (Camera Off)
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-zinc-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-300 border border-zinc-800">
                    <span className="truncate max-w-[85px]">{displayName} (You)</span>
                    {!audioEnabled && <MicOff className="h-2 w-2 text-destructive" />}
                  </div>
                </div>

                {/* Remote Participants Cards with Pin Spotlight controls */}
                {remoteParticipants.map((p) => (
                  <RemoteCameraPiPTile
                    key={p.identity}
                    participant={p}
                    isPinned={pinnedParticipantId === p.identity}
                    onTogglePin={() =>
                      setPinnedParticipantId(pinnedParticipantId === p.identity ? null : p.identity)
                    }
                  />
                ))}
              </div>

              {/* Scroll Down Button (v) */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => carouselVerticalRef.current?.scrollBy({ top: 160, behavior: "smooth" })}
                className="h-7 w-full rounded-lg bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white shrink-0 mt-1 border border-zinc-800/80 shadow-sm"
                aria-label="Faire défiler vers le bas"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </aside>

            {/* Floating button to reopen sidebar if collapsed */}
            {!participantsSidebarOpen && (
              <button
                type="button"
                onClick={() => setParticipantsSidebarOpen(true)}
                className="absolute right-3 top-3 z-30 flex items-center gap-1 bg-zinc-900/90 border border-zinc-700/80 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-mono shadow-xl backdrop-blur-md transition-colors"
                title="Afficher les participants"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <Users className="h-3.5 w-3.5" />
                <span>{participantsCount}</span>
              </button>
            )}
          </div>
        ) : remoteParticipants.length === 1 ? (
          /* Optimized 2-Participant Layout: 100% viewport space, zero wasted black bars */
          <div className="flex-1 h-full w-full min-h-0 min-w-0 p-2 sm:p-3 flex flex-col md:flex-row gap-2 sm:gap-3 items-stretch justify-stretch overflow-hidden bg-zinc-950">
            {/* Local User Tile */}
            <div className="relative flex-1 h-full w-full min-h-0 min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-md flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={handleLocalVideoMetadata}
                className={`h-full w-full ${
                  localIsPortrait ? "object-contain bg-zinc-950" : "object-cover"
                } transform -scale-x-100 transition-opacity ${videoEnabled ? "opacity-100" : "opacity-0"}`}
              />

              {!videoEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 border border-zinc-700">
                    <VideoOff className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium">{displayName} (Camera Off)</span>
                </div>
              )}

              {/* Tile Label */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-mono text-zinc-300 border border-zinc-800">
                <span>{displayName} (You)</span>
                {!audioEnabled && <MicOff className="h-3 w-3 text-destructive" />}
              </div>
            </div>

            {/* Remote Participant Tile (takes the remaining 50% space seamlessly) */}
            <RemoteParticipantTile
              participant={remoteParticipants[0]}
              isTwoPersonLayout={true}
              isPinned={pinnedParticipantId === remoteParticipants[0].identity}
              onTogglePin={() =>
                setPinnedParticipantId(
                  pinnedParticipantId === remoteParticipants[0].identity ? null : remoteParticipants[0].identity
                )
              }
            />
          </div>
        ) : (
          /* Main Stage Multi-Video Grid (> 1 remote participant or waiting) */
          <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-center overflow-auto bg-zinc-950">
            {/* Local User Tile */}
            <div className="relative aspect-video w-full max-h-[70vh] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-md flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={handleLocalVideoMetadata}
                className={`h-full w-full ${
                  localIsPortrait ? "object-contain bg-zinc-950" : "object-cover"
                } transform -scale-x-100 transition-opacity ${videoEnabled ? "opacity-100" : "opacity-0"}`}
              />

              {!videoEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 border border-zinc-700">
                    <VideoOff className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium">{displayName} (Camera Off)</span>
                </div>
              )}

              {/* Tile Label */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-mono text-zinc-300 border border-zinc-800">
                <span>{displayName} (You)</span>
                {!audioEnabled && <MicOff className="h-3 w-3 text-destructive" />}
              </div>
            </div>

            {/* Remote Participants or Waiting Placeholder */}
            {remoteParticipants.length > 0 ? (
              remoteParticipants.map((p) => (
                <RemoteParticipantTile
                  key={p.identity}
                  participant={p}
                  isPinned={pinnedParticipantId === p.identity}
                  onTogglePin={() =>
                    setPinnedParticipantId(pinnedParticipantId === p.identity ? null : p.identity)
                  }
                />
              ))
            ) : (
              <div className="relative aspect-video w-full max-h-[70vh] rounded-2xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden shadow-md flex flex-col items-center justify-center text-zinc-500 p-6 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-500 border border-zinc-700">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400">
                    {expectedInviteeName ? `Waiting for ${expectedInviteeName} to join` : "Waiting for other participants"}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Share the invite link using the button above. Connected participants will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Slide-out In-Meeting Chat Drawer */}
        {chatOpen && (
          <aside className="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
            <div className="h-12 border-b border-zinc-800 px-4 flex items-center justify-between text-xs font-bold text-zinc-200">
              <span>In-Meeting WebRTC Chat</span>
              <button
                onClick={() => setChatOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="font-semibold text-zinc-300">{msg.sender}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="bg-zinc-800/60 border border-zinc-700/40 rounded-lg p-2 text-zinc-200 break-words">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="submit" size="sm" className="h-8 px-2.5">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </aside>
        )}
      </main>

      {/* Bottom Floating Control Bar */}
      <footer className="h-18 border-t border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between shrink-0">
        {/* Host Moderation Controls */}
        <div className="flex items-center gap-2">
          {isHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLocked(!isLocked)}
              className={`h-9 text-xs gap-1.5 border-zinc-700 ${
                isLocked ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "text-zinc-300"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{isLocked ? "Room Locked" : "Lock Room"}</span>
            </Button>
          )}
        </div>

        {/* Central Media Controls */}
        <div className="flex items-center gap-3">
          {/* Mic */}
          <button
            type="button"
            id="room-mic-btn"
            onClick={toggleAudio}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              audioEnabled
                ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }`}
            aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          {/* Camera */}
          <button
            type="button"
            id="room-cam-btn"
            onClick={toggleVideo}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              videoEnabled
                ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }`}
            aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          {/* Screen Share */}
          <button
            type="button"
            id="room-screen-btn"
            onClick={toggleScreenShare}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              screenSharing
                ? "bg-primary text-primary-foreground"
                : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            }`}
            aria-label={screenSharing ? "Stop sharing screen" : "Share screen"}
          >
            <ScreenShare className="h-5 w-5" />
          </button>

          {/* Record Meeting (Option 1 - In-Browser) */}
          <button
            type="button"
            id="room-record-btn"
            onClick={toggleRecording}
            className={`flex h-11 px-3.5 items-center gap-1.5 rounded-full transition-all text-xs font-semibold ${
              recorderState.isRecording
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
            }`}
            aria-label={recorderState.isRecording ? "Arrêter l'enregistrement" : "Enregistrer la réunion"}
            title={
              recorderState.isRecording
                ? "Arrêter l'enregistrement (téléchargement direct)"
                : "Enregistrer la réunion (Option 1: direct navigateur, 0 serveur)"
            }
          >
            <CircleDot className={`h-4 w-4 ${recorderState.isRecording ? "text-white" : "text-red-500"}`} />
            <span>{recorderState.isRecording ? recorderState.formattedDuration : "REC"}</span>
          </button>

          {/* End / Leave Call */}
          <button
            type="button"
            id="room-leave-btn"
            onClick={handleLeave}
            className="flex h-11 px-4 items-center gap-2 justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold text-xs transition-colors"
          >
            <PhoneOff className="h-4 w-4" />
            <span>Leave Call</span>
          </button>
        </div>

        {/* Right Chat Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
            className="h-9 text-xs gap-1.5 border-zinc-700 text-zinc-300"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
          </Button>
        </div>
      </footer>
    </div>
  );
}
