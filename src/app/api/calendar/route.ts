import { NextResponse } from "next/server";
import { getCurrentHost } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getWeekdayForLocalDate, getLocalDateString } from "@/lib/scheduling/timezone";

export async function GET(request: Request) {
  const host = await getCurrentHost();
  if (!host) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if ((from && getWeekdayForLocalDate(from) === null) || (to && getWeekdayForLocalDate(to) === null)) {
    return NextResponse.json({ error: "Date range must use valid YYYY-MM-DD values." }, { status: 400 });
  }

  try {
    const [meetings, bookings, eventTypes] = await Promise.all([
      db.getMeetingsByHostId(host.id),
      db.getBookingsByHostId(host.id),
      db.getEventTypesByHostId(host.id),
    ]);
    const linkedBookingIds = new Set(
      meetings.map((meeting) => meeting.bookingId).filter((id): id is string => Boolean(id))
    );
    const titleByEventType = new Map(eventTypes.map((eventType) => [eventType.id, eventType.title]));

    const events = [
      ...meetings.map((meeting) => ({
        id: meeting.id,
        uid: meeting.uid,
        title: meeting.title,
        source: meeting.source,
        bookingId: meeting.bookingId,
        attendeeName: meeting.attendeeName,
        attendeeEmail: meeting.attendeeEmail,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        status: meeting.status,
      })),
      ...bookings
        .filter((booking) => !linkedBookingIds.has(booking.id))
        .map((booking) => ({
          id: booking.id,
          uid: booking.uid,
          title: titleByEventType.get(booking.eventTypeId) || "Booked meeting",
          source: "BOOKING" as const,
          bookingId: booking.id,
          attendeeName: booking.attendeeName,
          attendeeEmail: booking.attendeeEmail,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          status: booking.status === "CANCELLED" ? "CANCELLED" : booking.status === "COMPLETED" ? "COMPLETED" : "SCHEDULED",
        })),
    ].filter((event) => {
      const localDate = getLocalDateString(new Date(event.startTime), host.timezone || "UTC");
      return (!from || localDate >= from) && (!to || localDate <= to);
    });

    return NextResponse.json({ events, timezone: host.timezone || "UTC" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load calendar." },
      { status: 500 }
    );
  }
}
