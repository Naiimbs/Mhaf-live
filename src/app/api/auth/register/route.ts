import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Password-based registration is disabled. Use the passwordless email-link flow instead." },
    { status: 410 }
  );
}
