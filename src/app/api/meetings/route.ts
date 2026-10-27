import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentHost } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { localDateTimeToUtc } from "@/lib/scheduling/timezone";

const CreateMeetingSchema = z.object({
  title: z.string().trim().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  attendeeName: z.string().trim().max(120).optional().or(z.literal("")),
  attendeeEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
}).refine((value) => !value.attendeeEmail || Boolean(value.attendeeName), {
  message: "Add an invitee name when providing an email address.",
  path: ["attendeeName"],
});

export async function POST(request: Request) {
  const host = await getCurrentHost();
  if (!host) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (body?.action === "CANCEL") {
      if (typeof body.meetingId !== "string" || !body.meetingId) {
        return NextResponse.json({ error: "Meeting ID is required." }, { status: 400 });
      }
      const meeting = await db.cancelMeeting(body.meetingId, host.id);
      return NextResponse.json({ success: true, meeting });
    }

    const parsed = CreateMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid meeting details." }, { status: 400 });
    }

    const startTime = localDateTimeToUtc(parsed.data.date, parsed.data.time, host.timezone || "UTC");
    if (!startTime) {
      return NextResponse.json({ error: "That local time does not exist in the host time zone (check daylight-saving changes)." }, { status: 400 });
    }
    const endTime = new Date(startTime.getTime() + parsed.data.durationMinutes * 60_000);
    const result = await db.createMeetingWithConflictLock({
      hostId: host.id,
      title: parsed.data.title,
      source: "MANUAL",
      startTime,
      endTime,
      attendeeName: parsed.data.attendeeName,
      attendeeEmail: parsed.data.attendeeEmail,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json(
      { success: true, meeting: result.meeting, roomUrl: `/rooms/${result.meeting.uid}` },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create meeting." },
      { status: 500 }
    );
  }
}
