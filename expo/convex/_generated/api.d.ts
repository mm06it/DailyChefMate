/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cooked from "../cooked.js";
import type * as crons from "../crons.js";
import type * as customRecipes from "../customRecipes.js";
import type * as favorites from "../favorites.js";
import type * as http from "../http.js";
import type * as lib_recipeLimits from "../lib/recipeLimits.js";
import type * as mealPlan from "../mealPlan.js";
import type * as otp_ResendOTP from "../otp/ResendOTP.js";
import type * as rateLimits from "../rateLimits.js";
import type * as ratings from "../ratings.js";
import type * as recipeVision from "../recipeVision.js";
import type * as recipes from "../recipes.js";
import type * as refrigerator from "../refrigerator.js";
import type * as social from "../social.js";
import type * as translate from "../translate.js";
import type * as userStats from "../userStats.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cooked: typeof cooked;
  crons: typeof crons;
  customRecipes: typeof customRecipes;
  favorites: typeof favorites;
  http: typeof http;
  "lib/recipeLimits": typeof lib_recipeLimits;
  mealPlan: typeof mealPlan;
  "otp/ResendOTP": typeof otp_ResendOTP;
  rateLimits: typeof rateLimits;
  ratings: typeof ratings;
  recipeVision: typeof recipeVision;
  recipes: typeof recipes;
  refrigerator: typeof refrigerator;
  social: typeof social;
  translate: typeof translate;
  userStats: typeof userStats;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
