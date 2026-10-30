import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email/mailer";

const TOKEN_TTL_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const user = await db.findUserByEmail(email);
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expires = new Date(Date.now() + TOKEN_TTL_MS);
      await db.createMagicLinkToken(user.id, tokenHash, expires);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
      if (!appUrl) {
        console.error("[auth] Magic-link email skipped: NEXT_PUBLIC_APP_URL is not configured.");
        return NextResponse.json({ error: "We could not send your sign-in link. Please try again later." }, { status: 503 });
      }
      const link = new URL("/api/auth/magic-link/verify", appUrl);
      link.searchParams.set("token", rawToken);
      try {
        await sendMagicLinkEmail(user.email, link.toString());
      } catch (error) {
        console.error("[auth] Magic-link email delivery failed:", error instanceof Error ? error.message : "Unknown mail error");
        return NextResponse.json({ error: "We could not send your sign-in link. Please try again later." }, { status: 503 });
      }
    }

    // Same response for known and unknown addresses to avoid account enumeration.
    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a sign-in link will arrive shortly.",
    });
  } catch (error) {
    console.error("[auth] Magic-link request failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We could not process your request. Please try again later." }, { status: 500 });
  }
}
