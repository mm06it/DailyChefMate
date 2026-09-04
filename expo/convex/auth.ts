import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";

import { ResendOTP } from "./otp/ResendOTP";
import { checkPassword } from "../lib/password-policy";

// Email + password auth via Convex Auth. Google/Apple sign-in aren't wired
// up here — hooks/use-auth.ts surfaces a clear error if they're invoked,
// same spot to add real OAuth providers later.
//
// `verify: ResendOTP` requires an email OTP before a session is issued:
// sign-up (and sign-in for an unverified account) emails a 6-digit code,
// which the client submits with the "email-verification" flow. This is
// inert until AUTH_RESEND_KEY is set on the deployment — but once this
// file is deployed, sign-up/sign-in will fail for everyone if the key is
// missing, so deploy to dev and test there before prod.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // Brute-force protection: Convex Auth throttles failed password sign-ins AND
  // failed OTP checks per account. Tightened from the default 10/hour to 5/hour
  // (then one more roughly every 12 minutes).
  signIn: { maxFailedAttempsPerHour: 5 },
  providers: [
    Password({
      // Username is deliberately NOT taken from sign-up params: it can't be
      // validated for uniqueness synchronously here, so it would let a direct
      // API call set an arbitrary or duplicate name. The client claims the
      // username right after verification via the atomic users.updateUsername
      // mutation instead.
      profile(params) {
        return { email: params.email as string };
      },
      // Runs on sign-up (and password reset) only — never on sign-in — so
      // existing accounts are never locked out. Rules live in lib/password-policy
      // so the sign-up form enforces exactly the same thing client-side.
      validatePasswordRequirements(password: string) {
        const issue = checkPassword(password);
        if (issue) throw new ConvexError(issue);
      },
      verify: ResendOTP,
    }),
  ],
});
