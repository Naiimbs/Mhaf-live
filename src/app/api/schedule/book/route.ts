import { NextResponse } from "next/server";
import { createBooking } from "@/lib/scheduling/booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createBooking(body);

    if (!result.success) {
      const isConflict = result.error.includes("BOOKING_CONFLICT");
      return NextResponse.json(
        { error: result.error },
        { status: isConflict ? 409 : 400 }
      );
    }

    // Try sending confirmation email asynchronously
    try {
      const { sendMeetingConfirmationEmail } = await import("@/lib/email/mailer");
      const { db } = await import("@/lib/db");
      const host = await db.findUserById(result.booking.hostId);
      const eventType = await db.findEventTypeById(result.booking.eventTypeId);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";

      await sendMeetingConfirmationEmail({
        to: result.booking.attendeeEmail,
        attendeeName: result.booking.attendeeName,
        meetingTitle: eventType?.title || "Réunion MHAF Live",
        startTime: result.booking.startTime,
        endTime: result.booking.endTime,
        roomUrl: `${appUrl}/rooms/${result.booking.uid}`,
        bookingUid: result.booking.uid,
        hostName: host?.name || "MHAF Live Host",
      }).catch((mailErr) => {
        console.error("[Booking API] Non-fatal email error:", mailErr);
      });
    } catch (e) {
      console.warn("[Booking API] Email delivery trigger warning:", e);
    }

    return NextResponse.json(
      { success: true, booking: result.booking },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while booking." },
      { status: 500 }
    );
  }
}
