import nodemailer from "nodemailer";

interface SendConfirmationEmailParams {
  to: string;
  attendeeName: string;
  meetingTitle: string;
  startTime: Date | string;
  endTime: Date | string;
  roomUrl: string;
  bookingUid: string;
  hostName?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.mail.ovh.net";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER || "hi@naiimbsili.com";
  const pass = process.env.SMTP_PASS || "NWnla117#";

  return nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    tls: {
      // Do not fail on invalid certs if any
      rejectUnauthorized: false,
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
  hostName = "MHAF Live Host",
}: SendConfirmationEmailParams) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || "MHAF Live <hi@naiimbsili.com>";

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
  <title>Confirmation de votre réunion — MHAF Live</title>
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
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #fafafa;
    }
    .logo span {
      color: #10b981;
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
      <div class="logo">MHAF <span>LIVE</span></div>
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

    <div class="footer">
      MHAF Live — Plateforme de visioconférence WebRTC ultra-rapide et sécurisée.<br>
      © ${new Date().getFullYear()} MHAF Live. Tous droits réservés.
    </div>
  </div>
</body>
</html>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject: `Confirmation de votre réunion : ${meetingTitle} (MHAF Live)`,
    text: `Bonjour ${attendeeName},\n\nVotre réunion "${meetingTitle}" avec ${hostName} est confirmée.\nDate : ${formattedDate}\nHeure : ${formattedTime}\n\nLien pour rejoindre la réunion : ${fullRoomUrl}\n\nIdentifiant de session : ${bookingUid}\n\nMHAF Live`,
    html,
  });

  return info;
}
