import { NextResponse } from "next/server";
import { getCurrentHost } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  const host = await getCurrentHost();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const availabilities = await db.getAvailabilityByHostId(host.id);
  return NextResponse.json({
    host: { id: host.id, name: host.name, timezone: host.timezone },
    availabilities,
  });
}

export async function POST(request: Request) {
  const host = await getCurrentHost();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { availabilities, timezone } = await request.json();

    if (!Array.isArray(availabilities)) {
      return NextResponse.json(
        { error: "Availabilities must be an array of schedule intervals." },
        { status: 400 }
      );
    }

    // Validate each interval
    for (const item of availabilities) {
      if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        return NextResponse.json({ error: "Invalid dayOfWeek (must be 0-6)." }, { status: 400 });
      }
      if (!/^\d{2}:\d{2}$/.test(item.startTime) || !/^\d{2}:\d{2}$/.test(item.endTime)) {
        return NextResponse.json({ error: "Times must be in HH:mm format." }, { status: 400 });
      }
      if (item.endTime <= item.startTime) {
        return NextResponse.json(
          { error: "End time must be after start time for every operating day." },
          { status: 400 }
        );
      }
    }

    if (timezone) {
      await db.updateUserTimezone(host.id, timezone);
    }

    const updated = await db.updateAvailability(host.id, availabilities);

    return NextResponse.json({
      success: true,
      timezone: timezone || host.timezone,
      availabilities: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update availability." },
      { status: 500 }
    );
  }
}
