import { NextResponse } from "next/server";

// Browser lifecycle signals are untrusted: only signed LiveKit webhooks may
// update room attendance or the 15-minute room-expiry clock.
export async function POST() {
  return NextResponse.json(
    { error: "Room lifecycle updates are accepted only from verified LiveKit webhooks." },
    { status: 410 }
  );
}
