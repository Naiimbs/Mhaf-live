import { NextResponse } from "next/server";
import { createBooking } from "@/lib/scheduling/booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createBooking(body);

    if (!result.success) {
      const isConflict = result.error.includes("BOOKING_CONFLICT") || result.error.includes("TIME_NOT_AVAILABLE");
      return NextResponse.json({ error: result.error }, { status: isConflict ? 409 : 400 });
    }

    try {
      const { sendMeetingConfirmationEmail } = await import("@/lib/email/mailer");
      const { db } = await import("@/lib/db");
      const host = await db.findUserById(result.booking.hostId);
      const eventType = await db.findEventTypeById(result.booking.eventTypeId);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";
      await sendMeetingConfirmationEmail({
        to: result.booking.attendeeEmail,
        attendeeName: result.booking.attendeeName,
        meetingTitle: eventType?.title || "MHAF Live meeting",
        startTime: result.booking.startTime,
        endTime: result.booking.endTime,
        roomUrl: `${appUrl}/rooms/${result.booking.uid}`,
        bookingUid: result.booking.uid,
        hostName: host?.name || "MHAF Live Host",
      }).catch((mailError) => console.error("[Booking API] Non-fatal email error:", mailError));
    } catch (error) {
      console.warn("[Booking API] Email delivery trigger warning:", error);
    }

    return NextResponse.json({ success: true, booking: result.booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred while booking." },
      { status: 500 }
    );
  }
}
