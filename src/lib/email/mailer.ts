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
  hostName?: string;
  locale?: "en" | "fr";
}

export function getMeetingEmailFrom(configuredFrom: string | undefined, smtpUser: string | undefined): string {
  const configuredValue = configuredFrom?.trim();
  const configuredAddress = configuredValue?.match(/<([^<>]+)>/)?.[1]?.trim();
  const address = configuredAddress || configuredValue || smtpUser?.trim();
  if (!address) throw new Error("Email sender address is not configured.");
  return `meet <${address}>`;
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
  hostName = "meet Host",
  locale = "fr",
}: SendConfirmationEmailParams) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const isFrench = locale === "fr";
  const dateLocale = isFrench ? "fr-FR" : "en-US";

  const formattedDate = startDate.toLocaleDateString(dateLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = `${startDate.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${endDate.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

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
  const footerText = isFrench
    ? `mhaf meet — Plateforme de visioconférence WebRTC ultra-rapide et sécurisée.<br>© ${new Date().getFullYear()} mhaf meet. Tous droits réservés.`
    : `mhaf meet — Ultra-fast, secure WebRTC meeting platform.<br>© ${new Date().getFullYear()} mhaf meet. All rights reserved.`;

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
      background: rgba(37, 99, 235, 0.15);
      color: #60a5fa;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(37, 99, 235, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
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
    .footer {
      border-top: 1px solid #27272a;
      padding-top: 20px;
      margin-top: 32px;
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
      <div class="logo"><img src="cid:meet-logo" alt="mhaf meet" width="120"></div>
      <div class="badge">${badgeText}</div>
    </div>

    <h1>${greeting}</h1>
    <p>${intro}</p>

    <div class="card">
      <div class="card-row">
        <span class="label">${topicLabel}</span>
        <span class="value">${meetingTitle}</span>
      </div>
      <div class="card-row">
        <span class="label">${dateLabel}</span>
        <span class="value">${formattedDate}</span>
      </div>
      <div class="card-row">
        <span class="label">${timeLabel}</span>
        <span class="value">${formattedTime}</span>
      </div>
      <div class="card-row">
        <span class="label">${uidLabel}</span>
        <span class="value font-mono">${bookingUid}</span>
      </div>
    </div>

    <div class="btn-container">
      <a href="${fullRoomUrl}" class="btn" target="_blank">${btnText}</a>
    </div>

    <p style="font-size: 13px; color: #71717a; text-align: center;">
      ${subtext}
    </p>

    <div class="link-fallback">
      ${fallbackLabel} ${fullRoomUrl}
    </div>

    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: `${greeting}\n\n${intro.replace(/<[^>]+>/g, "")}\n${topicLabel} ${meetingTitle}\n${dateLabel} ${formattedDate}\n${timeLabel} ${formattedTime}\n\n${fallbackLabel} ${fullRoomUrl}\n\n${uidLabel} ${bookingUid}\n\nmhaf meet`,
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
  locale?: "en" | "fr";
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
}: SendHostBookingNotificationParams) {
  const transporter = getTransporter();
  const from = getMeetingEmailFrom(process.env.EMAIL_FROM, process.env.SMTP_USER);

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const isFrench = locale === "fr";
  const dateLocale = isFrench ? "fr-FR" : "en-US";

  const formattedDate = startDate.toLocaleDateString(dateLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = `${startDate.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${endDate.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meet.naiimbsili.com";
  const fullRoomUrl = roomUrl.startsWith("http") ? roomUrl : `${appUrl}${roomUrl}`;

  const subject = isFrench
    ? `Nouvelle réservation : ${attendeeName} pour ${meetingTitle} (mhaf meet)`
    : `New booking: ${attendeeName} for ${meetingTitle} (mhaf meet)`;
  const badgeText = isFrench ? "Nouveau Client Réservé" : "New Client Booking";
  const title = isFrench ? "Nouvelle réservation reçue" : "New Booking Received";
  const subtitle = isFrench
    ? `Bonjour ${hostName}, un client vient de réserver un créneau avec vous pour <strong>${meetingTitle}</strong>.`
    : `Hello ${hostName}, a client has booked a meeting with you for <strong>${meetingTitle}</strong>.`;
  const clientLabel = isFrench ? "Client :" : "Client:";
  const emailLabel = isFrench ? "Email client :" : "Client Email:";
  const dateLabel = isFrench ? "Date :" : "Date:";
  const timeLabel = isFrench ? "Horaire :" : "Time:";
  const notesLabel = isFrench ? "Message :" : "Notes:";
  const btnText = isFrench ? "Accéder à la salle de réunion" : "Access Meeting Room";
  const footerText = isFrench
    ? `mhaf meet — Réservation client synchronisée en temps réel avec votre Dashboard.<br>© ${new Date().getFullYear()} mhaf meet. Tous droits réservés.`
    : `mhaf meet — Client booking synchronized in real-time with your Dashboard.<br>© ${new Date().getFullYear()} mhaf meet. All rights reserved.`;

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
      background: rgba(37, 99, 235, 0.15);
      color: #60a5fa;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(37, 99, 235, 0.3);
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
      background: #2563EB;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
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
      <span class="badge">${badgeText}</span>
    </div>

    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>

    <div class="card">
      <div class="card-row">
        <span class="label">${clientLabel}</span>
        <span class="value">${attendeeName}</span>
      </div>
      <div class="card-row">
        <span class="label">${emailLabel}</span>
        <span class="value">${attendeeEmail}</span>
      </div>
      <div class="card-row">
        <span class="label">${dateLabel}</span>
        <span class="value">${formattedDate}</span>
      </div>
      <div class="card-row">
        <span class="label">${timeLabel}</span>
        <span class="value">${formattedTime}</span>
      </div>
      ${notes ? `
      <div class="card-row">
        <span class="label">${notesLabel}</span>
        <span class="value">${notes}</span>
      </div>` : ''}
    </div>

    <div class="btn-container">
      <a href="${fullRoomUrl}" class="btn" target="_blank">${btnText}</a>
    </div>

    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: `${subtitle.replace(/<[^>]+>/g, "")}\n\n${clientLabel} ${attendeeName} (${attendeeEmail})\n${dateLabel} ${formattedDate}\n${timeLabel} ${formattedTime}\n\n${btnText} : ${fullRoomUrl}\n\nmhaf meet`,
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

export async function sendMagicLinkEmail(to: string, magicLink: string, locale: "en" | "fr" = "en"): Promise<void> {
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

  const isFrench = locale === "fr";
  const subject = isFrench ? "Votre lien de connexion mhaf meet" : "Your mhaf meet sign-in link";
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
    html: `<!doctype html><html lang="${isFrench ? "fr" : "en"}"><body style="margin:0;padding:32px;background:#09090b;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"><main style="max-width:520px;margin:auto;padding:32px;background:#121215;border:1px solid #27272a;border-radius:16px"><h1 style="font-size:22px;color:#ffffff;margin-top:0">${title}</h1><p style="color:#a1a1aa;line-height:1.6">${intro}</p><p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;padding:13px 24px;border-radius:9px;background:#2563EB;color:#ffffff;text-decoration:none;font-weight:700;box-shadow:0 4px 14px rgba(37,99,235,0.35)">${btnText}</a></p><p style="color:#71717a;font-size:13px;line-height:1.6">${notice}</p></main></body></html>`,
  });
}
