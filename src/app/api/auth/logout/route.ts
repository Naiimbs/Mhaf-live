import { NextResponse } from "next/server";
import { logoutHost } from "@/lib/auth/session";

export async function POST() {
  await logoutHost();
  return NextResponse.json({ success: true, message: "Logged out successfully." });
}
