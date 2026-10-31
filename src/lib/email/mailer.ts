import nodemailer from "nodemailer";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { getE2EAuthHarnessSecret } from "@/lib/e2e-auth";

interface SendConfirmationEmailParams {
  to: string;
  attendeeName: string;
  meetingTitle: string;
  startTime: Date | string;
  endTime: Date | string;
  roomUrl: string;
  bookingUid: string;
  managementUrl?: string;
  hostName?: string;
  locale?: "en" | "fr";
  timezone?: string;
}

export function getMeetingEmailFrom(configuredFrom: string | undefined, smtpUser: string | undefined): string {
  const configuredValue = configuredFrom?.trim();
  const configuredAddress = configuredValue?.match(/<([^<>]+)>/)?.[1]?.trim();
  const address = configuredAddress || configuredValue || smtpUser?.trim();
  if (!address) throw new Error("Email sender address is not configured.");
  return `meet <${address}>`;
}

export function escapeEmailHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

export function getEmailBrandAttachments(): Array<{ filename: string; path: string; cid: string }> {
  const iconPath = path.join(process.cwd(), "public", "icon.png");
  const logoPath = path.join(process.cwd(), "public", "meet-logo-white.png");
  const attachments: Array<{ filename: string; path: string; cid: string }> = [];

  try {
    if (fs.existsSync(iconPath)) {
      attachments.push({
        filename: "icon.png",
        path: iconPath,
        cid: "meet-icon",
      });
    }
  } catch {
    attachments.push({
      filename: "icon.png",
      path: iconPath,
      cid: "meet-icon",
    });
  }

  try {
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: "meet-logo.png",
        path: logoPath,
        cid: "meet-logo",
      });
    }
  } catch {
    attachments.push({
      filename: "meet-logo.png",
      path: logoPath,
      cid: "meet-logo",
    });
  }

  return attachments;
}

export function renderEmailHeader(badgeText?: string, appUrl = "https://meet.naiimbsili.com"): string {
  const badgeHtml = badgeText
    ? `<span style="display:inline-block;background:rgba(37,99,235,0.15);color:#60a5fa;font-size:11px;font-weight:700;padding:5px 12px;border-radius:9999px;border:1px solid rgba(37,99,235,0.3);text-transform:uppercase;letter-spacing:0.06em;">${badgeText}</span>`
    : "";

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #27272a;">
      <tr>
        <td style="vertical-align:middle;">
          <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
            <table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="vertical-align:middle;padding-right:12px;">
                  <img src="cid:meet-icon" alt="mhaf icon" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:10px;border:0;outline:none;" />
                </td>
                <td style="vertical-align:middle;">
                  <img src="cid:meet-logo" alt="mhaf meet" width="120" height="auto" style="display:block;width:120px;height:auto;border:0;outline:none;" />
                </td>
              </tr>
            </table>
          </a>
        </td>
        ${badgeText ? `<td style="vertical-align:middle;text-align:right;">${badgeHtml}</td>` : ""}
      </tr>
    </table>
  `;
}

export function renderEmailFooter(locale: "en" | "fr" = "fr"): string {
  const isFrench = locale === "fr";
  const text = isFrench
    ? `mhaf meet — Plateforme de visioconférence WebRTC ultra-rapide et sécurisée.<br>© ${new Date().getFullYear()} mhaf meet. Tous droits réservés.`
    : `mhaf meet — Ultra-fast, secure WebRTC meeting platform.<br>© ${new Date().getFullYear()} mhaf meet. All rights reserved.`;

  return `
    <div style="border-top:1px solid #27272a;padding-top:20px;margin-top:32px;font-size:12px;color:#71717a;text-align:center;line-height:1.5;">
      ${text}
    </div>
  `;
}

function getTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const missing = [
    !host && "SMTP_HOST",
    !user && "SMTP_USER",
    !pass && "SMTP_PASS",
  ].filter(Boolean);
  if (!host || !user || !pass) {
    throw new Error(`Email delivery is not configured. Missing: ${missing.join(", ")}.`);
  }

  const port = Number.parseInt(process.env.SMTP_PORT || "465", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Email delivery is not configured. SMTP_PORT must be a valid TCP port.");
  }

  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (secureSetting && secureSetting !== "true" && secureSetting !== "false") {
    throw new Error('Email delivery is not configured. SMTP_SECURE must be "true" or "false".');
  }
  const secure = secureSetting ? secureSetting === "true" : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsUtcStamp(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function sendMeetingConfirmationEmail({
  to,
  attendeeName,
  meetingTitle,
  startTime,
  endTime,
  roomUrl,
  bookingUid,
  managementUrl,
  hostName = "meet Host",
  locale = "fr",
  timezone = "Europe/Paris",
}: SendConfirmationEmailParams) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const isFrench = locale === "fr";
  const dateLocale = isFrench ? "fr-FR" : "en-US";
  const tz = timezone || "Europe/Paris";

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  try {
    dateOptions.timeZone = tz;
    timeOptions.timeZone = tz;
  } catch {}

  const formattedDate = startDate.toLocaleDateString(dateLocale, dateOptions);
  const formattedTime = `${startDate.toLocaleTimeString(dateLocale, timeOptions)} – ${endDate.toLocaleTimeString(dateLocale, timeOptions)}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";
  const fullRoomUrl = roomUrl.startsWith("http") ? roomUrl : `${appUrl}${roomUrl}`;

  const subject = isFrench
    ? `Confirmation de votre réunion : ${meetingTitle} (mhaf meet)`
    : `Meeting confirmation: ${meetingTitle} (mhaf meet)`;
  const badgeText = isFrench ? "RÉUNION CONFIRMÉE" : "MEETING CONFIRMED";
  const greeting = isFrench ? `Bonjour ${attendeeName},` : `Hello ${attendeeName},`;
  const intro = isFrench
    ? `Votre réunion vidéo a bien été confirmée avec <strong>${hostName}</strong>. Voici les détails de votre session :`
    : `Your video meeting has been confirmed with <strong>${hostName}</strong>. Here are your session details:`;
  const topicLabel = isFrench ? "Objet de la réunion :" : "Meeting topic:";
  const dateLabel = isFrench ? "Date :" : "Date:";
  const timeLabel = isFrench ? "Horaire :" : "Time:";
  const uidLabel = isFrench ? "Identifiant (UID) :" : "Session ID (UID):";
  const btnText = isFrench ? "Rejoindre la réunion" : "Join Meeting";
  const subtext = isFrench
    ? "Aucun téléchargement ni compte requis. Cliquez simplement sur le bouton à l'heure du rendez-vous pour entrer directement."
    : "No downloads or account required. Simply click the button at the scheduled time to enter directly.";
  const fallbackLabel = isFrench ? "Lien direct :" : "Direct link:";

  const html = `
<!DOCTYPE html>
<html lang="${isFrench ? "fr" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #09090b;
      color: #fafafa;
      margin: 0;
      padding: 24px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #121215;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #fafafa;
      margin: 0 0 12px 0;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #a1a1aa;
      margin: 0 0 16px 0;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .card-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .card-row:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #71717a;
      font-weight: 500;
    }
    .value {
      color: #f4f4f5;
      font-weight: 600;
      text-align: right;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #2563EB;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 10px;
      letter-spacing: -0.01em;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
    .link-fallback {
      background: #09090b;
      padding: 12px;
      border-radius: 8px;
      border: 1px dashed #27272a;
      font-family: monospace;
      font-size: 12px;
      color: #60a5fa;
      word-break: break-all;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${renderEmailHeader(badgeText, appUrl)}

    <h1>${greeting}</h1>
    <p>${intro}</p>

    <div class="card">
      <div class="card-row">
        <span class="label">${topicLabel}</span>
        <span class="value">${escapeEmailHtml(meetingTitle)}</span>
      </div>
      <div class="card-row">
        <span class="label">${dateLabel}</span>
        <span class="value">${formattedDate}</span>
      </div>
      <div class="card-row">
        <span class="label">${timeLabel}</span>
        <span class="value">${formattedTime} <span style="font-size:11px;color:#71717a;font-weight:normal">(${tz})</span></span>
      </div>
      <div class="card-row">
        <span class="label">${uidLabel}</span>
        <span class="value font-mono">${escapeEmailHtml(bookingUid)}</span>
      </div>
    </div>

    <div class="btn-container">
      <a href="${fullRoomUrl}" class="btn" target="_blank" rel="noopener noreferrer">${btnText}</a>
    </div>

    <p style="font-size: 13px; color: #71717a; text-align: center;">
      ${subtext}
    </p>

    <div class="link-fallback">
      ${fallbackLabel} ${fullRoomUrl}
    </div>
    ${managementUrl ? `<p style="margin-top:24px;text-align:center"><a href="${managementUrl}" style="color:#38bdf8;font-size:13px">${isFrench ? "Gérer votre réservation · demander une annulation ou un changement" : "Manage your reservation · request cancellation or rescheduling"}</a></p>` : ""}

    ${renderEmailFooter(locale)}
  </div>
</body>
</html>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: `${greeting}\n\n${intro.replace(/<[^>]+>/g, "")}\n${topicLabel} ${meetingTitle}\n${dateLabel} ${formattedDate}\n${timeLabel} ${formattedTime} (${tz})\n\n${fallbackLabel} ${fullRoomUrl}\n\n${managementUrl ? `${isFrench ? "Gérer votre réservation" : "Manage your reservation"}: ${managementUrl}\n\n` : ""}${uidLabel} ${bookingUid}\n\nmeet`,
    html,
    attachments: [
      ...getEmailBrandAttachments(),
      {
        filename: `mhaf-live-${bookingUid}.ics`,
        content: [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//MHAF Live//Booking Calendar//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "BEGIN:VEVENT",
          `UID:${escapeIcsText(bookingUid)}@mhaf.live`,
          `DTSTAMP:${toIcsUtcStamp(new Date())}`,
          `DTSTART:${toIcsUtcStamp(startDate)}`,
          `DTEND:${toIcsUtcStamp(endDate)}`,
          `SUMMARY:${escapeIcsText(meetingTitle)}`,
          `DESCRIPTION:${escapeIcsText(`Join meeting: ${fullRoomUrl}${managementUrl ? `\nManage booking: ${managementUrl}` : ""}`)}`,
          `URL:${escapeIcsText(fullRoomUrl)}`,
          "STATUS:CONFIRMED",
          "END:VEVENT",
          "END:VCALENDAR",
          "",
        ].join("\r\n"),
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        contentDisposition: "attachment",
      },
    ],
  });

  return info;
}

export interface SendHostBookingNotificationParams {
  to: string;
  hostName: string;
  attendeeName: string;
  attendeeEmail: string;
  meetingTitle: string;
  startTime: Date | string;
  endTime: Date | string;
  roomUrl: string;
  bookingUid: string;
  notes?: string;
  locale?: "en" | "fr";
  timezone?: string;
}

export async function sendHostBookingNotificationEmail({
  to,
  hostName,
  attendeeName,
  attendeeEmail,
  meetingTitle,
  startTime,
  endTime,
  roomUrl,
  bookingUid,
  notes,
  locale = "fr",
  timezone = "Europe/Paris",
}: SendHostBookingNotificationParams) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const isFrench = locale === "fr";
  const dateLocale = isFrench ? "fr-FR" : "en-US";
  const tz = timezone || "Europe/Paris";

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  try {
    dateOptions.timeZone = tz;
    timeOptions.timeZone = tz;
  } catch {}

  const formattedDate = startDate.toLocaleDateString(dateLocale, dateOptions);
  const formattedTime = `${startDate.toLocaleTimeString(dateLocale, timeOptions)} – ${endDate.toLocaleTimeString(dateLocale, timeOptions)}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";
  const fullRoomUrl = roomUrl.startsWith("http") ? roomUrl : `${appUrl}${roomUrl}`;

  const subject = isFrench
    ? `Nouvelle réservation : ${attendeeName} pour ${meetingTitle} (mhaf meet)`
    : `New booking: ${attendeeName} for ${meetingTitle} (mhaf meet)`;
  const badgeText = isFrench ? "NOUVEAU CLIENT" : "NEW CLIENT";
  const title = isFrench ? "Nouvelle réservation reçue" : "New Booking Received";
  const subtitle = isFrench
    ? `Bonjour ${hostName}, un client vient de réserver un créneau avec vous pour <strong>${escapeEmailHtml(meetingTitle)}</strong>.`
    : `Hello ${hostName}, a client has booked a meeting with you for <strong>${escapeEmailHtml(meetingTitle)}</strong>.`;
  const clientLabel = isFrench ? "Client :" : "Client:";
  const emailLabel = isFrench ? "Email client :" : "Client Email:";
  const dateLabel = isFrench ? "Date :" : "Date:";
  const timeLabel = isFrench ? "Horaire :" : "Time:";
  const notesLabel = isFrench ? "Message :" : "Notes:";
  const btnText = isFrench ? "Accéder à la salle de réunion" : "Access Meeting Room";

  const html = `
<!DOCTYPE html>
<html lang="${isFrench ? "fr" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #09090b;
      color: #fafafa;
      margin: 0;
      padding: 24px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #121215;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #a1a1aa;
      margin-top: 0;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .card {
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .card-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #27272a;
      font-size: 14px;
    }
    .card-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .label {
      color: #71717a;
    }
    .value {
      font-weight: 600;
      color: #f4f4f5;
      text-align: right;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #2563EB;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
  </style>
</head>
<body>
  <div class="container">
    ${renderEmailHeader(badgeText, appUrl)}

    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>

    <div class="card">
      <div class="card-row">
        <span class="label">${clientLabel}</span>
        <span class="value">${escapeEmailHtml(attendeeName)}</span>
      </div>
      <div class="card-row">
        <span class="label">${emailLabel}</span>
        <span class="value">${escapeEmailHtml(attendeeEmail)}</span>
      </div>
      <div class="card-row">
        <span class="label">${dateLabel}</span>
        <span class="value">${formattedDate}</span>
      </div>
      <div class="card-row">
        <span class="label">${timeLabel}</span>
        <span class="value">${formattedTime} <span style="font-size:11px;color:#71717a;font-weight:normal">(${tz})</span></span>
      </div>
      ${notes ? `
      <div class="card-row">
        <span class="label">${notesLabel}</span>
        <span class="value">${escapeEmailHtml(notes)}</span>
      </div>` : ''}
    </div>

    <div class="btn-container">
      <a href="${fullRoomUrl}" class="btn" target="_blank" rel="noopener noreferrer">${btnText}</a>
    </div>

    ${renderEmailFooter(locale)}
  </div>
</body>
</html>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: `${subtitle.replace(/<[^>]+>/g, "")}\n\n${clientLabel} ${attendeeName} (${attendeeEmail})\n${dateLabel} ${formattedDate}\n${timeLabel} ${formattedTime} (${tz})\n\n${btnText} : ${fullRoomUrl}\n\nmhaf meet`,
    html,
    attachments: getEmailBrandAttachments(),
  });

  return info;
}

function getE2EMagicLinkPath(email: string): string {
  const dataDir = process.env.MHAF_DATA_DIR?.trim() || path.join(process.cwd(), "data");
  const key = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return path.join(dataDir, ".e2e-magic-links", `${key}.json`);
}

export function consumeE2EMagicLink(email: string): string | null {
  if (process.env.NODE_ENV !== "development" || !getE2EAuthHarnessSecret()) return null;

  const key = email.trim().toLowerCase();
  const filePath = getE2EMagicLinkPath(key);
  try {
    const stored = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      email?: string;
      url?: string;
      createdAt?: number;
    };
    // Consume before returning so the harness cannot replay a captured link.
    fs.unlinkSync(filePath);

    if (
      stored.email !== key ||
      typeof stored.url !== "string" ||
      typeof stored.createdAt !== "number" ||
      Date.now() - stored.createdAt > 15 * 60 * 1000
    ) {
      return null;
    }

    return stored.url;
  } catch {
    return null;
  }
}

export async function sendMagicLinkEmail(to: string, magicLink: string, locale: "en" | "fr" = "en"): Promise<void> {
  if (process.env.NODE_ENV === "development" && getE2EAuthHarnessSecret()) {
    const key = to.trim().toLowerCase();
    const filePath = getE2EMagicLinkPath(key);
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });

    // A file-backed handoff is shared by Next.js development route bundles,
    // unlike globalThis state which can be isolated between route workers.
    const temporaryPath = `${filePath}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
    try {
      fs.writeFileSync(
        temporaryPath,
        JSON.stringify({ email: key, url: magicLink, createdAt: Date.now() }),
        { encoding: "utf8", mode: 0o600, flag: "wx" }
      );
      fs.renameSync(temporaryPath, filePath);
    } finally {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    }
    return;
  }

  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const safeLink = magicLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";

  const isFrench = locale === "fr";
  const subject = isFrench ? "Votre lien de connexion mhaf meet" : "Your mhaf meet sign-in link";
  const badgeText = isFrench ? "CONNEXION SÉCURISÉE" : "SECURE SIGN-IN";
  const title = isFrench ? "Connexion à mhaf meet" : "Sign in to mhaf meet";
  const intro = isFrench
    ? "Cliquez ci-dessous pour accéder en toute sécurité à votre tableau de bord d'hôte."
    : "Click below to securely access your host dashboard.";
  const btnText = isFrench ? "Se connecter à mhaf meet" : "Sign in to mhaf meet";
  const notice = isFrench
    ? "Ce lien expire dans 15 minutes et ne peut être utilisé qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email."
    : "This link expires in 15 minutes and can only be used once. If you did not request it, you can ignore this email.";

  await transporter.sendMail({
    from,
    to,
    subject,
    text: `${title}\n\n${intro}\n\n${magicLink}\n\n${notice}\n\nmhaf meet`,
    html: `<!doctype html>
<html lang="${isFrench ? "fr" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:24px;background:#09090b;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <main style="max-width:540px;margin:auto;padding:32px;background:#121215;border:1px solid #27272a;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.5)">
    ${renderEmailHeader(badgeText, appUrl)}
    <h1 style="font-size:22px;color:#ffffff;margin-top:0">${title}</h1>
    <p style="color:#a1a1aa;line-height:1.6">${intro}</p>
    <p style="margin:28px 0;text-align:center">
      <a href="${safeLink}" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#2563EB;color:#ffffff;text-decoration:none;font-weight:700;box-shadow:0 4px 14px rgba(37,99,235,0.35)">${btnText}</a>
    </p>
    <p style="color:#71717a;font-size:13px;line-height:1.6">${notice}</p>
    ${renderEmailFooter(locale)}
  </main>
</body>
</html>`,
    attachments: getEmailBrandAttachments(),
  });
}

export async function sendBookingLinkEmail(params: {
  to: string;
  hostName: string;
  title: string;
  durationMinutes: number;
  bookingUrl: string;
  locale?: "en" | "fr";
}) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";

  const isFrench = params.locale === "fr";
  const title = escapeEmailHtml(params.title);
  const hostName = escapeEmailHtml(params.hostName);
  const url = escapeEmailHtml(params.bookingUrl);

  const subject = isFrench
    ? `Choisissez un horaire pour ${params.title} — mhaf meet`
    : `Choose a time for ${params.title} — mhaf meet`;
  const badgeText = isFrench ? "INVITATION RÉSERVATION" : "BOOKING INVITATION";
  const heading = isFrench ? "Vous êtes invité à réserver une réunion" : "You're invited to book a meeting";
  const desc = isFrench
    ? `${hostName} vous invite à planifier <strong style="color:#fafafa">${title}</strong> (${params.durationMinutes} minutes).`
    : `${hostName} invited you to schedule <strong style="color:#fafafa">${title}</strong> (${params.durationMinutes} minutes).`;
  const btnText = isFrench ? "Choisir un créneau" : "Choose a time";
  const note = isFrench
    ? "Vous pourrez choisir parmi les créneaux disponibles de votre hôte. Votre réunion sera confirmée dès la validation."
    : "You'll be able to choose from the host's available time slots. Your meeting will be confirmed after you complete the booking.";

  return transporter.sendMail({
    from,
    to: params.to,
    subject,
    text: `Hello,\n\n${params.hostName} invited you to book a ${params.durationMinutes}-minute meeting: ${params.title}.\n\nChoose an available time here: ${params.bookingUrl}\n\nmhaf meet`,
    html: `<!doctype html>
<html lang="${isFrench ? "fr" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:24px;background:#09090b;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <main style="max-width:540px;margin:auto;padding:32px;background:#121215;border:1px solid #27272a;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.5)">
    ${renderEmailHeader(badgeText, appUrl)}
    <h1 style="font-size:22px;color:#ffffff;margin-top:0">${heading}</h1>
    <p style="color:#a1a1aa;line-height:1.6">${desc}</p>
    <p style="margin:28px 0;text-align:center">
      <a href="${url}" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#2563EB;color:#ffffff;text-decoration:none;font-weight:700;box-shadow:0 4px 14px rgba(37,99,235,0.35)">${btnText}</a>
    </p>
    <p style="color:#71717a;font-size:13px;line-height:1.6">${note}</p>
    <p style="color:#52525b;font-size:12px;word-break:break-all">Lien : ${url}</p>
    ${renderEmailFooter(params.locale || "fr")}
  </main>
</body>
</html>`,
    attachments: getEmailBrandAttachments(),
  });
}

export async function sendBookingChangeRequestNotification(params: {
  to: string;
  attendeeName: string;
  attendeeEmail: string;
  meetingTitle: string;
  type: "CANCEL" | "RESCHEDULE";
  reason: string;
  requestedStartTime?: Date | null;
  dashboardUrl: string;
  locale?: "en" | "fr";
  timezone?: string;
}) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";

  const isFrench = params.locale !== "en";
  const tz = params.timezone || "Europe/Paris";
  const label = params.type === "CANCEL"
    ? (isFrench ? "Demande d'annulation" : "Cancellation request")
    : (isFrench ? "Demande de report" : "Reschedule request");
  const badgeText = params.type === "CANCEL"
    ? (isFrench ? "ANNULATION" : "CANCELLATION")
    : (isFrench ? "REPORT" : "RESCHEDULE");

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };
  try {
    formatOptions.timeZone = tz;
  } catch {}

  const requested = params.requestedStartTime
    ? params.requestedStartTime.toLocaleString(isFrench ? "fr-FR" : "en-US", formatOptions) + ` (${tz})`
    : "";

  const safeName = escapeEmailHtml(params.attendeeName);
  const safeEmail = escapeEmailHtml(params.attendeeEmail);
  const safeTitle = escapeEmailHtml(params.meetingTitle);
  const safeReason = escapeEmailHtml(params.reason);
  const safeDashboardUrl = escapeEmailHtml(params.dashboardUrl);
  const safeRequested = escapeEmailHtml(requested);

  await transporter.sendMail({
    from,
    to: params.to,
    subject: `${label} : ${params.meetingTitle} — mhaf meet`,
    text: `Hello,\n\n${params.attendeeName} (${params.attendeeEmail}) requested ${label.toLowerCase()} for ${params.meetingTitle}.\nReason: ${params.reason}${requested ? `\nPreferred time: ${requested}` : ""}\n\nReview in your dashboard: ${params.dashboardUrl}`,
    html: `<!doctype html>
<html lang="${isFrench ? "fr" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${label}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:24px;background:#09090b;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <main style="max-width:560px;margin:auto;background:#121215;border:1px solid #27272a;border-radius:16px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,0.5)">
    ${renderEmailHeader(badgeText, appUrl)}
    <h1 style="font-size:22px;color:#ffffff;margin-top:0">${label}</h1>
    <p style="color:#a1a1aa;line-height:1.6">${safeName} (${safeEmail}) ${isFrench ? "a soumis une demande concernant" : "requested a change for"} <strong style="color:#ffffff">${safeTitle}</strong>.</p>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 6px 0;color:#71717a;font-size:12px;text-transform:uppercase;font-weight:700;">${isFrench ? "Motif" : "Reason"}</p>
      <p style="white-space:pre-wrap;color:#d4d4d8;margin:0;font-size:14px;line-height:1.5;">${safeReason}</p>
      ${safeRequested ? `<p style="margin:12px 0 0 0;color:#60a5fa;font-size:13px;"><strong>${isFrench ? "Nouvel horaire souhaité :" : "Preferred time:"}</strong> ${safeRequested}</p>` : ""}
    </div>
    <p style="text-align:center;margin:28px 0;">
      <a href="${safeDashboardUrl}" style="background:#2563EB;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;box-shadow:0 4px 14px rgba(37,99,235,0.35)">${isFrench ? "Examiner la demande" : "Review request"}</a>
    </p>
    ${renderEmailFooter(isFrench ? "fr" : "en")}
  </main>
</body>
</html>`,
    attachments: getEmailBrandAttachments(),
  });
}

export async function sendBookingChangeResultEmail(params: {
  to: string;
  attendeeName: string;
  meetingTitle: string;
  decision: "APPROVED" | "REJECTED";
  type: "CANCEL" | "RESCHEDULE";
  startTime: Date;
  roomUrl: string;
  locale?: "en" | "fr";
  timezone?: string;
}) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";

  const isFrench = params.locale !== "en";
  const tz = params.timezone || "Europe/Paris";
  const isApproved = params.decision === "APPROVED";
  const badgeText = isApproved
    ? (isFrench ? "DEMANDE VALIDÉE" : "REQUEST APPROVED")
    : (isFrench ? "DEMANDE DÉCLINÉE" : "REQUEST DECLINED");

  const message = isApproved
    ? (params.type === "CANCEL"
        ? (isFrench ? "Votre demande d'annulation a été acceptée. Votre réservation est désormais annulée." : "Your cancellation request has been approved. Your booking is cancelled.")
        : (isFrench ? "Votre demande de report a été acceptée. L'horaire de votre réunion a bien été mis à jour." : "Your reschedule request has been approved. Your meeting time has been updated."))
    : (isFrench
        ? "Votre demande de modification n'a pas pu être validée. Votre réservation initiale reste active."
        : "Your request was not approved. Your original booking remains unchanged.");

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeStyle: "short",
  };
  try {
    formatOptions.timeZone = tz;
  } catch {}

  const safeName = escapeEmailHtml(params.attendeeName);
  const safeTitle = escapeEmailHtml(params.meetingTitle);
  const safeMessage = escapeEmailHtml(message);
  const safeRoomUrl = escapeEmailHtml(params.roomUrl);
  const start = params.startTime.toLocaleString(isFrench ? "fr-FR" : "en-US", formatOptions) + ` (${tz})`;

  const subject = isApproved
    ? (isFrench ? `Demande acceptée : ${params.meetingTitle} — mhaf meet` : `Request approved: ${params.meetingTitle} — mhaf meet`)
    : (isFrench ? `Mise à jour réservation : ${params.meetingTitle} — mhaf meet` : `Booking update: ${params.meetingTitle} — mhaf meet`);

  await transporter.sendMail({
    from,
    to: params.to,
    subject,
    text: `Hello ${params.attendeeName},\n\n${message}\n\n${params.meetingTitle}\n${start}\n${isApproved && params.type === "RESCHEDULE" ? params.roomUrl : ""}\n\nmhaf meet`,
    html: `<!doctype html>
<html lang="${isFrench ? "fr" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:24px;background:#09090b;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <main style="max-width:540px;margin:auto;background:#121215;border:1px solid #27272a;border-radius:16px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,0.5)">
    ${renderEmailHeader(badgeText, appUrl)}
    <h1 style="font-size:22px;color:#ffffff;margin-top:0">${isApproved ? (isFrench ? "Demande acceptée" : "Request Approved") : (isFrench ? "Mise à jour de votre demande" : "Request Update")}</h1>
    <p style="color:#fafafa;font-size:15px;">${isFrench ? "Bonjour" : "Hello"} ${safeName},</p>
    <p style="color:#a1a1aa;line-height:1.6">${safeMessage}</p>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:16px;margin:20px 0;">
      <strong style="color:#ffffff;font-size:15px;">${safeTitle}</strong>
      <p style="color:#60a5fa;margin:8px 0 0 0;font-size:13px;">${start}</p>
    </div>
    ${isApproved && params.type === "RESCHEDULE" ? `
    <p style="text-align:center;margin:28px 0;">
      <a href="${safeRoomUrl}" style="background:#2563EB;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;box-shadow:0 4px 14px rgba(37,99,235,0.35)">${isFrench ? "Rejoindre la réunion" : "Join your meeting"}</a>
    </p>` : ""}
    ${renderEmailFooter(isFrench ? "fr" : "en")}
  </main>
</body>
</html>`,
    attachments: getEmailBrandAttachments(),
  });
}

export async function sendBookingReminderEmail(params: {
  to: string;
  attendeeName: string;
  meetingTitle: string;
  startTime: Date;
  roomUrl: string;
  minutesBefore: 15 | 5;
  managementUrl?: string;
  locale?: "en" | "fr";
  timezone?: string;
}) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";

  const isFrench = params.locale !== "en";
  const tz = params.timezone || "Europe/Paris";
  const badgeText = isFrench ? `DANS ${params.minutesBefore} MINUTES` : `IN ${params.minutesBefore} MINUTES`;
  const subject = isFrench
    ? `Rappel : votre réunion commence dans ${params.minutesBefore} minutes — mhaf meet`
    : `Reminder: your meeting starts in ${params.minutesBefore} minutes — mhaf meet`;

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeStyle: "short",
  };
  try {
    formatOptions.timeZone = tz;
  } catch {}

  const safeName = escapeEmailHtml(params.attendeeName);
  const safeTitle = escapeEmailHtml(params.meetingTitle);
  const safeRoomUrl = escapeEmailHtml(params.roomUrl);
  const safeManagementUrl = params.managementUrl ? escapeEmailHtml(params.managementUrl) : "";
  const start = params.startTime.toLocaleString(isFrench ? "fr-FR" : "en-US", formatOptions) + ` (${tz})`;
  const manageText = params.managementUrl ? `\nManage booking: ${params.managementUrl}` : "";

  await transporter.sendMail({
    from,
    to: params.to,
    subject,
    text: `Hello ${params.attendeeName},\n\nYour meeting ${params.meetingTitle} starts in ${params.minutesBefore} minutes.\n${start}\nJoin: ${params.roomUrl}${manageText}\n\nmhaf meet`,
    html: `<!doctype html>
<html lang="${isFrench ? "fr" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:24px;background:#09090b;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <main style="max-width:540px;margin:auto;background:#121215;border:1px solid #27272a;border-radius:16px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,0.5)">
    ${renderEmailHeader(badgeText, appUrl)}
    <h1 style="font-size:22px;color:#ffffff;margin-top:0">${isFrench ? `Votre réunion commence dans ${params.minutesBefore} minutes` : `Your meeting starts in ${params.minutesBefore} minutes`}</h1>
    <p style="color:#a1a1aa;line-height:1.6">${isFrench ? "Bonjour" : "Hello"} ${safeName}, ${isFrench ? "votre session vidéo approche à grands pas." : "your video meeting is coming up shortly."}</p>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:16px;margin:20px 0;">
      <strong style="color:#ffffff;font-size:15px;">${safeTitle}</strong>
      <p style="color:#60a5fa;margin:8px 0 0 0;font-size:13px;">${start}</p>
    </div>
    <p style="text-align:center;margin:28px 0;">
      <a href="${safeRoomUrl}" style="display:inline-block;background:#2563EB;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;box-shadow:0 4px 14px rgba(37,99,235,0.35)">${isFrench ? "Rejoindre la réunion" : "Join meeting"}</a>
    </p>
    ${safeManagementUrl ? `<p style="text-align:center;margin-top:16px;"><a href="${safeManagementUrl}" style="color:#38bdf8;font-size:13px;">${isFrench ? "Gérer votre réservation" : "Manage booking"}</a></p>` : ""}
    ${renderEmailFooter(isFrench ? "fr" : "en")}
  </main>
</body>
</html>`,
    attachments: getEmailBrandAttachments(),
  });
}