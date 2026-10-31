import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/db/demo-requests";
import { extractClientIp } from "@/lib/client-ip";
import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email/mailer";

export const runtime = "nodejs";
const TOKEN_TTL_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);
  const ipLimit = checkRateLimit(`register:ip:${clientIp}`, 5, 60 * 60 * 1000);

  if (!ipLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": ipLimit.resetSeconds.toString() } }
    );
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const timezone = typeof body.timezone === "string" ? body.timezone : "UTC";
    const locale: "en" | "fr" = body.locale === "fr" ? "fr" : "en";

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: "Enter a valid name." }, { status: 400 });
    }
    if (!email || email.length > 254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      return NextResponse.json({ error: "Enter a valid timezone." }, { status: 400 });
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

    if (!(await db.hasRecentMagicLinkToken(user.id, new Date(Date.now() - 60 * 1000)))) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const storedToken = await db.createMagicLinkToken(user.id, tokenHash, new Date(Date.now() + TOKEN_TTL_MS));
      if (storedToken) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
        const link = new URL("/auth/verify", appUrl);
        link.searchParams.set("token", rawToken);
        await sendMagicLinkEmail(email, link.toString(), locale);
      }
    }

    return NextResponse.json({
      success: true,
      message: locale === "fr"
        ? "Si cette adresse peut être utilisée, un lien sécurisé sera envoyé par e-mail."
        : "If this email can be used, a secure sign-in link will be sent shortly.",
    }, { status: 200 });
  } catch (error) {
    console.error("[auth] Registration request failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "We could not send the sign-in link right now. Please try again later." },
      { status: 503 }
    );
  }
}
