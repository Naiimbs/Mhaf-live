import { z } from "zod";
import { db } from "@/lib/db";
import { Booking } from "@/lib/db/types";
import { calculateAvailableSlots } from "@/lib/scheduling/slots";
import { getLocalDateString } from "@/lib/scheduling/timezone";

export const CreateBookingSchema = z.object({
  eventTypeId: z.string().min(1, "Event type is required"),
  hostId: z.string().min(1, "Host ID is required"),
  startTimeUtc: z.string().datetime({ message: "Invalid ISO datetime string" }),
  endTimeUtc: z.string().datetime({ message: "Invalid ISO datetime string" }),
  attendeeName: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  attendeeEmail: z.string().trim().email("Valid email address is required").max(254),
  attendeeNotes: z.string().max(1000).optional().nullable(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export async function createBooking(
  input: CreateBookingInput,
  managementTokenHash?: string
): Promise<{ success: true; booking: Booking } | { success: false; error: string }> {
  const parseResult = CreateBookingSchema.safeParse(input);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((issue) => issue.message).join(", ");
    return { success: false, error: `Validation error: ${errorMsg}` };
  }

  const {
    eventTypeId,
    hostId,
    startTimeUtc,
    endTimeUtc,
    attendeeName,
    attendeeEmail,
    attendeeNotes,
  } = parseResult.data;
  const startTime = new Date(startTimeUtc);
  const endTime = new Date(endTimeUtc);

  if (endTime.getTime() <= startTime.getTime()) {
    return { success: false, error: "End time must be after start time." };
  }
  if (startTime.getTime() < Date.now()) {
    return { success: false, error: "Cannot schedule a meeting in the past." };
  }

  const [host, eventType] = await Promise.all([
    db.findUserById(hostId),
    db.findEventTypeById(eventTypeId),
  ]);
  if (!host) return { success: false, error: "Host not found." };
  if (!eventType || eventType.hostId !== hostId || !eventType.isActive) {
    return { success: false, error: "The selected active event type does not belong to this host." };
  }

  const expectedDurationMs = eventType.durationMinutes * 60_000;
  if (endTime.getTime() - startTime.getTime() !== expectedDurationMs) {
    return { success: false, error: "The meeting duration does not match this event type." };
  }

  try {
    const hostDate = getLocalDateString(startTime, host.timezone || "UTC");
    const available = await calculateAvailableSlots({
      hostId,
      eventSlug: eventType.slug,
      dateString: hostDate,
      attendeeTimezone: host.timezone || "UTC",
    });
    const requestedStart = startTime.toISOString();
    const requestedEnd = endTime.toISOString();
    const matchingSlot = available.slots.some(
      (slot) =>
        slot.available &&
        slot.startTimeUtc === requestedStart &&
        slot.endTimeUtc === requestedEnd
    );
    if (!matchingSlot) {
      return {
        success: false,
        error: "TIME_NOT_AVAILABLE: The selected time is outside current availability, too soon, or already occupied.",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to validate current availability.",
    };
  }

  return db.createBookingWithConflictLock({
    eventTypeId,
    hostId,
    meetingTitle: eventType.title,
    attendeeName,
    attendeeEmail: attendeeEmail.toLowerCase(),
    attendeeNotes: attendeeNotes || null,
    startTime,
    endTime,
    bufferBeforeMin: eventType.bufferBeforeMin,
    bufferAfterMin: eventType.bufferAfterMin,
    managementTokenHash,
  });
}
