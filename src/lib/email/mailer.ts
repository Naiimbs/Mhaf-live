import nodemailer from "nodemailer";
import path from "node:path";

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
}

export function getMeetingEmailFrom(configuredFrom: string | undefined, smtpUser: string | undefined): string {
  const configuredValue = configuredFrom?.trim();
  const configuredAddress = configuredValue?.match(/<([^<>]+)>/)?.[1]?.trim();
  const address = configuredAddress || configuredValue || smtpUser?.trim();
  if (!address) throw new Error("Email sender address is not configured.");
  return `meet <${address}>`;
}

function escapeEmailHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
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
    secure, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
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
}: SendConfirmationEmailParams) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const formattedDate = startDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = `${startDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${endDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";
  const fullRoomUrl = roomUrl.startsWith("http") ? roomUrl : `${appUrl}${roomUrl}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Confirmation de votre réunion — meet</title>
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
    .header {
      border-bottom: 1px solid #27272a;
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo {
      display: flex;
      align-items: center;
    }
    .logo img {
      display: block;
      width: 120px;
      height: auto;
      padding: 4px;
      border-radius: 6px;
      background: #ffffff;
    }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(16, 185, 129, 0.3);
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
      background-color: #10b981;
      color: #042f2e !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 10px;
      letter-spacing: -0.01em;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }
    .link-fallback {
      background: #09090b;
      padding: 12px;
      border-radius: 8px;
      border: 1px dashed #27272a;
      font-family: monospace;
      font-size: 12px;
      color: #10b981;
      word-break: break-all;
      margin-top: 10px;
    }
    .footer {
      border-top: 1px solid #27272a;
      padding-top: 20px;
      margin-top: 32px;
      font-size: 12px;
      color: #52525b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo"><img src="cid:meet-logo" alt="meet" width="120"></div>
      <div class="badge">RÉUNION CONFIRMÉE</div>
    </div>

    <h1>Bonjour ${attendeeName},</h1>
    <p>Votre réunion vidéo a bien été confirmée avec <strong>${hostName}</strong>. Voici les détails de votre session :</p>

    <div class="card">
      <div class="card-row">
        <span class="label">Objet de la réunion :</span>
        <span class="value">${meetingTitle}</span>
      </div>
      <div class="card-row">
        <span class="label">Date :</span>
        <span class="value">${formattedDate}</span>
      </div>
      <div class="card-row">
        <span class="label">Horaire :</span>
        <span class="value">${formattedTime}</span>
      </div>
      <div class="card-row">
        <span class="label">Identifiant (UID) :</span>
        <span class="value font-mono">${bookingUid}</span>
      </div>
    </div>

    <div class="btn-container">
      <a href="${fullRoomUrl}" class="btn" target="_blank">Rejoindre la réunion</a>
    </div>

    <p style="font-size: 13px; color: #71717a; text-align: center;">
      Aucun téléchargement ni compte requis. Cliquez simplement sur le bouton à l'heure du rendez-vous pour entrer directement.
    </p>

    <div class="link-fallback">
      Lien direct : ${fullRoomUrl}
    </div>
    ${managementUrl ? `<p style="margin-top:24px;text-align:center"><a href="${managementUrl}" style="color:#38bdf8;font-size:13px">Gérer votre réservation · demander une annulation ou un changement</a></p>` : ""}

    <div class="footer">
      meet — Plateforme de visioconférence WebRTC ultra-rapide et sécurisée.<br>
      © ${new Date().getFullYear()} meet. Tous droits réservés.
    </div>
  </div>
</body>
</html>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject: `Confirmation de votre réunion : ${meetingTitle} (meet)`,
    text: `Bonjour ${attendeeName},\n\nVotre réunion "${meetingTitle}" avec ${hostName} est confirmée.\nDate : ${formattedDate}\nHeure : ${formattedTime}\n\nLien pour rejoindre la réunion : ${fullRoomUrl}\n\n${managementUrl ? `Gérer votre réservation : ${managementUrl}\n` : ""}Identifiant de session : ${bookingUid}\n\nmeet`,
    html,
    attachments: [
      {
        filename: "meet-logo.png",
        path: path.join(process.cwd(), "public", "meet-logo.png"),
        cid: "meet-logo",
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
}: SendHostBookingNotificationParams) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const formattedDate = startDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = `${startDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${endDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";
  const fullRoomUrl = roomUrl.startsWith("http") ? roomUrl : `${appUrl}${roomUrl}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Nouvelle réservation — meet</title>
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
    .header {
      border-bottom: 1px solid #27272a;
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .badge {
      display: inline-block;
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(14, 165, 233, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
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
      background: #0284c7;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
    }
    .footer {
      border-top: 1px solid #27272a;
      padding-top: 20px;
      font-size: 12px;
      color: #52525b;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Nouveau Client Réservé</span>
    </div>

    <h1 class="title">Nouvelle réservation reçue</h1>
    <p class="subtitle">Bonjour ${hostName}, un client vient de réserver un créneau avec vous pour <strong>${meetingTitle}</strong>.</p>

    <div class="card">
      <div class="card-row">
        <span class="label">Client :</span>
        <span class="value">${attendeeName}</span>
      </div>
      <div class="card-row">
        <span class="label">Email client :</span>
        <span class="value">${attendeeEmail}</span>
      </div>
      <div class="card-row">
        <span class="label">Date :</span>
        <span class="value">${formattedDate}</span>
      </div>
      <div class="card-row">
        <span class="label">Horaire :</span>
        <span class="value">${formattedTime}</span>
      </div>
      ${notes ? `
      <div class="card-row">
        <span class="label">Message :</span>
        <span class="value">${notes}</span>
      </div>` : ''}
    </div>

    <div class="btn-container">
      <a href="${fullRoomUrl}" class="btn" target="_blank">Accéder à la salle de réunion</a>
    </div>

    <div class="footer">
      meet — Réservation client synchronisée en temps réel avec votre Dashboard.<br>
      © ${new Date().getFullYear()} meet. Tous droits réservés.
    </div>
  </div>
</body>
</html>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject: `Nouvelle réservation : ${attendeeName} pour ${meetingTitle} (meet)`,
    text: `Bonjour ${hostName},\n\nUn client vient de réserver :\nClient : ${attendeeName} (${attendeeEmail})\nRéunion : ${meetingTitle}\nDate : ${formattedDate}\nHeure : ${formattedTime}\n\nLien direct de la réunion : ${fullRoomUrl}\n\nmeet`,
    html,
  });

  return info;
}


type E2EGlobal = typeof globalThis & { __mhafE2EMagicLinks?: Map<string, string> };

export function consumeE2EMagicLink(email: string): string | null {
  if (process.env.NODE_ENV !== "development" || !process.env.MHAF_E2E_AUTH_HARNESS_SECRET) return null;
  const links = (globalThis as E2EGlobal).__mhafE2EMagicLinks;
  const key = email.trim().toLowerCase();
  const link = links?.get(key) ?? null;
  links?.delete(key);
  return link;
}

export async function sendMagicLinkEmail(to: string, magicLink: string): Promise<void> {
  // Local Playwright sink: disabled in production and requires an explicit dev-only secret.
  if (process.env.NODE_ENV === "development" && process.env.MHAF_E2E_AUTH_HARNESS_SECRET) {
    const root = globalThis as E2EGlobal;
    root.__mhafE2EMagicLinks ??= new Map<string, string>();
    root.__mhafE2EMagicLinks.set(to.trim().toLowerCase(), magicLink);
    return;
  }

  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const safeLink = magicLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  await transporter.sendMail({
    from,
    to,
    subject: "Your MHAF Live sign-in link",
    text: `Use this one-time link to sign in to MHAF Live. It expires in 15 minutes and can only be used once.\n\n${magicLink}\n\nIf you did not request this email, you can ignore it.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;padding:32px;background:#09090b;color:#fafafa;font-family:Arial,sans-serif"><main style="max-width:520px;margin:auto;padding:32px;background:#121215;border:1px solid #27272a;border-radius:16px"><h1 style="font-size:22px">Sign in to MHAF Live</h1><p style="color:#a1a1aa;line-height:1.6">Click below to securely access your host dashboard.</p><p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;padding:13px 22px;border-radius:9px;background:#10b981;color:#042f2e;text-decoration:none;font-weight:700">Sign in to MHAF Live</a></p><p style="color:#a1a1aa;font-size:13px;line-height:1.6">This link expires in 15 minutes and can only be used once. If you did not request it, you can ignore this email.</p></main></body></html>`,
  });
}

export async function sendBookingLinkEmail(params: {
  to: string;
  hostName: string;
  title: string;
  durationMinutes: number;
  bookingUrl: string;
}) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const title = escapeHtml(params.title);
  const hostName = escapeHtml(params.hostName);
  const url = escapeHtml(params.bookingUrl);

  return transporter.sendMail({
    from,
    to: params.to,
    subject: `Choose a time for ${params.title} — MHAF Live`,
    text: `Hello,\n\n${params.hostName} invited you to book a ${params.durationMinutes}-minute meeting: ${params.title}.\n\nChoose an available time here: ${params.bookingUrl}\n\nMHAF Live`,
    html: `<!doctype html><html lang="en"><body style="margin:0;padding:32px;background:#09090b;color:#fafafa;font-family:Arial,sans-serif"><main style="max-width:540px;margin:auto;padding:32px;background:#121215;border:1px solid #27272a;border-radius:16px"><p style="color:#38bdf8;font-size:12px;font-weight:700;letter-spacing:.08em">MHAF LIVE · BOOKING INVITATION</p><h1 style="font-size:24px">You're invited to book a meeting</h1><p style="color:#a1a1aa;line-height:1.6">${hostName} invited you to schedule <strong style="color:#fafafa">${title}</strong> (${params.durationMinutes} minutes).</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;padding:13px 22px;border-radius:9px;background:#10b981;color:#042f2e;text-decoration:none;font-weight:700">Choose a time</a></p><p style="color:#a1a1aa;font-size:13px;line-height:1.6">You'll be able to choose from the host's available time slots. Your meeting will be confirmed after you complete the booking.</p><p style="color:#71717a;font-size:12px;word-break:break-all">If the button doesn't work, open: ${url}</p></main></body></html>`,
  });
}
export async function sendBookingChangeRequestNotification(params: { to: string; attendeeName: string; attendeeEmail: string; meetingTitle: string; type: "CANCEL" | "RESCHEDULE"; reason: string; requestedStartTime?: Date | null; dashboardUrl: string }) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const label = params.type === "CANCEL" ? "Cancellation request" : "Reschedule request";
  const requested = params.requestedStartTime ? params.requestedStartTime.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "";
  const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  const safeName = escapeHtml(params.attendeeName);
  const safeEmail = escapeHtml(params.attendeeEmail);
  const safeTitle = escapeHtml(params.meetingTitle);
  const safeReason = escapeHtml(params.reason);
  const safeDashboardUrl = escapeHtml(params.dashboardUrl);
  const safeRequested = escapeHtml(requested);
  await transporter.sendMail({
    from, to: params.to, subject: label + ": " + params.meetingTitle + " — MHAF Live",
    text: "Hello,\n\n" + params.attendeeName + " (" + params.attendeeEmail + ") requested " + label.toLowerCase() + " for " + params.meetingTitle + ".\nReason: " + params.reason + (requested ? "\nPreferred time: " + requested : "") + "\n\nReview in your dashboard: " + params.dashboardUrl,
    html: "<div style='font-family:Arial,sans-serif;background:#09090b;color:#fafafa;padding:32px'><main style='max-width:560px;margin:auto;background:#121215;border:1px solid #27272a;border-radius:14px;padding:28px'><p style='color:#38bdf8'>MHAF LIVE · BOOKING REQUEST</p><h1>" + label + "</h1><p>" + safeName + " (" + safeEmail + ") requested a change to <strong>" + safeTitle + "</strong>.</p><p><strong>Reason</strong></p><p style='white-space:pre-wrap;color:#d4d4d8'>" + safeReason + "</p>" + (safeRequested ? "<p>Preferred time: " + safeRequested + "</p>" : "") + "<p><a href='" + safeDashboardUrl + "' style='background:#10b981;color:#042f2e;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold'>Review request</a></p></main></div>",
  });
}

export async function sendBookingChangeResultEmail(params: { to: string; attendeeName: string; meetingTitle: string; decision: "APPROVED" | "REJECTED"; type: "CANCEL" | "RESCHEDULE"; startTime: Date; roomUrl: string }) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const message = params.decision === "APPROVED" ? (params.type === "CANCEL" ? "Your cancellation request has been approved. Your booking is cancelled." : "Your reschedule request has been approved. Your meeting time has been updated.") : "Your request was not approved. Your original booking remains unchanged.";
  const safeName = escapeEmailHtml(params.attendeeName);
  const safeTitle = escapeEmailHtml(params.meetingTitle);
  const safeMessage = escapeEmailHtml(message);
  const safeRoomUrl = escapeEmailHtml(params.roomUrl);
  const start = params.startTime.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  await transporter.sendMail({ from, to: params.to, subject: "Booking request " + params.decision.toLowerCase() + " — MHAF Live", text: "Hello " + params.attendeeName + ",\n\n" + message + "\n\n" + params.meetingTitle + "\n" + start + "\n" + (params.decision === "APPROVED" && params.type === "RESCHEDULE" ? params.roomUrl : ""), html: "<div style='font-family:Arial,sans-serif;background:#09090b;color:#fafafa;padding:32px'><main style='max-width:540px;margin:auto;background:#121215;border:1px solid #27272a;border-radius:14px;padding:28px'><h1>Booking request " + params.decision.toLowerCase() + "</h1><p>Hello " + safeName + ",</p><p>" + safeMessage + "</p><p><strong>" + safeTitle + "</strong><br/>" + start + "</p>" + (params.decision === "APPROVED" && params.type === "RESCHEDULE" ? "<p><a href='" + safeRoomUrl + "'>Join your meeting</a></p>" : "") + "</main></div>" });
}


export async function sendBookingReminderEmail(params: { to: string; attendeeName: string; meetingTitle: string; startTime: Date; roomUrl: string; minutesBefore: 15 | 5; managementUrl?: string }) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);
  const safeName = escapeEmailHtml(params.attendeeName);
  const safeTitle = escapeEmailHtml(params.meetingTitle);
  const safeRoomUrl = escapeEmailHtml(params.roomUrl);
  const safeManagementUrl = params.managementUrl ? escapeEmailHtml(params.managementUrl) : "";
  const start = params.startTime.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  const manageText = params.managementUrl ? "\nManage booking: " + params.managementUrl : "";
  await transporter.sendMail({ from, to: params.to, subject: "Reminder: your meeting starts in " + params.minutesBefore + " minutes — MHAF Live", text: "Hello " + params.attendeeName + ",\n\nYour meeting " + params.meetingTitle + " starts in " + params.minutesBefore + " minutes.\n" + start + "\nJoin: " + params.roomUrl + manageText, html: "<div style='font-family:Arial,sans-serif;background:#09090b;color:#fafafa;padding:32px'><main style='max-width:540px;margin:auto;background:#121215;border:1px solid #27272a;border-radius:14px;padding:28px'><p style='color:#38bdf8'>MHAF LIVE · MEETING REMINDER</p><h1>Your meeting starts in " + params.minutesBefore + " minutes</h1><p>Hello " + safeName + ", your meeting <strong>" + safeTitle + "</strong> is coming up.</p><p>" + start + "</p><p><a href='" + safeRoomUrl + "' style='display:inline-block;background:#10b981;color:#042f2e;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold'>Join meeting</a></p>" + (safeManagementUrl ? "<p><a href='" + safeManagementUrl + "'>Manage booking</a></p>" : "") + "</main></div>" });
}