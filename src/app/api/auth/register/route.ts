import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/db/demo-requests";
import { extractClientIp } from "@/lib/client-ip";
import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email/mailer";

export const runtime = "nodejs";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);
  const rateLimit = checkRateLimit(`host-registration:${clientIp}`, 5, 60 * 60 * 1000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": rateLimit.resetSeconds.toString() },
      }
    );
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "UTC";
    const locale: "en" | "fr" = body.locale === "fr" ? "fr" : "en";

    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Enter your name (up to 100 characters)." }, { status: 400 });
    }

    if (!email || email.length > 254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    } catch {
      return NextResponse.json({ error: "Choose a valid timezone." }, { status: 400 });
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in to continue." },
        { status: 409 }
      );
    }

    // Passwordless accounts deliberately have no password hash. The existing
    // password login helper rejects empty hashes; all new access uses magic links.
    const user = await db.createUser({
      name,
      email,
      emailVerified: null,
      passwordHash: "",
      role: "HOST",
      timezone,
    });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + MAGIC_LINK_TTL_MS);
    const storedToken = await db.createMagicLinkToken(user.id, tokenHash, expires);

    if (!storedToken) {
      return NextResponse.json(
        { error: "We could not prepare your sign-in link. Please use the sign-in page to request a new one." },
        { status: 503 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
    const magicLink = new URL("/auth/verify", appUrl);
    magicLink.searchParams.set("token", rawToken);

    await sendMagicLinkEmail(email, magicLink.toString(), locale);

    return NextResponse.json({
      success: true,
      message:
        locale === "fr"
          ? "Votre compte est prêt. Consultez votre boîte mail pour confirmer votre adresse et accéder à votre espace."
          : "Your account is ready. Check your inbox to verify your email and access your dashboard.",
    }, { status: 201 });
  } catch (error) {
    console.error("[auth] Host registration failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "We could not complete registration right now. Please try again or sign in if you already have an account." },
      { status: 503 }
    );
  }
}
