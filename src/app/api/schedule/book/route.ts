import { NextResponse } from "next/server";
import { createBooking } from "@/lib/scheduling/booking";
import { resolveLiveKitSettings } from "@/lib/livekit/config";

export async function POST(request: Request) {
  try {
    const liveKitConfig = resolveLiveKitSettings(process.env);
    if (!liveKitConfig.ok) {
      return NextResponse.json({ error: liveKitConfig.error }, { status: 503 });
    }

    const body = await request.json();
    const result = await createBooking(body);

    if (!result.success) {
      const isConflict = result.error.includes("BOOKING_CONFLICT") || result.error.includes("TIME_NOT_AVAILABLE");
      return NextResponse.json({ error: result.error }, { status: isConflict ? 409 : 400 });
    }

    try {
      const { sendMeetingConfirmationEmail, sendHostBookingNotificationEmail } = await import("@/lib/email/mailer");
      const { db } = await import("@/lib/db");
      const host = await db.findUserById(result.booking.hostId);
      const eventType = await db.findEventTypeById(result.booking.eventTypeId);
      const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");
      const proto = request.headers.get("x-forwarded-proto") || (hostHeader?.includes("localhost") ? "http" : "https");
      const appUrl = hostHeader ? `${proto}://${hostHeader}` : (process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com");
      const roomUrl = `${appUrl}/rooms/${result.booking.uid}`;

      const cookieHeader = request.headers.get("cookie") || "";
      const cookieLocale = cookieHeader.includes("NEXT_LOCALE=fr") ? "fr" : cookieHeader.includes("NEXT_LOCALE=en") ? "en" : null;
      const locale: "en" | "fr" =
        body.locale === "fr" || body.locale === "en"
          ? body.locale
          : cookieLocale || (request.headers.get("accept-language")?.includes("fr") ? "fr" : "en");

      const emailPromises: Promise<any>[] = [
        sendMeetingConfirmationEmail({
          to: result.booking.attendeeEmail,
          attendeeName: result.booking.attendeeName,
          meetingTitle: eventType?.title || (locale === "fr" ? "Réunion vidéo mhaf meet" : "mhaf meet video meeting"),
          startTime: result.booking.startTime,
          endTime: result.booking.endTime,
          roomUrl,
          bookingUid: result.booking.uid,
          hostName: host?.name || (locale === "fr" ? "Hôte mhaf meet" : "mhaf meet Host"),
          locale,
        }),
      ];

      if (host?.email) {
        emailPromises.push(
          sendHostBookingNotificationEmail({
            to: host.email,
            hostName: host.name || (locale === "fr" ? "Hôte mhaf meet" : "mhaf meet Host"),
            attendeeName: result.booking.attendeeName,
            attendeeEmail: result.booking.attendeeEmail,
            meetingTitle: eventType?.title || (locale === "fr" ? "Réunion vidéo mhaf meet" : "mhaf meet video meeting"),
            startTime: result.booking.startTime,
            endTime: result.booking.endTime,
            roomUrl,
            bookingUid: result.booking.uid,
            notes: (result.booking as any).notes || undefined,
            locale,
          })
        );
      }

      const emailResults = await Promise.allSettled(emailPromises);
      emailResults.forEach((emailResult, index) => {
        if (emailResult.status === "rejected") {
          const emailType = index === 0 ? "attendee_confirmation" : "host_notification";
          const errorMessage =
            emailResult.reason instanceof Error
              ? emailResult.reason.message
              : "Unknown email delivery error";

          // Keep attendee/host addresses and booking details out of logs.
          console.error("[Booking API] Email delivery failed:", {
            emailType,
            message: errorMessage,
          });
        }
      });
    } catch (error) {
      console.warn("[Booking API] Email delivery trigger warning:", error);
    }

    return NextResponse.json({ success: true, booking: result.booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred while booking." },
      { status: 500 }
    );
  }
}
