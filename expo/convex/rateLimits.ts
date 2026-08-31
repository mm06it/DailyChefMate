import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";

import { components } from "./_generated/api";

// Central rate-limit definitions. Applied per authenticated user (`key: userId`)
// unless noted "global" — those have no key and act as a coarse abuse ceiling
// for the pre-login endpoints (Convex has no request IP to key on).
//
// Usage from a mutation or action:
//   await rateLimiter.limit(ctx, "recipeSearch", { key: userId, throws: true });
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // External-API actions (cost money): Spoonacular / OpenAI.
  recipeSearch: { kind: "token bucket", rate: 40, period: HOUR, capacity: 15 },
  searchByName: { kind: "token bucket", rate: 30, period: HOUR, capacity: 10 },
  aiTranslate: { kind: "token bucket", rate: 120, period: HOUR, capacity: 40 },

  // Social / write spam.
  friendRequest: { kind: "token bucket", rate: 30, period: HOUR, capacity: 10 },
  adminMessage: { kind: "fixed window", rate: 6, period: HOUR },
  rateRecipe: { kind: "token bucket", rate: 40, period: HOUR, capacity: 15 },
  markCooked: { kind: "token bucket", rate: 60, period: HOUR, capacity: 20 },
  addFavorite: { kind: "token bucket", rate: 120, period: HOUR, capacity: 40 },

  // Pre-login enumeration endpoints — global buckets, no per-caller key.
  usernameCheck: { kind: "fixed window", rate: 240, period: MINUTE },
  emailProbe: { kind: "fixed window", rate: 300, period: MINUTE },
});
