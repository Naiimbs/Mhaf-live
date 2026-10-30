"use client";

import * as React from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Settings2,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";

interface DeviceOption {
  deviceId: string;
  label: string;
}

interface PreJoinProps {
  roomUid: string;
  eventName: string;
  hostName: string;
  attendeeName: string;
  startTime: string;
  endTime: string;
  isHostUser: boolean;
  onJoinRoom: (config: {
    displayName: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    audioDeviceId: string;
    videoDeviceId: string;
  }) => void;
  joining: boolean;
  error: string | null;
}

export function PreJoin({
  roomUid,
  eventName,
  hostName,
  attendeeName,
  startTime,
  endTime,
  isHostUser,
  onJoinRoom,
  joining,
  error,
}: PreJoinProps) {
  const { isFr } = useLanguage();
  const [displayName, setDisplayName] = React.useState(
    isHostUser ? hostName : attendeeName || (isFr ? "Participant" : "Attendee")
  );
  const [videoEnabled, setVideoEnabled] = React.useState(true);
  const [audioEnabled, setAudioEnabled] = React.useState(true);

  const [videoDevices, setVideoDevices] = React.useState<DeviceOption[]>([]);
  const [audioDevices, setAudioDevices] = React.useState<DeviceOption[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = React.useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = React.useState<string>("");

  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const [audioLevel, setAudioLevel] = React.useState<number>(0);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const animFrameRef = React.useRef<number | null>(null);

  // Initialize Media Devices & Stream Preview
  const startPreview = React.useCallback(
    async (videoId?: string, audioId?: string) => {
      try {
        setPermissionError(null);

        // Stop existing preview stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch(() => {});
        }
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }

        const constraints: MediaStreamConstraints = {
          video: videoId ? { deviceId: { exact: videoId } } : true,
          audio: audioId ? { deviceId: { exact: audioId } } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Apply toggle states to initial tracks
        stream.getVideoTracks().forEach((track) => {
          track.enabled = videoEnabled;
        });
        stream.getAudioTracks().forEach((track) => {
          track.enabled = audioEnabled;
        });

        // Enumerate devices once permission granted
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = allDevices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${i + 1}`,
          }));
        const aDevs = allDevices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${i + 1}`,
          }));

        setVideoDevices(vDevs);
        setAudioDevices(aDevs);

        if (!selectedVideoDevice && vDevs.length > 0) {
          setSelectedVideoDevice(vDevs[0].deviceId);
        }
        if (!selectedAudioDevice && aDevs.length > 0) {
          setSelectedAudioDevice(aDevs[0].deviceId);
        }

        // Set up real-time audio volume analyzer
        try {
          const AudioContextClass =
            window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.4;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateMeter = () => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
              }
              const average = sum / bufferLength;
              const level = Math.min(100, Math.round((average / 100) * 100));
              setAudioLevel(level);
              animFrameRef.current = requestAnimationFrame(updateMeter);
            };

            updateMeter();
          }
        } catch (audioErr) {
          console.warn("[PreJoin] Web Audio API analyzer initialization skipped:", audioErr);
        }
      } catch (err: any) {
        console.warn("[PreJoin] Camera/Mic access warning:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setPermissionError(
            "Camera or microphone access was denied. Please allow camera and microphone permissions in your browser address bar to join."
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setPermissionError(
            "No camera or microphone hardware was detected on this device. You may still join with audio/video disabled."
          );
        } else {
          setPermissionError(`Device access issue: ${err.message || "Unknown error"}`);
        }
      }
    },
    [videoEnabled, audioEnabled, selectedVideoDevice, selectedAudioDevice]
  );

  React.useEffect(() => {
    // Only access navigator.mediaDevices in browser client
    if (typeof window !== "undefined" && navigator.mediaDevices) {
      startPreview();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Handle Video Toggle
  const toggleVideo = () => {
    const nextState = !videoEnabled;
    setVideoEnabled(nextState);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
  };

  // Handle Audio Toggle
  const toggleAudio = () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
  };

  const handleDeviceChange = (type: "video" | "audio", deviceId: string) => {
    if (type === "video") {
      setSelectedVideoDevice(deviceId);
      startPreview(deviceId, selectedAudioDevice);
    } else {
      setSelectedAudioDevice(deviceId);
      startPreview(selectedVideoDevice, deviceId);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    // Persist preferred name
    if (typeof window !== "undefined") {
      localStorage.setItem("mhaf_live_preferred_name", displayName);
    }

    onJoinRoom({
      displayName: displayName.trim(),
      audioEnabled,
      videoEnabled,
      audioDeviceId: selectedAudioDevice,
      videoDeviceId: selectedVideoDevice,
    });
  };

  const startObj = new Date(startTime);
  const endObj = new Date(endTime);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Session Header Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold">
              {isFr ? "Salle d'attente LiveKit" : "LiveKit Room Staging"}
            </span>
            <span className="text-xs font-mono text-muted-foreground">UID: {roomUid}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{eventName}</h1>
          <p className="text-xs text-muted-foreground">
            {isFr ? "Hôte : " : "Host: "}
            <strong className="text-foreground">{hostName}</strong> &bull;{" "}
            {isFr ? "Participant : " : "Attendee: "}
            <strong className="text-foreground">{attendeeName}</strong>
          </p>
        </div>

        <div className="text-xs text-muted-foreground font-mono bg-muted/40 border border-border rounded-xl p-3 flex items-center gap-3">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <div>
            <div className="font-semibold text-foreground">
              {startObj.toLocaleDateString(isFr ? "fr-FR" : "en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div>
              {startObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
              {endObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Video Preview + Staging Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Preview Box (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-video w-full rounded-2xl border border-border bg-zinc-950 overflow-hidden shadow-sm flex items-center justify-center">
            {/* Live Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                videoEnabled && !permissionError ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Video Disabled / Permission Placeholder */}
            {(!videoEnabled || permissionError) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 p-6 text-center space-y-3 bg-zinc-900/90">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 border border-zinc-700">
                  <VideoOff className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">
                    {isFr ? "La caméra est désactivée" : "Camera is turned off"}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    {isFr
                      ? "Vous pouvez activer votre caméra à tout moment avant ou pendant l'appel."
                      : "You can toggle your video on anytime before or during the call."}
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Floating Media Overlay Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 px-4 py-2 rounded-full shadow-lg">
              {/* Mic Toggle */}
              <button
                type="button"
                id="prejoin-mic-toggle"
                onClick={toggleAudio}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  audioEnabled
                    ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }`}
                aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>

              {/* Cam Toggle */}
              <button
                type="button"
                id="prejoin-cam-toggle"
                onClick={toggleVideo}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  videoEnabled
                    ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }`}
                aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
            </div>

            {/* Audio Sensitivity Meter Indicator (Top Left) */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 px-3 py-1.5 rounded-full text-xs text-zinc-200">
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              <div className="w-16 h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${audioEnabled ? audioLevel : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Permission Error Banner */}
          {permissionError && (
            <div
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs text-amber-500"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Device Permission Notice: </span>
                {permissionError}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2 text-amber-500 hover:bg-amber-500/20"
                onClick={() => startPreview(selectedVideoDevice, selectedAudioDevice)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
              </Button>
            </div>
          )}

          {/* Error Notice from Server Minting */}
          {error && (
            <div
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 flex items-start gap-3 text-xs text-destructive"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: PreJoin Settings Form (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              {isFr ? "Prêt à rejoindre ?" : "Ready to join?"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isFr
                ? "Confirmez votre nom d'affichage et vérifiez vos réglages audio et vidéo avant d'entrer."
                : "Confirm your display name and check your device settings before entering."}
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="prejoin-display-name"
                className="text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                {isFr ? "Nom d'affichage" : "Display Name"}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="prejoin-display-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isFr ? "Votre nom complet" : "Your full name"}
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Camera Select */}
            <div className="space-y-1.5">
              <label
                htmlFor="prejoin-camera-select"
                className="text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                {isFr ? "Caméra" : "Camera Source"}
              </label>
              <select
                id="prejoin-camera-select"
                value={selectedVideoDevice}
                onChange={(e) => handleDeviceChange("video", e.target.value)}
                disabled={videoDevices.length === 0}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                {videoDevices.length === 0 && <option value="">{isFr ? "Aucune caméra détectée" : "No Camera Detected"}</option>}
                {videoDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Microphone Select */}
            <div className="space-y-1.5">
              <label
                htmlFor="prejoin-mic-select"
                className="text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                {isFr ? "Microphone" : "Microphone Source"}
              </label>
              <select
                id="prejoin-mic-select"
                value={selectedAudioDevice}
                onChange={(e) => handleDeviceChange("audio", e.target.value)}
                disabled={audioDevices.length === 0}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                {audioDevices.length === 0 && <option value="">{isFr ? "Aucun microphone détecté" : "No Microphone Detected"}</option>}
                {audioDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label}
                  </option>
                ))}
              </select>
            </div>

            {/* High Assurance Security Info */}
            <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                {isFr
                  ? `Jetons sécurisés générés côté serveur (${isHostUser ? "Privilèges d'hôte" : "Participant invité"}). Les secrets ne sont jamais exposés.`
                  : `Tokens are minted server-side with strict role boundaries (${isHostUser ? "Host Privileges" : "Standard Attendee"}). Secrets are never exposed.`}
              </span>
            </div>

            {/* Join Room Button */}
            <Button
              id="prejoin-join-button"
              type="submit"
              disabled={joining || !displayName.trim()}
              className="w-full gap-2 py-5 font-bold shadow-sm"
            >
              {joining
                ? (isFr ? "Connexion au salon LiveKit..." : "Connecting to LiveKit Room...")
                : (isFr ? "Entrer dans la réunion" : "Join Room Now")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
