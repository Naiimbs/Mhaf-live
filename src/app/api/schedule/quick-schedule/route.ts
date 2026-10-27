import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth/session";
import { sendMeetingConfirmationEmail } from "@/lib/email/mailer";
import { Booking } from "@/lib/db/types";

export async function POST(request: Request) {
  try {
    const currentHost = await getCurrentHost();
    const defaultHost =
      (await db.findUserByEmail("host@mhaf.live")) ||
      (await db.findUserById("host_default_01")) ||
      (await db.findUserById("host_admin_01"));
    const hostId = currentHost?.id || defaultHost?.id || "host_default_01";
    const hostName = currentHost?.name || defaultHost?.name || "MHAF Live Host";

    const body = await request.json();
    const {
      attendeeName,
      attendeeEmail,
      title = "Réunion MHAF Live",
      startTime,
      durationMinutes = 30,
      notes,
    } = body;

    if (!attendeeName || !attendeeName.trim()) {
      return NextResponse.json({ error: "Le nom du participant est requis." }, { status: 400 });
    }

    if (!attendeeEmail || !attendeeEmail.includes("@")) {
      return NextResponse.json({ error: "Une adresse email valide est requise." }, { status: 400 });
    }

    if (!startTime) {
      return NextResponse.json({ error: "La date et l'heure de début sont requises." }, { status: 400 });
    }

    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Format de date invalide." }, { status: 400 });
    }

    const duration = parseInt(String(durationMinutes), 10) || 30;
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const uid = `mhaf-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const booking: Booking = {
      id: `bkg_sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      uid,
      eventTypeId: "evt_scheduled",
      hostId,
      attendeeName: attendeeName.trim(),
      attendeeEmail: attendeeEmail.trim().toLowerCase(),
      attendeeNotes: notes ? `[${title}] ${notes}` : title,
      startTime: start,
      endTime: end,
      status: "CONFIRMED",
      createdAt: now,
      updatedAt: now,
    };

    // Store in database
    (db as any).data.bookings.push(booking);
    (db as any).persist();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";
    const roomUrl = `${appUrl}/rooms/${uid}`;

    // Send confirmation email via OVH SMTP
    let emailSent = false;
    let emailError: string | null = null;
    try {
      await sendMeetingConfirmationEmail({
        to: booking.attendeeEmail,
        attendeeName: booking.attendeeName,
        meetingTitle: title,
        startTime: booking.startTime,
        endTime: booking.endTime,
        roomUrl,
        bookingUid: booking.uid,
        hostName,
      });
      emailSent = true;
    } catch (err: any) {
      console.error("[Quick Schedule] Email dispatch error:", err);
      emailError = err.message || "Impossible d'envoyer l'email.";
    }

    return NextResponse.json(
      {
        success: true,
        roomUid: uid,
        roomUrl: `/rooms/${uid}`,
        fullRoomUrl: roomUrl,
        booking,
        emailSent,
        emailError,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Quick Schedule] Error:", err);
    return NextResponse.json(
      { error: err.message || "Erreur lors de la programmation de la réunion." },
      { status: 500 }
    );
  }
}
