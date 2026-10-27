"use client";

import * as React from "react";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Share2,
  Users,
  Shield,
  Activity,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { RoomLauncher } from "@/components/landing/room-launcher";

interface HeroSectionProps {
  onRequestDemo: () => void;
}

export function HeroSection({ onRequestDemo }: HeroSectionProps) {
  const [micMuted, setMicMuted] = React.useState(false);
  const [cameraOff, setCameraOff] = React.useState(false);

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28">
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu overflow-hidden blur-3xl sm:-top-80 max-w-[100vw]"
      >
        <div className="aspect-[1155/678] w-[68.4375rem] max-w-full bg-gradient-to-tr from-primary/10 to-primary/5 opacity-50 dark:opacity-20" />
      </div>

      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/80 px-3.5 py-1 text-xs font-medium text-foreground backdrop-blur-md shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 radar-live" />
            <span>LiveKit Cloud SFU · Vidéo HD & Programmation Autonome</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Visioconférence ultra-rapide.{" "}
            <span className="underline decoration-primary/40 underline-offset-8">
              Zéro friction
            </span>
            .
          </h1>

          {/* Subtext */}
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
            Créez une réunion instantanée en 1 seconde ou programmez un rendez-vous avec envoi automatique d&apos;invitation par email. Aucun compte invité requis, latence ultra-faible.
          </p>

          {/* Dynamic Room Launcher (Instant, Schedule, Join) */}
          <div className="mt-8 w-full">
            <RoomLauncher />
          </div>

          {/* Micro Assurance Signals */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" /> Aucun compte invité requis
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-500" /> Latence LiveKit SFU &lt; 50ms
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Partage d&apos;écran & Chat en direct
            </span>
          </div>
        </div>

        {/* Hero Interactive Visual: Conference Room Mockup */}
        <div className="mt-14 sm:mt-18 relative mx-auto max-w-5xl rounded-2xl border border-border/80 bg-card p-3 shadow-2xl backdrop-blur-xl sm:p-4">
          {/* Mock Browser / Room Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                mhaf.live/rooms/exec-strategy-sync
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="live" className="text-[11px] gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                SFU LIVE · 18ms
              </Badge>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Users className="h-3.5 w-3.5" /> 4 participants
              </span>
            </div>
          </div>

          {/* Conference Tiles Grid */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[300px] sm:min-h-[380px]">
            {/* Tile 1: Active Speaker (Host) */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-primary/30 bg-muted/40 p-4 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="rounded bg-background/80 px-2 py-0.5 text-xs font-semibold backdrop-blur text-foreground">
                  Amine (Lead Architect) · Host
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active Speaker
                </span>
              </div>

              {/* Centered Avatar Placeholder / Waveform */}
              <div className="my-auto flex flex-col items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary border border-border/80 text-xl font-bold">
                  AL
                </div>
                {/* Audio Waveform Simulation */}
                <div className="mt-4 flex items-center gap-1 h-5">
                  <span className="w-1 bg-emerald-500 rounded-full h-2 animate-pulse" />
                  <span className="w-1 bg-emerald-500 rounded-full h-5 animate-pulse" />
                  <span className="w-1 bg-emerald-500 rounded-full h-3 animate-pulse" />
                  <span className="w-1 bg-emerald-500 rounded-full h-4 animate-pulse" />
                  <span className="w-1 bg-emerald-500 rounded-full h-2 animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">1080p · 60fps</span>
                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                  <Mic className="h-3 w-3" /> Audio Unmuted
                </span>
              </div>
            </div>

            {/* Tile 2: Remote Guest Participant */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <span className="rounded bg-background/80 px-2 py-0.5 text-xs font-semibold backdrop-blur text-foreground">
                  Sarah K. (Product Lead) · Guest
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Joined via link
                </span>
              </div>

              <div className="my-auto flex flex-col items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-secondary-foreground border border-border text-xl font-bold">
                  SK
                </div>
                <span className="mt-3 text-xs text-muted-foreground">
                  Listening
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">720p · Simulcast</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MicOff className="h-3 w-3" /> Muted
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Diarized Transcript Simulation Pill */}
          <div className="mt-3 rounded-lg border border-border/80 bg-background/90 p-2.5 px-4 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-primary" />
              <span className="font-semibold text-foreground">Live Transcript Preview:</span>
              <span className="text-muted-foreground truncate">
                "The LiveKit WebRTC pipeline gives us deterministic latency without custom mesh saturation..."
              </span>
            </div>
          </div>

          {/* Interactive In-Meeting Control Bar Mock */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 p-2 px-4">
            <div className="flex items-center gap-2">
              <Button
                variant={micMuted ? "destructive" : "outline"}
                size="sm"
                onClick={() => setMicMuted(!micMuted)}
                aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
                className="h-9 gap-1.5 text-xs"
              >
                {micMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {micMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                variant={cameraOff ? "destructive" : "outline"}
                size="sm"
                onClick={() => setCameraOff(!cameraOff)}
                aria-label={cameraOff ? "Start camera" : "Stop camera"}
                className="h-9 gap-1.5 text-xs"
              >
                {cameraOff ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                {cameraOff ? "Start Video" : "Stop Video"}
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs hidden sm:inline-flex">
                <Share2 className="h-3.5 w-3.5" /> Share Screen
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">
                Host Controls Active
              </span>
              <Button variant="destructive" size="sm" className="h-8 text-xs">
                Leave
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
