import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth/session";
import { RoomContainer } from "./room-container";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, ArrowLeft } from "lucide-react";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let booking = await db.getBookingByUid(slug);

  // Auto-provision instant room if requested via instant-* slug
  if (!booking && slug.startsWith("instant-")) {
    const defaultHost =
      (await db.findUserByEmail("host@mhaf.live")) ||
      (await db.findUserById("host_default_01"));
    booking = await db.createInstantRoom({
      hostId: defaultHost?.id || "host_default_01",
      roomName: "Instant Video Meeting",
      uid: slug,
    });
  }

  // 1. Not Found State
  if (!booking) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Room Not Found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No active video conferencing room exists with identifier <span className="font-mono font-semibold text-foreground">{slug}</span>. Please verify the URL or check your booking confirmation.
          </p>
          <div className="pt-2">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/">Back to Homepage</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Cancelled Booking State
  if (booking.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-destructive/20 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-destructive">Meeting Cancelled</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This reservation was marked as cancelled by the host and cannot be joined.
          </p>
          <div className="pt-2">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/">Return to Homepage</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Fetch Related Data
  const host = await db.findUserById(booking.hostId);
  const eventType = await db.getEventTypeById(booking.eventTypeId);
  const currentHost = await getCurrentHost();
  const isHostUser = Boolean(currentHost && currentHost.id === booking.hostId);

  return (
    <RoomContainer
      roomUid={booking.uid}
      eventName={eventType?.title || "Live Consultation"}
      hostName={host?.name || host?.email || "MHAF Host"}
      attendeeName={booking.attendeeName}
      startTime={new Date(booking.startTime).toISOString()}
      endTime={new Date(booking.endTime).toISOString()}
      isHostUser={isHostUser}
    />
  );
}
