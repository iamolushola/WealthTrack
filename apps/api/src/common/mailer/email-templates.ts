/**
 * HTML email templates for system-generated emails.
 *
 * All templates follow a consistent design: white card on a light grey
 * background, WealthTrack brand header, action button, and a plain-text
 * footer with security guidance.
 */

const BASE_URL = process.env.DASHBOARD_BASE_URL ?? 'https://wealthtrack-staging.credpal.xyz';

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#0f1729;border-radius:8px 8px 0 0;padding:28px 40px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                &#9679;&nbsp;WealthTrack
              </span>
            </td>
          </tr>
          <!-- Card body -->
          <tr>
            <td style="background:#ffffff;padding:40px;border-left:1px solid #e8ecf0;border-right:1px solid #e8ecf0;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f9;border-radius:0 0 8px 8px;padding:24px 40px;border:1px solid #e8ecf0;border-top:none;">
              <p style="margin:0;font-size:12px;color:#8a9bb0;line-height:1.6;">
                This email was sent by WealthTrack Admin Console. If you did not request this,
                please ignore it — your account remains secure. Do not share this email or any
                links it contains with anyone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" target="_blank"
    style="display:inline-block;margin-top:24px;padding:14px 28px;background:#2563eb;color:#ffffff;
           text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.1px;">
    ${label}
  </a>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e8ecf0;margin:28px 0;" />`;
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export function forgotPasswordTemplate(opts: {
  recipientName: string;
  tokenId: string;
  rawToken: string;
  expiresInMinutes: number;
}): { subject: string; html: string } {
  const link = `${BASE_URL}/reset-password?id=${encodeURIComponent(opts.tokenId)}&token=${encodeURIComponent(opts.rawToken)}`;
  const html = wrap(
    'Reset your WealthTrack password',
    `<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f1729;">Reset your password</h2>
     <p style="margin:0;color:#4a5568;font-size:15px;line-height:1.7;">
       Hi ${escapeHtml(opts.recipientName)},
     </p>
     <p style="margin:12px 0 0;color:#4a5568;font-size:15px;line-height:1.7;">
       We received a request to reset the password for your WealthTrack account.
       Click the button below to choose a new password. This link will expire in
       <strong>${opts.expiresInMinutes} minutes</strong>.
     </p>
     ${button(link, 'Reset Password')}
     ${divider()}
     <p style="margin:0;font-size:13px;color:#8a9bb0;line-height:1.6;">
       Or copy and paste this URL into your browser:<br />
       <span style="word-break:break-all;color:#2563eb;">${link}</span>
     </p>
     <p style="margin:16px 0 0;font-size:13px;color:#8a9bb0;">
       If you didn't request a password reset, you can safely ignore this email.
     </p>`,
  );
  return { subject: 'Reset your WealthTrack password', html };
}

// ─── New Admin Welcome / Set Password ────────────────────────────────────────

export function welcomeAdminTemplate(opts: {
  recipientName: string;
  recipientEmail: string;
  tokenId: string;
  rawToken: string;
  expiresInHours: number;
  createdByName: string;
}): { subject: string; html: string } {
  const link = `${BASE_URL}/set-password?id=${encodeURIComponent(opts.tokenId)}&token=${encodeURIComponent(opts.rawToken)}`;
  const html = wrap(
    "You've been invited to WealthTrack",
    `<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f1729;">Welcome to WealthTrack</h2>
     <p style="margin:0;color:#4a5568;font-size:15px;line-height:1.7;">
       Hi ${escapeHtml(opts.recipientName)},
     </p>
     <p style="margin:12px 0 0;color:#4a5568;font-size:15px;line-height:1.7;">
       ${escapeHtml(opts.createdByName)} has created an admin account for you on
       the WealthTrack Admin Console. Set up your password using the button below
       to get started. This link will expire in <strong>${opts.expiresInHours} hours</strong>.
     </p>
     <table style="margin:20px 0;width:100%;border-collapse:collapse;">
       <tr>
         <td style="padding:6px 0;font-size:14px;color:#8a9bb0;width:90px;">Email</td>
         <td style="padding:6px 0;font-size:14px;color:#0f1729;font-weight:600;">${escapeHtml(opts.recipientEmail)}</td>
       </tr>
     </table>
     ${button(link, 'Set My Password')}
     ${divider()}
     <p style="margin:0;font-size:13px;color:#8a9bb0;line-height:1.6;">
       Or copy and paste this URL into your browser:<br />
       <span style="word-break:break-all;color:#2563eb;">${link}</span>
     </p>`,
  );
  return { subject: "You've been invited to WealthTrack — set your password", html };
}

// ─── Change Password OTP ──────────────────────────────────────────────────────

export function changePasswordOtpTemplate(opts: {
  recipientName: string;
  otp: string;
  expiresInMinutes: number;
}): { subject: string; html: string } {
  const html = wrap(
    'Your WealthTrack password-change verification code',
    `<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f1729;">Verify your identity</h2>
     <p style="margin:0;color:#4a5568;font-size:15px;line-height:1.7;">
       Hi ${escapeHtml(opts.recipientName)},
     </p>
     <p style="margin:12px 0 0;color:#4a5568;font-size:15px;line-height:1.7;">
       You requested a password change on your WealthTrack account.
       Use the verification code below to confirm this action.
       The code expires in <strong>${opts.expiresInMinutes} minutes</strong>.
     </p>
     <div style="margin:28px 0;text-align:center;">
       <span style="display:inline-block;padding:16px 40px;background:#f4f6f9;border:2px dashed #cbd5e1;
                    border-radius:8px;font-size:36px;font-weight:800;letter-spacing:8px;color:#0f1729;">
         ${escapeHtml(opts.otp)}
       </span>
     </div>
     ${divider()}
     <p style="margin:0;font-size:13px;color:#8a9bb0;line-height:1.6;">
       If you did not initiate this request, please change your password immediately
       and contact your system administrator.
     </p>`,
  );
  return { subject: 'Your WealthTrack password-change verification code', html };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
