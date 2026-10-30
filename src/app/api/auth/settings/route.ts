import { NextResponse } from "next/server";
import { getCurrentHost } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isValidTimeZone } from "@/lib/scheduling/timezone";

export async function PATCH(request: Request) {
  try {
    const host = await getCurrentHost();
    if (!host) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { timezone } = body;

    if (!timezone || typeof timezone !== "string") {
      return NextResponse.json({ error: "Timezone is required." }, { status: 400 });
    }

    const trimmedTz = timezone.trim();
    if (!isValidTimeZone(trimmedTz)) {
      return NextResponse.json({ error: "Invalid IANA timezone identifier." }, { status: 400 });
    }

    const updated = await db.updateUserTimezone(host.id, trimmedTz);

    return NextResponse.json({
      success: true,
      timezone: updated.timezone,
    });
  } catch (error: any) {
    console.error("[Settings API] Failed to update settings:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
