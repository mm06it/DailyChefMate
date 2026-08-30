import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";

// Email OTP used as the `verify` provider on the Password auth provider
// (see convex/auth.ts). On sign-up — and on sign-in for an account that
// hasn't verified yet — Convex Auth calls this to email a 6-digit code;
// the client then submits it back with the "email-verification" flow.
//
// Requires two env vars on each Convex deployment:
//   AUTH_RESEND_KEY   Resend API key (npx convex env set AUTH_RESEND_KEY re_...)
//   AUTH_EMAIL_FROM   optional; defaults to Resend's shared onboarding
//                     sender, which only delivers to your own Resend
//                     account address. Set this to a verified-domain
//                     sender before real users sign up.

const CODE_TTL_MINUTES = 15;

// DailyChefMate brand palette (from assets/images/logo.source.svg).
const C = {
  ink: "#173F3A",
  teal: "#267B72",
  coral: "#E66D52",
  yellow: "#F4B95A",
  cream: "#FFF9F0",
  page: "#F1F5F4",
  body: "#3F524F",
  muted: "#8DA09C",
  border: "#E4ECEA",
};

function renderEmail(token: string, to: string) {
  const spacedCode = token.split("").join(" "); // thin-space between digits

  const text =
    `DailyChefMate\n\n` +
    `Dein Bestätigungscode: ${token}\n\n` +
    `Der Code ist ${CODE_TTL_MINUTES} Minuten gültig. ` +
    `Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.\n`;

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>DailyChefMate-Bestätigungscode</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;font-size:1px;color:${C.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
Dein DailyChefMate-Code: ${token} (${CODE_TTL_MINUTES} Minuten gültig)
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="460" cellpadding="0" cellspacing="0" border="0" style="width:460px;max-width:100%;background:#ffffff;border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="height:6px;background:${C.yellow};font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:36px 40px 8px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <div style="font-size:26px;font-weight:800;letter-spacing:-0.5px;">
              <span style="color:${C.ink};">Daily</span><span style="color:${C.coral};">Chef</span><span style="color:${C.teal};">Mate</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 0 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0;font-size:16px;line-height:1.5;color:${C.body};">
              Dein Bestätigungscode:
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 4px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:${C.cream};border:1.5px solid ${C.teal};border-radius:12px;padding:18px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:34px;font-weight:800;letter-spacing:10px;color:${C.ink};">
                  ${spacedCode}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 36px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${C.body};">
              Der Code ist <strong>${CODE_TTL_MINUTES}&nbsp;Minuten</strong> gültig.
            </p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:${C.muted};">
              Wenn du das nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.
            </p>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid ${C.border};padding:18px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:${C.muted};">
              DailyChefMate · gesendet an ${to}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return {
    subject: `${token} ist dein DailyChefMate-Bestätigungscode`,
    text,
    html,
  };
}

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * CODE_TTL_MINUTES,

  async generateVerificationToken() {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return (bytes[0] % 1_000_000).toString().padStart(6, "0");
  },

  async sendVerificationRequest({
    identifier: email,
    provider,
    token,
  }: {
    identifier: string;
    provider: { apiKey?: string };
    token: string;
  }) {
    const resend = new ResendAPI(provider.apiKey);
    const { subject, text, html } = renderEmail(token, email);
    const { error } = await resend.emails.send({
      from: process.env.AUTH_EMAIL_FROM ?? "DailyChefMate <onboarding@resend.dev>",
      to: [email],
      subject,
      text,
      html,
    });
    if (error) {
      throw new Error(`Resend konnte die E-Mail nicht senden: ${JSON.stringify(error)}`);
    }
  },
});
