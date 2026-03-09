import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Transporter
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for port 465, false otherwise
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InviteEmailOptions {
    to: string;
    recipientName: string;
    orgName: string;
    inviterName: string;
    inviteLink: string;
}

interface PasswordResetEmailOptions {
    to: string;
    recipientName: string;
    resetLink: string;
}

// ---------------------------------------------------------------------------
// sendInviteEmail
// ---------------------------------------------------------------------------
export async function sendInviteEmail({
    to,
    recipientName,
    orgName,
    inviterName,
    inviteLink,
}: InviteEmailOptions): Promise<void> {
    const subject = `You've been invited to join ${orgName} on 4DPMS`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f9;
      font-family: Arial, sans-serif;
      color: #333333;
    }
    .wrapper {
      max-width: 560px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .header {
      background-color: #1a3c5e;
      padding: 28px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 22px;
      letter-spacing: 0.5px;
    }
    .body {
      padding: 32px;
    }
    .body p {
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 16px;
    }
    .cta-wrapper {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #1a3c5e;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-size: 15px;
      font-weight: bold;
      letter-spacing: 0.3px;
    }
    .footer {
      background-color: #f4f6f9;
      padding: 20px 32px;
      text-align: center;
    }
    .footer p {
      margin: 0;
      font-size: 13px;
      color: #888888;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>4 Dimension Performance Management System</h1>
    </div>
    <div class="body">
      <p>Hi ${recipientName},</p>
      <p>
        <strong>${inviterName}</strong> has added you to <strong>${orgName}</strong>
        on the 4 Dimension Performance Management System.
      </p>
      <p>Click the button below to accept your invitation and get started.</p>
      <div class="cta-wrapper">
        <a class="cta-button" href="${inviteLink}" target="_blank" rel="noopener noreferrer">
          Accept Invite &amp; Get Started
        </a>
      </div>
    </div>
    <div class="footer">
      <p>If you didn't expect this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

    const text = `
Hi ${recipientName},

${inviterName} has added you to ${orgName} on the 4 Dimension Performance Management System.

Accept your invitation and get started here:
${inviteLink}

If you didn't expect this email, you can safely ignore it.
  `.trim();

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html,
            text,
        });
        console.log(`[emailService] Invite email sent to ${to}`);
    } catch (error) {
        // A failed email must never crash the main request flow — log and continue.
        console.error(`[emailService] Failed to send invite email to ${to}:`, error);
    }
}

// ---------------------------------------------------------------------------
// sendPasswordResetEmail  (scaffolded — not yet implemented)
// ---------------------------------------------------------------------------
export async function sendPasswordResetEmail({
    to,
    recipientName: _recipientName,
    resetLink: _resetLink,
}: PasswordResetEmailOptions): Promise<void> {
    // TODO: Implement password-reset email template.
    //       Follow the same pattern as sendInviteEmail above:
    //       1. Build HTML + text payloads with the resetLink and recipientName.
    //       2. Call transporter.sendMail() inside a try/catch.
    //       3. Log success or error — never throw.
    console.log(`[emailService] sendPasswordResetEmail is not yet implemented (to: ${to})`);
}
