import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  getMeetingEmailFrom,
  sendMeetingConfirmationEmail,
  sendHostBookingNotificationEmail,
  sendBookingReminderEmail,
  sendBookingChangeRequestNotification,
  sendBookingChangeResultEmail,
  renderEmailHeader,
  renderEmailFooter,
  getEmailBrandAttachments,
} from "../../src/lib/email/mailer.ts";

const smtpEnv = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const;
const previousValues = new Map(smtpEnv.map((key) => [key, process.env[key]]));

for (const key of smtpEnv) delete process.env[key];

after(() => {
  for (const key of smtpEnv) {
    const value = previousValues.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const missingSmtp = /Email delivery is not configured\. Missing: SMTP_HOST, SMTP_USER, SMTP_PASS\./;

test("confirmation email refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(sendMeetingConfirmationEmail({
    to: "guest@example.test", attendeeName: "Guest", meetingTitle: "Test meeting",
    startTime: new Date("2030-01-01T10:00:00Z"), endTime: new Date("2030-01-01T10:30:00Z"),
    roomUrl: "/rooms/test-room", bookingUid: "test-booking",
  }), missingSmtp);
});

test("host notification email refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(sendHostBookingNotificationEmail({
    to: "host@example.test", hostName: "Host", attendeeName: "Client",
    attendeeEmail: "client@example.test", meetingTitle: "Consultation",
    startTime: new Date("2030-01-01T10:00:00Z"), endTime: new Date("2030-01-01T10:30:00Z"),
    roomUrl: "/rooms/test-room", bookingUid: "test-booking",
  }), missingSmtp);
});

test("confirmation email forces meet branding while preserving the configured sender address", () => {
  assert.equal(getMeetingEmailFrom("MHAF Live <notifications@example.com>", "smtp@example.com"), "meet <notifications@example.com>");
  assert.equal(getMeetingEmailFrom(undefined, "smtp@example.com"), "meet <smtp@example.com>");
});

test("booking reminder email refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(sendBookingReminderEmail({
    to: "guest@example.test", attendeeName: "Guest", meetingTitle: "Test meeting",
    startTime: new Date("2030-01-01T10:00:00Z"), roomUrl: "/rooms/test-room", minutesBefore: 15,
  }), missingSmtp);
});

test("booking change request notification refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(sendBookingChangeRequestNotification({
    to: "host@example.test", attendeeName: "Guest", attendeeEmail: "guest@example.test",
    meetingTitle: "Test meeting", type: "CANCEL", reason: "A valid reason for testing.",
    dashboardUrl: "https://example.test/dashboard/bookings",
  }), missingSmtp);
});

test("booking change result notification refuses to send when SMTP credentials are missing", async () => {
  await assert.rejects(sendBookingChangeResultEmail({
    to: "guest@example.test", attendeeName: "Guest", meetingTitle: "Test meeting",
    decision: "APPROVED", type: "CANCEL", startTime: new Date("2030-01-01T10:00:00Z"),
    roomUrl: "https://example.test/rooms/test-room",
  }), missingSmtp);
});

test("email header renders brand icon and logo without outer border", () => {
  const header = renderEmailHeader("TEST BADGE");
  assert.ok(header.includes('src="cid:meet-icon"'), "must include cid:meet-icon");
  assert.ok(header.includes('src="cid:meet-logo"'), "must include cid:meet-logo");
  assert.ok(header.includes("TEST BADGE"), "must render badge text");
  assert.ok(!header.includes("background: #ffffff"), "must not add white background box around logo");
});

test("email brand attachments provide both icon and white logo", () => {
  const attachments = getEmailBrandAttachments();
  assert.ok(attachments && attachments.length >= 2, "must provide at least 2 brand attachments");
  const cids = attachments.map((a: any) => a.cid);
  assert.ok(cids.includes("meet-icon"), "must include meet-icon attachment");
  assert.ok(cids.includes("meet-logo"), "must include meet-logo attachment");
});

test("email footer renders localized footer text", () => {
  const frFooter = renderEmailFooter("fr");
  assert.ok(frFooter.includes("Tous droits réservés"), "French footer rendered");
  const enFooter = renderEmailFooter("en");
  assert.ok(enFooter.includes("All rights reserved"), "English footer rendered");
});

test("date and time formatting correctly accounts for timezone offset (13:19 UTC is 14:19 in Europe/Paris)", () => {
  const utcInstant = new Date("2026-10-30T13:19:00.000Z");
  const timeFormatted = utcInstant.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  assert.equal(timeFormatted, "14:19", "must format as 14:19 local time in Europe/Paris");

  const tunisFormatted = utcInstant.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  });
  assert.equal(tunisFormatted, "14:19", "must format as 14:19 local time in Africa/Tunis");
});
