import { NextResponse } from "next/server";
import { getCurrentHost } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  const host = await getCurrentHost();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await db.getBookingsByHostId(host.id);
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const host = await getCurrentHost();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId, action } = await request.json();

    if (action === "CANCEL") {
      const cancelled = await db.cancelBooking(bookingId, host.id);
      return NextResponse.json({ success: true, booking: cancelled });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process booking update." },
      { status: 500 }
    );
  }
}
