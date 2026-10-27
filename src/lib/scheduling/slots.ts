import { db } from "@/lib/db";
import { EventType } from "@/lib/db/types";
import {
  getWeekdayForLocalDate,
  isValidTimeZone,
  localDateTimeToUtc,
} from "./timezone";

export interface AvailableSlot {
  slotId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  displayTime: string;
  durationMinutes: number;
  available: boolean;
}

export interface SlotGenerationParams {
  hostId: string;
  eventSlug: string;
  dateString: string;
  attendeeTimezone?: string;
}

export async function calculateAvailableSlots(
  params: SlotGenerationParams
): Promise<{
  host: { id: string; name: string | null; timezone: string };
  eventType: EventType;
  date: string;
  attendeeTimezone: string;
  slots: AvailableSlot[];
}> {
  const { hostId, eventSlug, dateString, attendeeTimezone = "UTC" } = params;
  const dayOfWeek = getWeekdayForLocalDate(dateString);
  if (dayOfWeek === null) throw new Error("Invalid date. Expected a real date in YYYY-MM-DD format.");
  if (!isValidTimeZone(attendeeTimezone)) throw new Error("Invalid attendee time zone.");

  const host = await db.findUserById(hostId);
  if (!host) throw new Error("Host not found.");

  const eventType = await db.getEventTypeBySlug(hostId, eventSlug);
  if (!eventType || !eventType.isActive) {
    throw new Error(`Active event type '${eventSlug}' not found for this host.`);
  }

  const hostTimezone = host.timezone || "UTC";
  if (!isValidTimeZone(hostTimezone)) throw new Error("Host time zone is invalid.");

  const [allAvailability, allBookings, allMeetings, eventTypes] = await Promise.all([
    db.getAvailabilityByHostId(hostId),
    db.getBookingsByHostId(hostId),
    db.getMeetingsByHostId(hostId),
    db.getEventTypesByHostId(hostId),
  ]);
  const eventTypeById = new Map(eventTypes.map((item) => [item.id, item]));
  const dayAvailability = allAvailability.filter((item) => item.dayOfWeek === dayOfWeek);
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: attendeeTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const minNoticeTime = Date.now() + 60 * 60 * 1000;
  const durationMs = eventType.durationMinutes * 60_000;
  const bufferBeforeMs = Math.max(0, eventType.bufferBeforeMin || 0) * 60_000;
  const bufferAfterMs = Math.max(0, eventType.bufferAfterMin || 0) * 60_000;
  const stepMs = durationMs + bufferBeforeMs + bufferAfterMs;
  const activeBookings = allBookings.filter((booking) => booking.status !== "CANCELLED");
  const activeMeetings = allMeetings.filter(
    (meeting) =>
      meeting.source !== "BOOKING" &&
      meeting.status !== "CANCELLED" &&
      meeting.status !== "COMPLETED"
  );
  const slots: AvailableSlot[] = [];

  for (const availability of dayAvailability) {
    const windowStart = localDateTimeToUtc(dateString, availability.startTime, hostTimezone);
    const windowEnd = localDateTimeToUtc(dateString, availability.endTime, hostTimezone);
    if (!windowStart || !windowEnd || windowEnd.getTime() <= windowStart.getTime()) continue;

    const windowStartMs = windowStart.getTime();
    const windowEndMs = windowEnd.getTime();
    let slotStartMs = windowStartMs + bufferBeforeMs;

    while (slotStartMs + durationMs + bufferAfterMs <= windowEndMs) {
      const slotEndMs = slotStartMs + durationMs;
      const protectedStartMs = slotStartMs - bufferBeforeMs;
      const protectedEndMs = slotEndMs + bufferAfterMs;
      const isTooSoon = slotStartMs < minNoticeTime;
      const bookingCollision = activeBookings.some((booking) => {
        const existingType = eventTypeById.get(booking.eventTypeId);
        const existingStartMs = booking.startTime.getTime() - Math.max(0, existingType?.bufferBeforeMin || 0) * 60_000;
        const existingEndMs = booking.endTime.getTime() + Math.max(0, existingType?.bufferAfterMin || 0) * 60_000;
        return existingStartMs < protectedEndMs && existingEndMs > protectedStartMs;
      });
      const meetingCollision = activeMeetings.some(
        (meeting) =>
          meeting.startTime.getTime() < protectedEndMs &&
          meeting.endTime.getTime() > protectedStartMs
      );

      if (!isTooSoon && !bookingCollision && !meetingCollision) {
        const start = new Date(slotStartMs);
        const end = new Date(slotEndMs);
        slots.push({
          slotId: `slot_${slotStartMs}`,
          startTimeUtc: start.toISOString(),
          endTimeUtc: end.toISOString(),
          displayTime: timeFormatter.format(start),
          durationMinutes: eventType.durationMinutes,
          available: true,
        });
      }

      slotStartMs += stepMs;
    }
  }

  slots.sort((a, b) => Date.parse(a.startTimeUtc) - Date.parse(b.startTimeUtc));
  return {
    host: { id: host.id, name: host.name, timezone: hostTimezone },
    eventType,
    date: dateString,
    attendeeTimezone,
    slots,
  };
}
