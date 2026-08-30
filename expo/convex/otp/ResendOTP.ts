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
export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15, // code valid for 15 minutes

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
    const { error } = await resend.emails.send({
      from: process.env.AUTH_EMAIL_FROM ?? "DailyChefMate <onboarding@resend.dev>",
      to: [email],
      subject: "Dein DailyChefMate-Bestätigungscode",
      text:
        `Willkommen bei DailyChefMate!\n\n` +
        `Dein Bestätigungscode lautet: ${token}\n\n` +
        `Der Code ist 15 Minuten gültig. Wenn du das nicht warst, ` +
        `kannst du diese E-Mail ignorieren.`,
    });
    if (error) {
      throw new Error(`Resend konnte die E-Mail nicht senden: ${JSON.stringify(error)}`);
    }
  },
});
