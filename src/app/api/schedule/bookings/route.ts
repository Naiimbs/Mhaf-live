import { NextResponse } from "next/server";
import { getCurrentHost } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sendBookingChangeResultEmail } from "@/lib/email/mailer";

export async function GET() {
  const host = await getCurrentHost();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [bookings, requests] = await Promise.all([db.getBookingsByHostId(host.id), db.getBookingChangeRequestsByHostId(host.id)]);
  const changeRequests = await Promise.all(requests.map(async (item) => {
    const booking = await db.findBookingById(item.bookingId);
    const eventType = booking ? await db.findEventTypeById(booking.eventTypeId) : null;
    return { ...item, booking: booking ? { id: booking.id, uid: booking.uid, attendeeName: booking.attendeeName, attendeeEmail: booking.attendeeEmail, startTime: booking.startTime, endTime: booking.endTime, status: booking.status, title: eventType?.title || "MHAF Live meeting" } : null };
  }));
  return NextResponse.json({ bookings, changeRequests });
}

export async function POST(request: Request) {
  const host = await getCurrentHost();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId, action } = await request.json();

    if (action === "CANCEL") {
      const cancelled = await db.cancelBooking(bookingId, host.id);
      return NextResponse.json({ success: true, booking: cancelled });
    }

    if (action === "REVIEW_REQUEST") {
      if (typeof body.requestId !== "string" || !["APPROVE", "REJECT"].includes(body.decision)) {
        return NextResponse.json({ error: "A valid request ID and decision are required." }, { status: 400 });
      }
      const changeRequest = await db.resolveBookingChangeRequest({ requestId: body.requestId, hostId: host.id, decision: body.decision, hostResponse: typeof body.hostResponse === "string" ? body.hostResponse : undefined });
      const booking = await db.findBookingById(changeRequest.bookingId);
      let attendeeNotified = false;
      if (booking && booking.attendeeEmail) {
        const eventType = await db.findEventTypeById(booking.eventTypeId);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        try {
          await sendBookingChangeResultEmail({ to: booking.attendeeEmail, attendeeName: booking.attendeeName, meetingTitle: eventType?.title || "MHAF Live meeting", decision: changeRequest.status as "APPROVED" | "REJECTED", type: changeRequest.type, startTime: booking.startTime, roomUrl: appUrl + "/rooms/" + booking.uid });
          attendeeNotified = true;
        } catch (emailError) {
          console.error("[Booking Requests] Attendee decision email failed:", emailError instanceof Error ? emailError.message : "Unknown error");
        }
      }
      return NextResponse.json({ success: true, request: changeRequest, attendeeNotified });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process booking update." },
      { status: 500 }
    );
  }
}
