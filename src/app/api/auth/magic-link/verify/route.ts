import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHostSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawToken = url.searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
    return NextResponse.redirect(new URL("/login?magicLink=invalid", request.url));
  }

  try {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const user = await db.consumeMagicLinkToken(tokenHash);
    if (!user) {
      return NextResponse.redirect(new URL("/login?magicLink=invalid", request.url));
    }

    await createHostSession(user);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("[auth] Magic-link verification failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.redirect(new URL("/login?magicLink=error", request.url));
  }
}
