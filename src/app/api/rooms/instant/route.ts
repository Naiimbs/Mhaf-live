import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth/session";

const InstantMeetingSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
});

export async function POST(request: Request) {
  const host = await getCurrentHost();
  if (!host) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = InstantMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Meeting title must be between 2 and 100 characters." }, { status: 400 });
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    const result = await db.createMeetingWithConflictLock({
      hostId: host.id,
      title: parsed.data.title || "Instant meeting",
      source: "INSTANT",
      startTime,
      endTime,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json(
      { success: true, meeting: result.meeting, roomUid: result.meeting.uid, roomUrl: `/rooms/${result.meeting.uid}` },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create instant meeting." },
      { status: 500 }
    );
  }
}
