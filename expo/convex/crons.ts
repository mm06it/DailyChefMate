import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Drop recipeCache rows past their TTL (see CACHE_TTL_MS in recipes.ts) so
// one-off ingredient combinations don't pile up forever. The read path
// already ignores expired rows — this only bounds table growth.
crons.daily(
  "prune stale recipe cache",
  { hourUTC: 3, minuteUTC: 0 },
  internal.recipes.pruneRecipeCache,
  {},
);

export default crons;
