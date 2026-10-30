import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendBookingChangeRequestNotification } from "@/lib/email/mailer";

type Context = { params: Promise<{ token: string }> };
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function GET(_request: Request, context: Context) {
  const { token } = await context.params;
  const booking = await db.getBookingByManagementTokenHash(hashToken(token));
  if (!booking || booking.status !== "CONFIRMED" || booking.startTime.getTime() <= Date.now()) {
    return NextResponse.json({ error: "This booking management link is invalid, expired, or inactive." }, { status: 404 });
  }
  const [host, eventType, requests] = await Promise.all([
    db.findUserById(booking.hostId),
    db.findEventTypeById(booking.eventTypeId),
    db.getBookingChangeRequestsByHostId(booking.hostId),
  ]);
  const pendingRequest = requests.find((item) => item.bookingId === booking.id && item.status === "PENDING") || null;
  return NextResponse.json({
    booking: {
      uid: booking.uid,
      attendeeName: booking.attendeeName,
      attendeeEmail: booking.attendeeEmail,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      title: eventType?.title || "MHAF Live meeting",
      hostName: host?.name || "Your host",
    },
    pendingRequest: pendingRequest ? { type: pendingRequest.type, createdAt: pendingRequest.createdAt.toISOString() } : null,
  });
}

const RequestSchema = z.object({
  type: z.enum(["CANCEL", "RESCHEDULE"]),
  reason: z.string().trim().min(10, "Please provide a reason of at least 10 characters.").max(1500),
  requestedStartTime: z.string().datetime().optional(),
}).superRefine((value, ctx) => {
  if (value.type === "RESCHEDULE" && !value.requestedStartTime) {
    ctx.addIssue({ code: "custom", path: ["requestedStartTime"], message: "Choose a preferred new date and time." });
  }
});

export async function POST(request: Request, context: Context) {
  const { token } = await context.params;
  const booking = await db.getBookingByManagementTokenHash(hashToken(token));
  if (!booking || booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "This booking management link is invalid, expired, or inactive." }, { status: 404 });
  }
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 });
    const changeRequest = await db.createBookingChangeRequest({
      tokenHash: hashToken(token),
      type: parsed.data.type,
      reason: parsed.data.reason,
      requestedStartTime: parsed.data.requestedStartTime ? new Date(parsed.data.requestedStartTime) : null,
    });
    let hostNotified = false;
    const host = await db.findUserById(booking.hostId);
    const eventType = await db.findEventTypeById(booking.eventTypeId);
    if (host?.email) {
      try {
        await sendBookingChangeRequestNotification({
          to: host.email,
          attendeeName: booking.attendeeName,
          attendeeEmail: booking.attendeeEmail,
          meetingTitle: eventType?.title || "MHAF Live meeting",
          type: changeRequest.type,
          reason: changeRequest.reason,
          requestedStartTime: changeRequest.requestedStartTime,
          dashboardUrl: (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin) + "/dashboard/bookings",
        });
        hostNotified = true;
      } catch (error) {
        console.error("[Booking Management] Host notification email failed:", error instanceof Error ? error.message : "Unknown error");
      }
    }
    return NextResponse.json({ success: true, request: changeRequest, hostNotified }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit booking request." }, { status: 400 });
  }
}
