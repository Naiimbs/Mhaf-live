import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/db/demo-requests";
import { extractClientIp } from "@/lib/client-ip";
import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email/mailer";

export const runtime = "nodejs";
const TOKEN_TTL_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  // Apply the IP limit before parsing the body or looking up an account.
  // This is process-local and intended for the current single-container deployment.
  const clientIp = extractClientIp(request);
  const ipLimit = checkRateLimit(`magic-link:ip:${clientIp}`, 10, 15 * 60 * 1000);

  if (!ipLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many sign-in requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": ipLimit.resetSeconds.toString() },
      }
    );
  }

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const user = await db.findUserByEmail(email);
    if (user && !(await db.hasRecentMagicLinkToken(user.id, new Date(Date.now() - 60 * 1000)))) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expires = new Date(Date.now() + TOKEN_TTL_MS);
      const storedToken = await db.createMagicLinkToken(user.id, tokenHash, expires);

      // Never email a token unless its hash was successfully persisted.
      // A null result means the per-account request limit has been reached.
      if (storedToken) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
        const link = new URL("/auth/verify", appUrl);
        link.searchParams.set("token", rawToken);
        await sendMagicLinkEmail(user.email, link.toString());
      }
    }

    // Keep the response identical for existing and unknown addresses.
    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a sign-in link will arrive shortly.",
    });
  } catch (error) {
    console.error("[auth] Magic-link request failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "We could not send the sign-in link right now. Please try again later." },
      { status: 503 }
    );
  }
}
