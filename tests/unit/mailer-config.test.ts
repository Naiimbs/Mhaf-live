import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  getMeetingEmailFrom,
  sendMeetingConfirmationEmail,
  sendHostBookingNotificationEmail,
  sendBookingReminderEmail,
  sendBookingChangeRequestNotification,
  sendBookingChangeResultEmail,
  sendBookingReminderEmail,
  sendBookingChangeRequestNotification,
} from "../../src/lib/email/mailer.ts";

const smtpEnv = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const;
const previousValues = new Map(smtpEnv.map((key) => [key, process.env[key]]));

for (const key of smtpEnv) delete process.env[key];

// Restore the process environment even if the test fails.
after(() => {
  for (const key of smtpEnv) {
    const value = previousValues.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("confirmation email refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(
    sendMeetingConfirmationEmail({
      to: "guest@example.test",
      attendeeName: "Guest",
      meetingTitle: "Test meeting",
      startTime: new Date("2030-01-01T10:00:00Z"),
      endTime: new Date("2030-01-01T10:30:00Z"),
      roomUrl: "/rooms/test-room",
      bookingUid: "test-booking",
    }),
    /Email delivery is not configured\. Missing: SMTP_HOST, SMTP_USER, SMTP_PASS\./
  );
});

test("host notification email refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(
    sendHostBookingNotificationEmail({
      to: "host@example.test",
      hostName: "Host",
      attendeeName: "Client",
      attendeeEmail: "client@example.test",
      meetingTitle: "Consultation",
      startTime: new Date("2030-01-01T10:00:00Z"),
      endTime: new Date("2030-01-01T10:30:00Z"),
      roomUrl: "/rooms/test-room",
      bookingUid: "test-booking",
    }),
    /Email delivery is not configured\. Missing: SMTP_HOST, SMTP_USER, SMTP_PASS\./
  );
});

test("confirmation email forces meet branding while preserving the configured sender address", () => {
  assert.equal(
    getMeetingEmailFrom("MHAF Live <notifications@example.com>", "smtp@example.com"),
    "meet <notifications@example.com>"
  );
  assert.equal(getMeetingEmailFrom(undefined, "smtp@example.com"), "meet <smtp@example.com>");
});
test("booking reminder email refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(sendBookingReminderEmail({ to: "guest@example.test", attendeeName: "Guest", meetingTitle: "Test meeting", startTime: new Date("2030-01-01T10:00:00Z"), roomUrl: "/rooms/test-room", minutesBefore: 15 }));
});

test("booking change request notification refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(sendBookingChangeRequestNotification({ to: "host@example.test", attendeeName: "Guest", attendeeEmail: "guest@example.test", meetingTitle: "Test meeting", type: "CANCEL", reason: "A sufficiently detailed reason.", dashboardUrl: "/dashboard/bookings" }));
});

test("booking reminder email refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(
    sendBookingReminderEmail({
      to: "guest@example.test",
      attendeeName: "Guest",
      meetingTitle: "Test meeting",
      startTime: new Date("2030-01-01T10:00:00Z"),
      roomUrl: "/rooms/test-room",
      minutesBefore: 15,
    }),
    /Email delivery is not configured\\. Missing: SMTP_HOST, SMTP_USER, SMTP_PASS\\./
  );
});

test("booking change request notification refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(
    sendBookingChangeRequestNotification({
      to: "host@example.test",
      attendeeName: "Guest",
      attendeeEmail: "guest@example.test",
      meetingTitle: "Test meeting",
      type: "CANCEL",
      reason: "A valid reason for testing.",
      dashboardUrl: "https://example.test/dashboard/bookings",
    }),
    /Email delivery is not configured\\. Missing: SMTP_HOST, SMTP_USER, SMTP_PASS\\./
  );
});

test("booking change result notification refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(
    sendBookingChangeResultEmail({
      to: "guest@example.test",
      attendeeName: "Guest",
      meetingTitle: "Test meeting",
      decision: "APPROVED",
      type: "CANCEL",
      startTime: new Date("2030-01-01T10:00:00Z"),
      roomUrl: "https://example.test/rooms/test-room",
    }),
    /Email delivery is not configured\\. Missing: SMTP_HOST, SMTP_USER, SMTP_PASS\\./
  );
});
