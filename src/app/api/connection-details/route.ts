import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { db } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth/session";

interface TokenMintRequest {
  roomUid: string;
  requestedName?: string;
}

async function handleConnectionDetails(params: TokenMintRequest) {
  const { roomUid, requestedName } = params;

  if (!roomUid) {
    return NextResponse.json(
      { error: "Room UID is required (parameter: room)." },
      { status: 400 }
    );
  }

  // 1. Authoritative Booking Validation
  const booking = await db.getBookingByUid(roomUid);
  if (!booking) {
    return NextResponse.json(
      { error: "Meeting room not found. Invalid or unrecognized reservation UID." },
      { status: 404 }
    );
  }

  // 2. Booking Status Enforcement
  if (booking.status === "CANCELLED") {
    return NextResponse.json(
      { error: "This meeting has been cancelled and cannot be joined." },
      { status: 403 }
    );
  }

  // 3. Joining Window Time Enforcement
  const now = Date.now();
  const startTimeMs = new Date(booking.startTime).getTime();
  const endTimeMs = new Date(booking.endTime).getTime();

  // Allow joining up to 15 minutes before scheduled start
  const EARLY_JOIN_BUFFER_MS = 15 * 60 * 1000;
  // Room stays open until 60 minutes after scheduled end
  const LATE_JOIN_BUFFER_MS = 60 * 60 * 1000;

  if (now < startTimeMs - EARLY_JOIN_BUFFER_MS) {
    const allowedAt = new Date(startTimeMs - EARLY_JOIN_BUFFER_MS).toISOString();
    return NextResponse.json(
      {
        error: "Meeting room is not open yet. Participants may join starting 15 minutes prior to the scheduled start time.",
        joinableAt: allowedAt,
        scheduledStart: booking.startTime,
      },
      { status: 403 }
    );
  }

  if (now > endTimeMs + LATE_JOIN_BUFFER_MS) {
    return NextResponse.json(
      {
        error: "This meeting session has concluded and the room is closed.",
        scheduledEnd: booking.endTime,
      },
      { status: 410 }
    );
  }

  // 4. Participant Role & Identity Resolution
  const currentHost = await getCurrentHost();
  const isHost = Boolean(currentHost && currentHost.id === booking.hostId);

  const participantName =
    requestedName?.trim() ||
    (isHost ? currentHost?.name || "Host" : booking.attendeeName || "Attendee");

  const participantIdentity = isHost
    ? `host_${currentHost!.id}`
    : `attendee_${booking.id}_${Math.random().toString(36).substring(2, 7)}`;

  // 5. Server-side LiveKit Token Minting
  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
  const livekitUrl =
    process.env.LIVEKIT_URL ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    "ws://127.0.0.1:7880";

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LiveKit server credentials are not configured on the server." },
      { status: 500 }
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: "2h",
  });

  at.addGrant({
    roomJoin: true,
    room: booking.uid,
    canPublish: true,
    canSubscribe: true,
    roomAdmin: isHost,
    canPublishData: true,
  });

  const participantToken = await at.toJwt();

  return NextResponse.json({
    serverUrl: livekitUrl,
    participantToken,
    roomName: booking.uid,
    isHost,
    participantName,
    participantIdentity,
    booking: {
      uid: booking.uid,
      startTime: booking.startTime,
      endTime: booking.endTime,
      hostId: booking.hostId,
      attendeeName: booking.attendeeName,
      status: booking.status,
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomUid = searchParams.get("room") || searchParams.get("uid") || "";
    const requestedName = searchParams.get("name") || undefined;

    return handleConnectionDetails({ roomUid, requestedName });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process connection details request." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const roomUid = body.room || body.uid || body.roomUid || "";
    const requestedName = body.name || undefined;

    return handleConnectionDetails({ roomUid, requestedName });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process connection details request." },
      { status: 500 }
    );
  }
}
