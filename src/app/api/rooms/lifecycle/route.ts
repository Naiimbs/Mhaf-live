import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const roomUid = body.roomUid || body.room || body.uid;
    const action = body.action || "LEAVE";

    if (!roomUid) {
      return NextResponse.json({ error: "roomUid is required." }, { status: 400 });
    }

    if (action === "LEAVE") {
      await db.recordRoomParticipantLeave(roomUid);
      return NextResponse.json({ success: true, action: "LEAVE", roomUid });
    } else if (action === "JOIN") {
      await db.recordRoomParticipantJoin(roomUid);
      return NextResponse.json({ success: true, action: "JOIN", roomUid });
    }

    return NextResponse.json({ error: "Invalid action. Expected LEAVE or JOIN." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record room lifecycle." },
      { status: 500 }
    );
  }
}
