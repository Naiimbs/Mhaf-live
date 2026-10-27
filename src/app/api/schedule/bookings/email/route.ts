import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth/session";
import { sendMeetingConfirmationEmail } from "@/lib/email/mailer";

export async function POST(request: Request) {
  try {
    const currentHost = await getCurrentHost();
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required." }, { status: 400 });
    }

    const booking = await db.findBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // Host or attendee info
    const host = await db.findUserById(booking.hostId);
    const hostName = currentHost?.name || host?.name || "MHAF Live Host";

    const eventType = await db.findEventTypeById(booking.eventTypeId);
    const meetingTitle = eventType?.title || booking.attendeeNotes?.replace("[instant] ", "") || "Réunion MHAF Live";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";
    const roomUrl = `${appUrl}/rooms/${booking.uid}`;

    if (!booking.attendeeEmail || booking.attendeeEmail === "instant@mhaf.live") {
      return NextResponse.json(
        { error: "Cette réservation ne possède pas d'adresse email valide pour le participant." },
        { status: 400 }
      );
    }

    await sendMeetingConfirmationEmail({
      to: booking.attendeeEmail,
      attendeeName: booking.attendeeName,
      meetingTitle,
      startTime: booking.startTime,
      endTime: booking.endTime,
      roomUrl,
      bookingUid: booking.uid,
      hostName,
    });

    return NextResponse.json({
      success: true,
      message: `Email de confirmation envoyé avec succès à ${booking.attendeeEmail}.`,
    });
  } catch (err: any) {
    console.error("[Email Route] Failed to send email:", err);
    return NextResponse.json(
      { error: err.message || "Erreur lors de l'envoi de l'email." },
      { status: 500 }
    );
  }
}
