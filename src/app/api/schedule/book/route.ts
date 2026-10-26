import { NextResponse } from "next/server";
import { createBooking } from "@/lib/scheduling/booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createBooking(body);

    if (!result.success) {
      const isConflict = result.error.includes("BOOKING_CONFLICT");
      return NextResponse.json(
        { error: result.error },
        { status: isConflict ? 409 : 400 }
      );
    }

    return NextResponse.json(
      { success: true, booking: result.booking },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while booking." },
      { status: 500 }
    );
  }
}
