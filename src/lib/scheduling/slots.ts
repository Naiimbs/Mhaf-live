import { db } from "@/lib/db";
import { EventType, Availability, Booking } from "@/lib/db/types";

export interface AvailableSlot {
  slotId: string;
  startTimeUtc: string; // ISO 8601 string
  endTimeUtc: string;   // ISO 8601 string
  displayTime: string;  // Localized time in attendee's timezone (e.g. "14:00")
  durationMinutes: number;
  available: boolean;
}

export interface SlotGenerationParams {
  hostId: string;
  eventSlug: string;
  dateString: string; // Format: "YYYY-MM-DD"
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

  // 1. Validate date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }

  const [year, month, day] = dateString.split("-").map(Number);
  // Construct date at UTC midnight
  const targetDateUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

  const host = await db.findUserById(hostId);
  if (!host) {
    throw new Error("Host not found.");
  }

  const eventType = await db.getEventTypeBySlug(hostId, eventSlug);
  if (!eventType) {
    throw new Error(`Event type '${eventSlug}' not found for this host.`);
  }

  // 2. Determine day of week in host's timezone (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = targetDateUtc.getUTCDay();

  // 3. Retrieve host's availability for this day of week
  const availabilities = await db.getAvailabilityByHostId(hostId);
  const dayAvailability = availabilities.find((a) => a.dayOfWeek === dayOfWeek);

  if (!dayAvailability) {
    return {
      host: { id: host.id, name: host.name, timezone: host.timezone },
      eventType,
      date: dateString,
      attendeeTimezone,
      slots: [],
    };
  }

  // 4. Parse host working hours e.g. "09:00" to "17:00"
  const [startHour, startMin] = dayAvailability.startTime.split(":").map(Number);
  const [endHour, endMin] = dayAvailability.endTime.split(":").map(Number);

  const hostTimezone = dayAvailability.timezone || host.timezone || "UTC";

  // Construct start & end timestamps in UTC for the host's operating window
  // e.g. target date at 09:00 UTC
  const windowStartUtc = new Date(Date.UTC(year, month - 1, day, startHour, startMin, 0));
  const windowEndUtc = new Date(Date.UTC(year, month - 1, day, endHour, endMin, 0));

  // 5. Retrieve existing confirmed bookings for this host
  const existingBookings = await db.getBookingsByHostId(hostId);
  const activeBookings = existingBookings.filter((b) => b.status !== "CANCELLED");

  // Minimum advance notice buffer: 1 hour from current time
  const minNoticeTime = Date.now() + 60 * 60 * 1000;

  const slots: AvailableSlot[] = [];
  const durationMs = eventType.durationMinutes * 60 * 1000;
  const bufferMs = (eventType.bufferAfterMin || 0) * 60 * 1000;
  const stepMs = durationMs + bufferMs;

  let currentSlotStartMs = windowStartUtc.getTime();
  const windowEndMs = windowEndUtc.getTime();

  // Formatters for display in attendee's timezone
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: attendeeTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  while (currentSlotStartMs + durationMs <= windowEndMs) {
    const slotEndMs = currentSlotStartMs + durationMs;

    // Check if slot is in the past
    const isPast = currentSlotStartMs < minNoticeTime;

    // Check for collision with existing confirmed bookings
    // Overlap: (bookingStart < slotEnd) && (bookingEnd > slotStart)
    const hasCollision = activeBookings.some((b) => {
      const bStart = b.startTime.getTime();
      const bEnd = b.endTime.getTime();
      return bStart < slotEndMs && bEnd > currentSlotStartMs;
    });

    if (!isPast && !hasCollision) {
      const slotStartDate = new Date(currentSlotStartMs);
      const slotEndDate = new Date(slotEndMs);

      slots.push({
        slotId: `slot_${currentSlotStartMs}`,
        startTimeUtc: slotStartDate.toISOString(),
        endTimeUtc: slotEndDate.toISOString(),
        displayTime: timeFormatter.format(slotStartDate),
        durationMinutes: eventType.durationMinutes,
        available: true,
      });
    }

    currentSlotStartMs += stepMs;
  }

  return {
    host: { id: host.id, name: host.name, timezone: host.timezone },
    eventType,
    date: dateString,
    attendeeTimezone,
    slots,
  };
}
