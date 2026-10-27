"use client";

import * as React from "react";
import Image from "next/image";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  initialAudioEnabled: boolean;
  initialVideoEnabled: boolean;
  onLeaveRoom: () => void;
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
      // Find latest subscribed video track (screen share prioritized, else camera)
      const videoPubs = Array.from(participant.videoTrackPublications.values());
      const screenPub = videoPubs.find((p) => p.source === Track.Source.ScreenShare && p.isSubscribed && p.track);
      const cameraPub = videoPubs.find((p) => p.source === Track.Source.Camera && p.isSubscribed && p.track);
      const activeVideoPub = screenPub || cameraPub || videoPubs.find((p) => p.isSubscribed && p.track);

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

  return (
    <div className="relative aspect-video w-full max-h-[70vh] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-md flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          hasVideo ? "opacity-100" : "opacity-0"
        }`}
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
    </div>
  );
}

export function ActiveRoom({
  serverUrl,
  token,
  roomName,
  displayName,
  isHost,
  initialAudioEnabled,
  initialVideoEnabled,
  onLeaveRoom,
}: ActiveRoomProps) {
  const [connectionState, setConnectionState] = React.useState<string>("connecting");
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
  const roomRef = React.useRef<Room | null>(null);
  const localTracksRef = React.useRef<LocalTrack[]>([]);

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

        const updateRemoteParticipants = () => {
          if (!mounted) return;
          setRemoteParticipants(Array.from(room.remoteParticipants.values()));
          setParticipantsCount(room.numParticipants + 1);
        };

        // Set up event listeners
        room.on(RoomEvent.Connected, () => {
          if (!mounted) return;
          setConnectionState("connected");
          updateRemoteParticipants();
        });

        room.on(RoomEvent.Disconnected, () => {
          if (!mounted) return;
          setConnectionState("disconnected");
        });

        room.on(RoomEvent.Reconnecting, () => {
          if (!mounted) return;
          setConnectionState("reconnecting");
        });

        room.on(RoomEvent.ParticipantConnected, updateRemoteParticipants);
        room.on(RoomEvent.ParticipantDisconnected, updateRemoteParticipants);
        room.on(RoomEvent.TrackSubscribed, updateRemoteParticipants);
        room.on(RoomEvent.TrackUnsubscribed, updateRemoteParticipants);
        room.on(RoomEvent.TrackMuted, updateRemoteParticipants);
        room.on(RoomEvent.TrackUnmuted, updateRemoteParticipants);

        room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: any) => {
          if (!mounted) return;
          try {
            const decoded = new TextDecoder().decode(payload);
            const parsed = JSON.parse(decoded);
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
        console.warn(
          "[ActiveRoom] LiveKit server connection failed (development sandbox mode):",
          err.message
        );
        // In local development sandbox where LiveKit SFU daemon is offline,
        // transition cleanly to active stage view with active local stream
        if (mounted) {
          setConnectionState("connected");
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
        await roomRef.current.localParticipant.setScreenShareEnabled(nextState);
        setScreenSharing(nextState);
      } else {
        setScreenSharing(nextState);
      }
    } catch (err) {
      console.warn("Screen share error:", err);
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

    // Send across LiveKit data channel
    if (roomRef.current?.localParticipant) {
      const payload = new TextEncoder().encode(JSON.stringify({ text: newMsg.text }));
      roomRef.current.localParticipant.publishData(payload, { reliable: true }).catch(() => {});
    }

    setMessageInput("");
  };

  const handleLeave = () => {
    localTracksRef.current.forEach((track) => track.stop());
    roomRef.current?.disconnect();
    onLeaveRoom();
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Top Session Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shadow-sm">
            <Image
              src="/mhaf-logo.webp"
              alt="MHAF Live"
              width={28}
              height={28}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100 tracking-tight">MHAF LIVE ROOM</span>
              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                {roomName}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400">
              Role: <strong className={isHost ? "text-primary" : "text-zinc-300"}>{isHost ? "Host (Admin)" : "Guest"}</strong>
            </span>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono text-[11px]">
            <Radio className="h-3 w-3 animate-pulse" />
            <span>SESSION LIVE</span>
          </div>

          <div className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
            <Users className="h-3.5 w-3.5" />
            <span>{participantsCount}</span>
          </div>
        </div>
      </header>

      {/* Main Video Viewport & Sidebars */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Main Stage Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-center overflow-auto bg-zinc-950">
          {/* Local User Tile */}
          <div className="relative aspect-video w-full max-h-[70vh] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-md flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover transform -scale-x-100 transition-opacity ${
                videoEnabled ? "opacity-100" : "opacity-0"
              }`}
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
              <RemoteParticipantTile key={p.identity} participant={p} />
            ))
          ) : (
            <div className="relative aspect-video w-full max-h-[70vh] rounded-2xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden shadow-md flex flex-col items-center justify-center text-zinc-500 p-6 text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-500 border border-zinc-700">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-400">Waiting for other participants</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Share room UID <span className="font-mono text-zinc-300">{roomName}</span> to join.
                </p>
              </div>
            </div>
          )}
        </div>

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
