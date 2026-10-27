import { NextResponse } from "next/server";
import { getCurrentHost } from "@/lib/auth/session";

export async function POST() {
  const host = await getCurrentHost();
  if (!host) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { error: "Quick scheduling has moved. Create a scheduled meeting from the host calendar." },
    { status: 410 }
  );
}
