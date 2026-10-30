import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentHost } from "@/lib/auth/session";
import { db } from "@/lib/db";

const CreateEventTypeSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters.").max(100),
  durationMinutes: z.coerce.number().int().min(5, "Duration must be at least 5 minutes.").max(480, "Duration cannot exceed 8 hours."),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/i, "Slug must contain only alphanumeric characters and hyphens.").max(60).optional().or(z.literal("")),
  bufferBeforeMin: z.coerce.number().int().min(0).max(60).optional(),
  bufferAfterMin: z.coerce.number().int().min(0).max(60).optional(),
  recipientEmail: z.string().trim().email("Enter a valid recipient email.").max(254).optional().or(z.literal("")),
});

export async function GET() {
  const host = await getCurrentHost();
  if (!host) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const eventTypes = await db.getEventTypesByHostId(host.id);
    return NextResponse.json({ success: true, eventTypes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load booking links." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const host = await getCurrentHost();
  if (!host) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = CreateEventTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid booking link details." },
        { status: 400 }
      );
    }

    const eventType = await db.createEventType({
      hostId: host.id,
      title: parsed.data.title,
      slug: parsed.data.slug || undefined,
      description: parsed.data.description || null,
      durationMinutes: parsed.data.durationMinutes,
      bufferBeforeMin: parsed.data.bufferBeforeMin,
      bufferAfterMin: parsed.data.bufferAfterMin,
    });

    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin);
    const bookingUrl = `${appUrl}/book/${encodeURIComponent(host.id)}/${encodeURIComponent(eventType.slug)}`;

    let emailSent = false;
    let emailError: string | null = null;
    if (parsed.data.recipientEmail) {
      try {
        const { sendBookingLinkEmail } = await import("@/lib/email/mailer");
        await sendBookingLinkEmail({
          to: parsed.data.recipientEmail,
          hostName: host.name || "Your meeting host",
          title: eventType.title,
          durationMinutes: eventType.durationMinutes,
          bookingUrl,
        });
        emailSent = true;
      } catch (error) {
        emailError = error instanceof Error ? error.message : "Email delivery failed.";
        console.error("[Booking Link API] Invitation email failed:", { message: emailError });
      }
    }

    return NextResponse.json({ success: true, eventType, bookingUrl, emailSent, emailError }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create booking link." },
      { status: 500 }
    );
  }
}
