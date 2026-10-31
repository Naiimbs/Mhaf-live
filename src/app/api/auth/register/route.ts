import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/db/demo-requests";
import { extractClientIp } from "@/lib/client-ip";
import { sendMagicLinkEmail } from "@/lib/email/mailer";

export const runtime = "nodejs";
const TOKEN_TTL_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request);
  const ipLimit = checkRateLimit(`register:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, {
      status: 429,
      headers: { "Retry-After": ipLimit.resetSeconds.toString() },
    });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const timezone = typeof body.timezone === "string" ? body.timezone : "UTC";
    const locale: "en" | "fr" = body.locale === "fr" ? "fr" : "en";

    if (!name || name.length > 120) {
      return NextResponse.json({ error: "Enter your name (up to 120 characters)." }, { status: 400 });
    }
    if (!email || email.length > 254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      return NextResponse.json({ error: "Choose a valid timezone." }, { status: 400 });
    }

    const emailLimit = checkRateLimit(`register:email:${email}`, 3, 60 * 60 * 1000);
    if (!emailLimit.allowed) {
      return NextResponse.json({ error: "Too many registration attempts for this email. Please try again later." }, {
        status: 429,
        headers: { "Retry-After": emailLimit.resetSeconds.toString() },
      });
    }

    let user = await db.findUserByEmail(email);
    if (!user) {
      user = await db.createUser({
        name,
        email,
        emailVerified: null,
        passwordHash: "",
        role: "HOST",
        timezone,
      });
    }

    if (!user.emailVerified && !(await db.hasRecentMagicLinkToken(user.id, new Date(Date.now() - 60 * 1000)))) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const stored = await db.createMagicLinkToken(user.id, tokenHash, new Date(Date.now() + TOKEN_TTL_MS));
      if (stored) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
        const link = new URL("/auth/verify", appUrl);
        link.searchParams.set("token", rawToken);
        await sendMagicLinkEmail(email, link.toString(), locale);
      }
    }

    return NextResponse.json({
      success: true,
      message: locale === "fr"
        ? "Si cette adresse peut être utilisée, un lien de vérification vous sera envoyé."
        : "If this address can be used, a verification link will be sent shortly.",
    }, { status: 202 });
  } catch (error) {
    console.error("[auth] Passwordless registration failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({
      error: "We could not start registration right now. If your account was created, request a sign-in link from the login page.",
    }, { status: 503 });
  }
}
