import { NextResponse } from "next/server";
import { calculateAvailableSlots } from "@/lib/scheduling/slots";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hostId = searchParams.get("hostId");
    const eventSlug = searchParams.get("eventSlug");
    const date = searchParams.get("date");
    const timezone = searchParams.get("timezone") || "UTC";

    if (!hostId || !eventSlug || !date) {
      return NextResponse.json(
        { error: "Missing required query parameters: hostId, eventSlug, and date are required." },
        { status: 400 }
      );
    }

    const result = await calculateAvailableSlots({
      hostId,
      eventSlug,
      dateString: date,
      attendeeTimezone: timezone,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to calculate slots." },
      { status: 500 }
    );
  }
}
