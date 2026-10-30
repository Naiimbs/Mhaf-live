import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CheckCircle2, Calendar, Clock, User, Mail, Video, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { ConfirmationView } from "./confirmation-view";

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

  return (
    <ConfirmationView
      booking={{
        uid: booking.uid,
        attendeeName: booking.attendeeName,
        attendeeEmail: booking.attendeeEmail,
        startTime: new Date(booking.startTime).toISOString(),
        endTime: new Date(booking.endTime).toISOString(),
        status: booking.status,
      }}
      host={host ? { name: host.name, email: host.email } : null}
    />
  );
}
