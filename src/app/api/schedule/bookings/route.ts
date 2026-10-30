import { NextResponse } from "next/server";
import { getCurrentHost } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sendBookingChangeResultEmail } from "@/lib/email/mailer";
import { calculateAvailableSlots } from "@/lib/scheduling/slots";
import { getLocalDateString } from "@/lib/scheduling/timezone";

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
    const body = await request.json();
    const { bookingId, action } = body;

    if (action === "CANCEL") {
      const cancelled = await db.cancelBooking(bookingId, host.id);
      return NextResponse.json({ success: true, booking: cancelled });
    }

    if (action === "REVIEW_REQUEST") {
      if (typeof body.requestId !== "string" || !["APPROVE", "REJECT"].includes(body.decision)) {
        return NextResponse.json({ error: "A valid request ID and decision are required." }, { status: 400 });
      }
      if (body.decision === "APPROVE") {
        const pending = await db.getBookingChangeRequestById(body.requestId, host.id);
        if (!pending) return NextResponse.json({ error: "Change request not found." }, { status: 404 });
        if (pending.type === "RESCHEDULE" && pending.requestedStartTime) {
          const original = await db.findBookingById(pending.bookingId);
          const eventType = original ? await db.findEventTypeById(original.eventTypeId) : null;
          if (!original || !eventType) return NextResponse.json({ error: "Original booking details are unavailable." }, { status: 404 });
          const requestedStart = pending.requestedStartTime;
          const requestedEnd = new Date(requestedStart.getTime() + eventType.durationMinutes * 60_000);
          const dateString = getLocalDateString(requestedStart, host.timezone || "UTC");
          const availability = await calculateAvailableSlots({ hostId: host.id, eventSlug: eventType.slug, dateString, attendeeTimezone: host.timezone || "UTC" });
          const isAvailable = availability.slots.some((slot) => slot.available && slot.startTimeUtc === requestedStart.toISOString() && slot.endTimeUtc === requestedEnd.toISOString());
          if (!isAvailable) return NextResponse.json({ error: "The requested time is no longer available in your schedule. Ask the attendee to suggest another time." }, { status: 409 });
        }
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
