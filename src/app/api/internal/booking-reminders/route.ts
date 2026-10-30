import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sendBookingReminderEmail } from "@/lib/email/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.BOOKING_REMINDER_CRON_SECRET || "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length < 32 || suppliedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(suppliedBytes, expectedBytes);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const due = await db.getBookingsDueForReminders(new Date());
  let sent = 0;
  let failed = 0;
  for (const item of due) {
    const booking = item.booking;
    if (!booking.attendeeEmail || booking.attendeeEmail === "instant@mhaf.live") continue;
    try {
      const [host, eventType] = await Promise.all([
        db.findUserById(booking.hostId),
        db.findEventTypeById(booking.eventTypeId),
      ]);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
      await sendBookingReminderEmail({
        to: booking.attendeeEmail,
        attendeeName: booking.attendeeName,
        meetingTitle: eventType?.title || "MHAF Live meeting",
        startTime: booking.startTime,
        roomUrl: appUrl + "/rooms/" + booking.uid,
        minutesBefore: item.reminder,
        timezone: host?.timezone || "Europe/Paris",
      });
      await db.markBookingReminderSent(booking.id, item.reminder);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("[Booking Reminders] Delivery failed:", { bookingId: booking.id, reminder: item.reminder, message: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return NextResponse.json({ success: true, due: due.length, sent, failed });
}
