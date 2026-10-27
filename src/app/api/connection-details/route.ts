import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AccessToken } from "livekit-server-sdk";
import { db } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth/session";

interface TokenMintRequest {
  roomUid: string;
  requestedName?: string;
}

async function handleConnectionDetails({ roomUid, requestedName }: TokenMintRequest) {
  if (!roomUid) {
    return NextResponse.json({ error: "Room UID is required (parameter: room)." }, { status: 400 });
  }

  const [booking, meeting] = await Promise.all([
    db.getBookingByUid(roomUid),
    db.getMeetingByUid(roomUid),
  ]);
  if (!booking && !meeting) {
    return NextResponse.json(
      { error: "Meeting room not found. Invalid or unrecognized room UID." },
      { status: 404 }
    );
  }

  const hostId = booking?.hostId || meeting!.hostId;
  const startTime = booking?.startTime || meeting!.startTime;
  const endTime = booking?.endTime || meeting!.endTime;
  const isCancelled = booking?.status === "CANCELLED" || meeting?.status === "CANCELLED";
  if (isCancelled) {
    return NextResponse.json({ error: "This meeting has been cancelled and cannot be joined." }, { status: 403 });
  }
  if (meeting?.status === "COMPLETED") {
    return NextResponse.json({ error: "This meeting has concluded and the room is closed." }, { status: 410 });
  }

  const isInstantMeeting = meeting?.source === "INSTANT" || Boolean(
    booking && (booking.uid.startsWith("instant-") || booking.attendeeNotes?.includes("[instant]"))
  );
  const enforceTimeWindow = process.env.ENFORCE_MEETING_TIME_WINDOW !== "false";
  if (enforceTimeWindow) {
    const now = Date.now();
    const startTimeMs = new Date(startTime).getTime();
    const endTimeMs = new Date(endTime).getTime();
    const earlyJoinBufferMs = 15 * 60 * 1000;
    const lateJoinBufferMs = isInstantMeeting ? 0 : 60 * 60 * 1000;

    if (!isInstantMeeting && now < startTimeMs - earlyJoinBufferMs) {
      return NextResponse.json(
        {
          error: "Meeting room is not open yet. Participants may join starting 15 minutes prior to the scheduled start time.",
          joinableAt: new Date(startTimeMs - earlyJoinBufferMs).toISOString(),
          scheduledStart: startTime,
        },
        { status: 403 }
      );
    }
    if (now > endTimeMs + lateJoinBufferMs) {
      return NextResponse.json(
        { error: "This meeting session has concluded and the room is closed.", scheduledEnd: endTime },
        { status: 410 }
      );
    }
  }

  const currentHost = await getCurrentHost();
  const isHost = Boolean(currentHost && currentHost.id === hostId);
  const participantName =
    requestedName?.trim() ||
    (isHost ? currentHost?.name || "Host" : meeting?.attendeeName || booking?.attendeeName || "Guest");
  const participantIdentity = isHost
    ? `host_${currentHost!.id}`
    : `attendee_${randomUUID()}`;

  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
  const livekitUrl =
    process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://127.0.0.1:7880";
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit server credentials are not configured on the server." }, { status: 500 });
  }

  const tokenDeadlineMs = new Date(endTime).getTime() + (isInstantMeeting ? 0 : 60 * 60 * 1000);
  const ttlSeconds = Math.max(60, Math.min(2 * 60 * 60, Math.floor((tokenDeadlineMs - Date.now()) / 1000)));
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: `${ttlSeconds}s`,
  });
  at.addGrant({
    roomJoin: true,
    room: roomUid,
    canPublish: true,
    canSubscribe: true,
    roomAdmin: isHost,
    canPublishData: true,
  });
  const participantToken = await at.toJwt();

  return NextResponse.json({
    serverUrl: livekitUrl,
    participantToken,
    roomName: roomUid,
    isHost,
    participantName,
    participantIdentity,
    meeting: {
      uid: roomUid,
      source: meeting?.source || (isInstantMeeting ? "INSTANT" : "BOOKING"),
      startTime,
      endTime,
      hostId,
      attendeeName: meeting?.attendeeName || booking?.attendeeName || null,
      status: meeting?.status || booking?.status || "SCHEDULED",
    },
    // Kept for older clients that still read this response field.
    booking: booking
      ? {
          uid: booking.uid,
          startTime: booking.startTime,
          endTime: booking.endTime,
          hostId: booking.hostId,
          attendeeName: booking.attendeeName,
          status: booking.status,
        }
      : null,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomUid = searchParams.get("room") || searchParams.get("uid") || "";
    const requestedName = searchParams.get("name") || undefined;
    return handleConnectionDetails({ roomUid, requestedName });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process connection details request." },
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process connection details request." },
      { status: 500 }
    );
  }
}
