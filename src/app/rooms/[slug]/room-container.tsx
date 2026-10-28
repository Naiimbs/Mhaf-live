"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreJoin } from "@/components/room/prejoin";
import { ActiveRoom } from "@/components/room/active-room";

interface RoomContainerProps {
  roomUid: string;
  eventName: string;
  hostName: string;
  attendeeName: string;
  startTime: string;
  endTime: string;
  isHostUser: boolean;
  hasBooking: boolean;
}

interface ConnectionData {
  serverUrl: string;
  participantToken: string;
  roomName: string;
  isHost: boolean;
  participantName: string;
}

export function RoomContainer({
  roomUid,
  eventName,
  hostName,
  attendeeName,
  startTime,
  endTime,
  isHostUser,
  hasBooking,
}: RoomContainerProps) {
  const [stage, setStage] = React.useState<"prejoin" | "active" | "left">("prejoin");
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [connectionData, setConnectionData] = React.useState<ConnectionData | null>(null);
  const [mediaPreferences, setMediaPreferences] = React.useState({
    audioEnabled: true,
    videoEnabled: true,
  });

  const handleJoin = async (config: {
    displayName: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    audioDeviceId: string;
    videoDeviceId: string;
  }) => {
    setJoining(true);
    setError(null);
    setMediaPreferences({
      audioEnabled: config.audioEnabled,
      videoEnabled: config.videoEnabled,
    });

    try {
      const res = await fetch("/api/connection-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: roomUid,
          name: config.displayName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to acquire LiveKit connection token.");
      }

      setConnectionData({
        serverUrl: data.serverUrl,
        participantToken: data.participantToken,
        roomName: data.roomName,
        isHost: data.isHost,
        participantName: data.participantName,
      });

      setStage("active");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while connecting.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    setStage("left");
  };

  if (stage === "left") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center space-y-6 shadow-sm">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              You Have Left the Meeting
            </h1>
            <p className="text-xs text-muted-foreground">
              Thank you for participating in <strong>{eventName}</strong>. Your media tracks have been completely stopped and disconnected.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStage("prejoin")}
              className="w-full sm:w-auto text-xs"
            >
              Re-enter PreJoin Staging
            </Button>
            <Button asChild size="sm" className="w-full sm:w-auto text-xs">
              <Link href="/">Back to Homepage</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "active" && connectionData) {
    return (
      <ActiveRoom
        serverUrl={connectionData.serverUrl}
        token={connectionData.participantToken}
        roomName={connectionData.roomName}
        displayName={connectionData.participantName}
        isHost={connectionData.isHost}
        initialAudioEnabled={mediaPreferences.audioEnabled}
        initialVideoEnabled={mediaPreferences.videoEnabled}
        onLeaveRoom={handleLeave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 sm:p-8">
      {/* Top back navigation */}
      <div className="max-w-4xl w-full mx-auto mb-6 flex items-center justify-between">
        <Link
          href={hasBooking ? `/book/confirmation/${roomUid}` : isHostUser ? "/dashboard" : "/"}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{hasBooking ? "Back to Reservation Details" : isHostUser ? "Back to Calendar" : "Back to Homepage"}</span>
        </Link>
      </div>

      <PreJoin
        roomUid={roomUid}
        eventName={eventName}
        hostName={hostName}
        attendeeName={attendeeName}
        startTime={startTime}
        endTime={endTime}
        isHostUser={isHostUser}
        onJoinRoom={handleJoin}
        joining={joining}
        error={error}
      />
    </div>
  );
}
