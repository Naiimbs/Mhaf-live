import { z } from "zod";
import { db } from "@/lib/db";
import { Booking } from "@/lib/db/types";

export const CreateBookingSchema = z.object({
  eventTypeId: z.string().min(1, "Event type is required"),
  hostId: z.string().min(1, "Host ID is required"),
  startTimeUtc: z.string().datetime({ message: "Invalid ISO datetime string" }),
  endTimeUtc: z.string().datetime({ message: "Invalid ISO datetime string" }),
  attendeeName: z.string().min(2, "Name must be at least 2 characters"),
  attendeeEmail: z.string().email("Valid email address is required"),
  attendeeNotes: z.string().max(1000).optional().nullable(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export async function createBooking(
  input: CreateBookingInput
): Promise<{ success: true; booking: Booking } | { success: false; error: string }> {
  // 1. Validate payload
  const parseResult = CreateBookingSchema.safeParse(input);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.errors.map((e) => e.message).join(", ");
    return { success: false, error: `Validation error: ${errorMsg}` };
  }

  const { eventTypeId, hostId, startTimeUtc, endTimeUtc, attendeeName, attendeeEmail, attendeeNotes } =
    parseResult.data;

  const startTime = new Date(startTimeUtc);
  const endTime = new Date(endTimeUtc);

  // 2. Validate bounds
  if (endTime.getTime() <= startTime.getTime()) {
    return { success: false, error: "End time must be after start time." };
  }

  if (startTime.getTime() < Date.now()) {
    return { success: false, error: "Cannot schedule a meeting in the past." };
  }

  // 3. Verify host exists
  const host = await db.findUserById(hostId);
  if (!host) {
    return { success: false, error: "Host not found." };
  }

  // 4. Delegate to atomic database conflict lock
  const result = await db.createBookingWithConflictLock({
    eventTypeId,
    hostId,
    attendeeName,
    attendeeEmail,
    attendeeNotes: attendeeNotes || null,
    startTime,
    endTime,
  });

  return result;
}
