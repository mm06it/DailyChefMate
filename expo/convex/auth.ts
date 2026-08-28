import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Email + password auth via Convex Auth. Google/Apple sign-in aren't wired
// up here — hooks/use-auth.ts surfaces a clear error if they're invoked,
// same spot to add real OAuth providers later.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          username: (params.username as string | undefined) || undefined,
        };
      },
    }),
  ],
});
