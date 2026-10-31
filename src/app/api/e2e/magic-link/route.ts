import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { consumeE2EMagicLink } from "@/lib/email/mailer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const configuredSecret = process.env.MHAF_E2E_AUTH_HARNESS_SECRET;
  const suppliedSecret = request.headers.get("x-mhaf-e2e-secret") || "";

  if (process.env.NODE_ENV !== "development" || !configuredSecret) {
    return new NextResponse(null, { status: 404 });
  }

  const expected = Buffer.from(configuredSecret);
  const supplied = Buffer.from(suppliedSecret);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return new NextResponse(null, { status: 404 });
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
