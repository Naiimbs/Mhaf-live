import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth/session";
import { sendMeetingConfirmationEmail } from "@/lib/email/mailer";

export async function POST(request: Request) {
  try {
    const currentHost = await getCurrentHost();
    if (!currentHost) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    if (booking.hostId !== currentHost.id) return NextResponse.json({ error: "You are not authorized to send this booking email." }, { status: 403 });
    const host = await db.findUserById(booking.hostId);
    const hostName = host?.name || "MHAF Live Host";

    const eventType = await db.findEventTypeById(booking.eventTypeId);
    const meetingTitle = eventType?.title || booking.attendeeNotes?.replace("[instant] ", "") || "Réunion MHAF Live";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";
    const roomUrl = `${appUrl}/rooms/${booking.uid}`;
    const managementToken = randomBytes(32).toString("base64url");
    const managementTokenHash = createHash("sha256").update(managementToken).digest("hex");

    if (!booking.attendeeEmail || booking.attendeeEmail === "instant@mhaf.live") {
      return NextResponse.json(
        { error: "Cette réservation ne possède pas d'adresse email valide pour le participant." },
        { status: 400 }
      );
    }

    await db.updateBookingManagementToken(booking.id, managementTokenHash, new Date(Date.now() + 180 * 24 * 60 * 60_000));
    try {
    await sendMeetingConfirmationEmail({
      to: booking.attendeeEmail,
      attendeeName: booking.attendeeName,
      meetingTitle,
      startTime: booking.startTime,
      endTime: booking.endTime,
      roomUrl,
      bookingUid: booking.uid,
      managementUrl: `${appUrl}/book/manage/${managementToken}`,
      hostName,
    });
    await db.updateBookingConfirmationEmail(booking.id, true, null);
    } catch (emailError) {
      await db.updateBookingConfirmationEmail(booking.id, false, emailError instanceof Error ? emailError.message : "Email delivery failed.");
      throw emailError;
    }

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
