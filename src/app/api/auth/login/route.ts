import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Password sign-in is disabled. Request a secure email sign-in link instead." },
    { status: 410 }
  );
}
