import type { Booking, EventType, Meeting } from "../db/types";

/** Keep in sync with the duration used when an instant room is created. */
export const INSTANT_MEETING_DURATION_MS = 2 * 60 * 60 * 1000;

export interface BookingConflictRange {
  startMs: number;
  endMs: number;
}

export function isLegacyInstantBooking(booking: Booking): boolean {
  return (
    booking.eventTypeId === "evt_instant" ||
    booking.id.startsWith("bkg_instant_") ||
    booking.uid.startsWith("instant-") ||
    (booking.attendeeNotes?.trimStart().startsWith("[instant]") === true &&
      booking.attendeeEmail.trim().toLowerCase() === "instant@mhaf.live")
  );
}

/**
 * Return the protected interval for a booking, or null when it must not block
 * new scheduling. Legacy instant rooms were stored as 24-hour bookings; use
 * the current two-hour instant-room lifetime instead of preserving that stale
 * duration as a calendar reservation.
 */
export function getBookingConflictRange(
  booking: Booking,
  eventTypesById: ReadonlyMap<string, EventType>
): BookingConflictRange | null {
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") return null;

  const startMs = booking.startTime.getTime();
  const storedEndMs = booking.endTime.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(storedEndMs) || storedEndMs <= startMs) {
    return null;
  }

  if (isLegacyInstantBooking(booking)) {
    const endMs = Math.min(storedEndMs, startMs + INSTANT_MEETING_DURATION_MS);
    return endMs > startMs ? { startMs, endMs } : null;
  }

  const eventType = eventTypesById.get(booking.eventTypeId);
  const beforeMs = Math.max(0, eventType?.bufferBeforeMin || 0) * 60_000;
  const afterMs = Math.max(0, eventType?.bufferAfterMin || 0) * 60_000;
  return { startMs: startMs - beforeMs, endMs: storedEndMs + afterMs };
}

/**
 * Check whether a scheduled (MANUAL) meeting conflicts with another active
 * scheduled manual meeting for the same host. Ad-hoc instant meetings are
 * excluded from scheduled conflict checks.
 */
export function hasScheduledMeetingConflict(
  existingMeetings: readonly Meeting[],
  hostId: string,
  startMs: number,
  endMs: number
): boolean {
  return existingMeetings.some(
    (meeting) =>
      meeting.hostId === hostId &&
      meeting.source === "MANUAL" &&
      meeting.status !== "CANCELLED" &&
      meeting.status !== "COMPLETED" &&
      meeting.startTime.getTime() < endMs &&
      meeting.endTime.getTime() > startMs
  );
}

