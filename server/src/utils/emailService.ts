import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InviteEmailOptions {
    to: string;
    recipientName: string;
    orgName: string;
    inviterName: string;
    inviteLink: string;
    shortCode: string;
}

interface PasswordResetEmailOptions {
    to: string;
    recipientName: string;
    resetLink: string;
}

interface VerificationEmailOptions {
    to: string;
    recipientName: string;
    verifyLink: string;
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
    shortCode,
}: InviteEmailOptions): Promise<void> {
    const subject = `You've been invited to join ${orgName} on 4DPMS`;
    const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const joinUrl = `${clientUrl}/auth/join`;

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
    .divider {
      text-align: center;
      margin: 24px 0;
      color: #888888;
      font-size: 14px;
      font-weight: bold;
    }
    .code-section {
      margin: 24px 0;
      padding: 20px;
      background-color: #f4f6f9;
      border-radius: 8px;
      text-align: center;
    }
    .code-section p {
      margin: 0 0 12px;
      font-size: 14px;
      color: #555555;
    }
    .code-box {
      display: inline-block;
      margin: 12px 0;
      padding: 16px 28px;
      background-color: #ffffff;
      border: 2px solid #1a3c5e;
      border-radius: 6px;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 4px;
      font-family: monospace;
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
          Accept Invite
        </a>
      </div>
      <div class="divider">OR</div>
      <div class="code-section">
        <p>Use this code to join manually:</p>
        <div class="code-box">${shortCode}</div>
        <p>Go to <a href="${joinUrl}">${joinUrl}</a> and enter this code.</p>
      </div>
    </div>
    <div class="footer">
      <p>If you didn't expect this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

    try {
        await resend.emails.send({
            from: '4DPMS <noreply@4dmps.com>',
            to,
            subject,
            html,
        });
        console.log(`[emailService] Invite email sent to ${to}`);
    } catch (error) {
        // A failed email must never crash the main request flow — log and continue.
        console.error(`[emailService] Failed to send invite email to ${to}:`, error);
    }
}

// ---------------------------------------------------------------------------
// sendVerificationEmail
// ---------------------------------------------------------------------------
export async function sendVerificationEmail({
    to,
    recipientName,
    verifyLink,
}: VerificationEmailOptions): Promise<void> {
    const subject = 'Verify your email - 4DPMS';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: Arial, sans-serif; color: #333333; }
    .wrapper { max-width: 560px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background-color: #1a3c5e; padding: 28px 32px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; }
    .body { padding: 32px; }
    .body p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background-color: #1a3c5e; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: bold; }
    .footer { background-color: #f4f6f9; padding: 20px 32px; text-align: center; }
    .footer p { margin: 0; font-size: 13px; color: #888888; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>4 Dimension Performance Management System</h1></div>
    <div class="body">
      <p>Hi ${recipientName},</p>
      <p>Please verify your email address by clicking the button below.</p>
      <div class="cta-wrapper">
        <a class="cta-button" href="${verifyLink}" target="_blank" rel="noopener noreferrer">Verify Email</a>
      </div>
    </div>
    <div class="footer"><p>If you didn't create an account, you can safely ignore this email.</p></div>
  </div>
</body>
</html>
  `.trim();

    try {
        await resend.emails.send({
            from: '4DPMS <noreply@4dmps.com>',
            to,
            subject,
            html,
        });
        console.log(`[emailService] Verification email sent to ${to}`);
    } catch (error) {
        console.error(`[emailService] Failed to send verification email to ${to}:`, error);
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
