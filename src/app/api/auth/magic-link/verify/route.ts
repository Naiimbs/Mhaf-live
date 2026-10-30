import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHostSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json({ error: "This sign-in link is invalid or has expired." }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await db.consumeMagicLinkToken(tokenHash);
    if (!user) {
      return NextResponse.json({ error: "This sign-in link is invalid or has expired." }, { status: 400 });
    }

    await createHostSession(user);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth] Magic-link verification failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We could not verify this sign-in link. Please request a new one." }, { status: 500 });
  }
}
