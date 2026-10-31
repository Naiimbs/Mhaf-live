import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { consumeE2EMagicLink } from "@/lib/email/mailer";
import { getE2EAuthHarnessSecret } from "@/lib/e2e-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const configuredSecret = getE2EAuthHarnessSecret();
  const suppliedSecret = request.headers.get("x-mhaf-e2e-secret") || "";

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "The E2E harness is disabled outside development." }, { status: 404 });
  }
  if (!configuredSecret) {
    return NextResponse.json({ error: "The E2E harness secret is not configured on the server." }, { status: 503 });
  }
  if (!suppliedSecret) {
    return NextResponse.json({ error: "The E2E harness secret header is missing." }, { status: 401 });
  }

  const expected = Buffer.from(configuredSecret);
  const supplied = Buffer.from(suppliedSecret);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return NextResponse.json({ error: "The E2E harness secret does not match." }, { status: 403 });
  }

  const email = request.nextUrl.searchParams.get("email") || "";
  if (!email || email.length > 254) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const url = consumeE2EMagicLink(email);
  if (!url) {
    return NextResponse.json({ error: "No captured magic link was found." }, { status: 404 });
  }

  return NextResponse.json({ url });
}
