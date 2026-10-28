import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CheckCircle2, Calendar, Clock, User, Mail, Video, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const booking = await db.getBookingByUid(uid);

  if (!booking) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            !
          </div>
          <h1 className="text-xl font-bold">Booking Not Found</h1>
          <p className="text-xs text-muted-foreground">
            No active reservation exists with UID <span className="font-mono">{uid}</span>.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const host = await db.findUserById(booking.hostId);
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md px-4 py-3">
        <div className="container max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="meet home">
            <BrandLogo size="small" />
          </Link>
          <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold">
            ✓ Reservation Confirmed
          </span>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <div className="rounded-3xl border border-border bg-card shadow-sm p-6 sm:p-10 space-y-8">
          {/* Header Status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-border pb-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                You're Scheduled!
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                A calendar invitation and confirmation details have been committed to the database.
              </p>
            </div>
          </div>

          {/* Booking Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-3">
              <span className="text-xs font-mono uppercase text-muted-foreground">
                Session Details
              </span>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{start.toDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>
                    {start.toTimeString().substring(0, 5)} – {end.toTimeString().substring(0, 5)} (UTC)
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-3">
              <span className="text-xs font-mono uppercase text-muted-foreground">
                Participants
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Host: {host?.name || host?.email || "MHAF Host"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span>Attendee: {booking.attendeeName} ({booking.attendeeEmail})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meeting Room Identity & High-Assurance Architecture Notice */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-mono uppercase text-muted-foreground">
                Meeting Room Identifier
              </span>
              <span className="text-[11px] font-mono bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold">
                UID: {booking.uid}
              </span>
            </div>

            <div className="rounded-xl bg-muted/60 p-3.5 flex items-start gap-3 text-xs text-muted-foreground font-mono">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">End-to-End Meeting Room Provisioning</p>
                <p className="mt-1 font-sans text-xs">
                  This session is bound to dedicated room token <strong>{booking.uid}</strong>.
                  Upon phase activation, both host and attendee join directly through WebRTC LiveKit
                  without external bridge plugins.
                </p>
              </div>
            </div>
          </div>

          {/* Join Meeting Action */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-foreground">Ready for your call?</h2>
              <p className="text-xs text-muted-foreground">
                Enter the PreJoin room to test your camera, microphone, and audio levels.
              </p>
            </div>
            <Button asChild size="default" className="gap-2 shadow-sm shrink-0 font-bold" id="enter-room-btn">
              <Link href={`/rooms/${booking.uid}`}>
                <Video className="h-4 w-4" />
                <span>Enter PreJoin Room</span>
              </Link>
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Homepage
              </Link>
            </Button>

            <span className="text-xs text-muted-foreground font-mono">
              Status: <strong className="text-emerald-500 uppercase">{booking.status}</strong>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
