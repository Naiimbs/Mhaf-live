import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const currentHost = await getCurrentHost();
    const defaultHost =
      (await db.findUserByEmail("host@mhaf.live")) ||
      (await db.findUserById("host_default_01"));
    const hostId = currentHost?.id || defaultHost?.id || "host_default_01";

    const body = await request.json().catch(() => ({}));
    const roomTitle = body.title || "Instant Meeting";
    const attendeeName = body.attendeeName || undefined;

    const booking = await db.createInstantRoom({
      hostId,
      roomName: roomTitle,
      attendeeName,
    });

    return NextResponse.json(
      {
        success: true,
        roomUid: booking.uid,
        roomUrl: `/rooms/${booking.uid}`,
        booking,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create instant meeting room." },
      { status: 500 }
    );
  }
}
