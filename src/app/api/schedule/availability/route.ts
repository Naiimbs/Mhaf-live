import { NextResponse } from "next/server";
import { getCurrentHost } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isValidTimeZone } from "@/lib/scheduling/timezone";

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
    const body = await request.json();
    const { availabilities, timezone } = body ?? {};

    if (!Array.isArray(availabilities) || availabilities.length > 42) {
      return NextResponse.json(
        { error: "Availabilities must be an array containing no more than 42 intervals." },
        { status: 400 }
      );
    }

    if (timezone !== undefined && (typeof timezone !== "string" || !isValidTimeZone(timezone))) {
      return NextResponse.json({ error: "Enter a valid IANA timezone." }, { status: 400 });
    }

    const defaultTimezone = timezone || host.timezone || "UTC";
    const validatedAvailabilities: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      timezone: string;
    }> = [];

    for (const item of availabilities) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return NextResponse.json({ error: "Each availability interval must be an object." }, { status: 400 });
      }

      if (!Number.isInteger(item.dayOfWeek) || item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        return NextResponse.json({ error: "Invalid dayOfWeek (must be an integer from 0 to 6)." }, { status: 400 });
      }

      const validTime = (value: unknown): value is string =>
        typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

      if (!validTime(item.startTime) || !validTime(item.endTime)) {
        return NextResponse.json({ error: "Times must be valid 24-hour HH:mm values." }, { status: 400 });
      }

      if (item.endTime <= item.startTime) {
        return NextResponse.json(
          { error: "End time must be after start time for every operating interval." },
          { status: 400 }
        );
      }

      const intervalTimezone = item.timezone ?? defaultTimezone;
      if (typeof intervalTimezone !== "string" || !isValidTimeZone(intervalTimezone)) {
        return NextResponse.json({ error: "Each interval must use a valid IANA timezone." }, { status: 400 });
      }

      validatedAvailabilities.push({
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        timezone: intervalTimezone,
      });
    }

    if (timezone) {
      await db.updateUserTimezone(host.id, timezone);
    }

    const updated = await db.updateAvailability(host.id, validatedAvailabilities);

    return NextResponse.json({
      success: true,
      timezone: timezone || host.timezone,
      availabilities: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update availability.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
