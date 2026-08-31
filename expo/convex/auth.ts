import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

import { ResendOTP } from "./otp/ResendOTP";

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
      validatePasswordRequirements(password: string) {
        if (typeof password !== "string" || password.length < 8) {
          throw new Error("PASSWORD_TOO_SHORT");
        }
      },
      verify: ResendOTP,
    }),
  ],
});
