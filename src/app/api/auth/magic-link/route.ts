import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/db/demo-requests";
import { extractClientIp } from "@/lib/client-ip";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/session";
import { sendMagicLinkEmail } from "@/lib/email/mailer";

export const runtime = "nodejs";
const TOKEN_TTL_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  // This in-memory limiter is scoped to the current single-container deployment.
  const clientIp = extractClientIp(request);
  const ipLimit = checkRateLimit(`magic-link:ip:${clientIp}`, 10, 15 * 60 * 1000);

  if (!ipLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many sign-in requests. Please try again later." },
      { status: 429, headers: { "Retry-After": ipLimit.resetSeconds.toString() } }
    );
  }

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "UTC";

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (body.name !== undefined && (name.length < 2 || name.length > 120)) {
      return NextResponse.json({ error: "Enter a name between 2 and 120 characters." }, { status: 400 });
    }

    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      return NextResponse.json({ error: "Enter a valid timezone." }, { status: 400 });
    }

    const requestedLocale: "en" | "fr" =
      body.locale === "fr" || request.cookies.get("NEXT_LOCALE")?.value === "fr" ? "fr" : "en";

    let user = await db.findUserByEmail(email);

    // Login is only for existing accounts. Unknown addresses must use registration.
    // This intentionally reveals account existence because the product requires
    // a clear login-versus-signup flow; rate limiting remains in place above.
    if (!user && !name) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_NOT_FOUND",
          error:
            requestedLocale === "fr"
              ? "Aucun compte n'est associé à cette adresse e-mail. Créez un compte pour continuer."
              : "No account is registered with this email. Create an account to continue.",
        },
        { status: 404 }
      );
    }

    // Supplying a name means this is a registration request. New accounts stay
    // unverified and cannot access the host workspace until the email link is used.
    if (!user && name) {
      const passwordHash = await hashPassword(randomBytes(32).toString("hex"));
      try {
        user = await db.createUser({
          name,
          email,
          emailVerified: null,
          passwordHash,
          role: "HOST",
          timezone,
        });
      } catch {
        // Another request may have created the same email between lookup and insert.
        user = await db.findUserByEmail(email);
      }
    }

    if (user && !(await db.hasRecentMagicLinkToken(user.id, new Date(Date.now() - 60 * 1000)))) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expires = new Date(Date.now() + TOKEN_TTL_MS);
      const storedToken = await db.createMagicLinkToken(user.id, tokenHash, expires);

      if (storedToken) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
        const link = new URL("/auth/verify", appUrl);
        link.searchParams.set("token", rawToken);
        try {
          await sendMagicLinkEmail(user.email, link.toString(), requestedLocale);
        } catch (error) {
          // A token must not suppress retries when its email was never accepted by SMTP.
          await db.deleteMagicLinkToken(storedToken.id);
          throw error;
        }
      }
    }

    // Keep the response identical for existing and unknown addresses.
    return NextResponse.json({
      success: true,
      message:
        requestedLocale === "fr"
          ? "Si cette adresse peut recevoir un lien de connexion, un e-mail vous parviendra sous peu."
          : "If this address can receive a sign-in link, an email will arrive shortly.",
    });
  } catch (error) {
    const mailError = error as {
      name?: string;
      code?: string;
      command?: string;
      responseCode?: number;
    };
    console.error("[auth] Magic-link request failed:", {
      name: mailError?.name || "UnknownError",
      code: mailError?.code,
      command: mailError?.command,
      responseCode: mailError?.responseCode,
    });
    return NextResponse.json(
      { error: "We could not send the sign-in link right now. Please try again later." },
      { status: 503 }
    );
  }
}
