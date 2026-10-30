import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/lib/db";
import { resolveLiveKitSettings } from "@/lib/livekit/config";
import { getLiveKitLifecycleUpdate } from "@/lib/livekit/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = resolveLiveKitSettings(process.env);
  if (!config.ok) {
    return NextResponse.json({ error: "LiveKit webhook verification is not configured." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return NextResponse.json({ error: "Missing LiveKit webhook authorization." }, { status: 401 });
  }

  let event;
  try {
    const body = await request.text();
    const receiver = new WebhookReceiver(config.settings.apiKey, config.settings.apiSecret);
    event = await receiver.receive(body, authorization);
  } catch {
    return NextResponse.json({ error: "Invalid LiveKit webhook signature or payload." }, { status: 401 });
  }

  const update = getLiveKitLifecycleUpdate(event);
  if (!update) {
    return NextResponse.json({ success: true, processed: false, reason: "No room lifecycle update required." });
  }

  try {
    const result = await db.processLiveKitWebhookEvent(update.eventId, update.roomUid, update.action);
    return NextResponse.json({
      success: true,
      processed: result.processed,
      roomUpdated: result.roomUpdated,
    });
  } catch {
    // Return a failure so LiveKit retries; do not acknowledge an unpersisted event.
    return NextResponse.json({ error: "Could not persist LiveKit webhook event." }, { status: 500 });
  }
}
