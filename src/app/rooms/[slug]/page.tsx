import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth/session";
import { RoomContainer } from "./room-container";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [booking, meeting] = await Promise.all([
    db.getBookingByUid(slug),
    db.getMeetingByUid(slug),
  ]);

  if (!booking && !meeting) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Room Not Found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No scheduled meeting exists with identifier <span className="font-mono font-semibold text-foreground">{slug}</span>.
            Please verify the invitation URL.
          </p>
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/">Back to Homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  const expiryCheck = await db.isRoomExpired(slug);
  const cancelled = booking?.status === "CANCELLED" || meeting?.status === "CANCELLED" || expiryCheck.expired;
  if (cancelled) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-destructive/20 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-destructive">
            {expiryCheck.expired ? "Réunion Expirée" : "Meeting Unavailable"}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {expiryCheck.reason || "This meeting was cancelled or has concluded and cannot be joined."}
          </p>
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/">Return to Homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hostId = booking?.hostId || meeting!.hostId;
  const [host, eventType, currentHost] = await Promise.all([
    db.findUserById(hostId),
    booking ? db.getEventTypeById(booking.eventTypeId) : Promise.resolve(null),
    getCurrentHost(),
  ]);
  const isHostUser = Boolean(currentHost && currentHost.id === hostId);
  const roomUid = booking?.uid || meeting!.uid;
  const startTime = booking?.startTime || meeting!.startTime;
  const endTime = booking?.endTime || meeting!.endTime;

  return (
    <RoomContainer
      roomUid={roomUid}
      eventName={meeting?.title || eventType?.title || "MHAF Live meeting"}
      hostName={host?.name || host?.email || "MHAF Host"}
      attendeeName={meeting?.attendeeName || booking?.attendeeName || "Guest"}
      startTime={new Date(startTime).toISOString()}
      endTime={new Date(endTime).toISOString()}
      isHostUser={isHostUser}
      hasBooking={Boolean(booking)}
    />
  );
}
