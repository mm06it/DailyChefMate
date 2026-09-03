import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { action, type ActionCtx } from "./_generated/server";
import { rateLimiter } from "./rateLimits";
import { normalizeSteps } from "../lib/normalize-steps";

// "Add recipe from a photo": send a photo of a handwritten / cookbook recipe to
// an OpenAI-compatible vision model and get back a structured recipe that
// pre-fills the Add Recipe form. One call per scan (rare event). Same endpoint
// + key as convex/translate.ts.

async function requireUserId(ctx: ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_URL = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
// Vision-specific override so a sharper (pricier) model can be used here without
// affecting translation / search which share AI_MODEL.
const AI_VISION_MODEL = process.env.AI_VISION_MODEL ?? process.env.AI_MODEL ?? "gpt-4o-mini";

// ~6.5 MB decoded — a phone photo at quality 0.5 is well under this.
const MAX_BASE64_LEN = 9_000_000;
const MAX_STEPS = 60;
const MAX_INGREDIENTS = 60;

type ParsedRecipe = {
  name: string;
  servings: number | null;
  category: string | null;
  mode: "cooking" | "baking" | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  ovenHeatC: number | null;
  ovenTimeMin: number | null;
  ingredients: { name: string; amount: string }[];
  steps: string[];
};

const PROMPT =
  "This is a photo of a handwritten or printed recipe from a cookbook. " +
  "Transcribe it VERBATIM — do not invent, summarise, reorder or translate " +
  "anything; keep the recipe's own language. Return ONLY a JSON object of the " +
  "exact shape " +
  '{"name":string,"servings":number|null,"category":string|null,' +
  '"mode":"cooking"|"baking"|null,"prepTimeMin":number|null,"cookTimeMin":number|null,' +
  '"ovenHeatC":number|null,"ovenTimeMin":number|null,' +
  '"ingredients":[{"name":string,"amount":string}],"steps":[string]}. ' +
  'Set "mode" to "baking" only if the recipe clearly uses an oven, otherwise ' +
  '"cooking". For "category", pick the single best fit from EXACTLY this list — ' +
  '"Hauptspeise", "Vorspeise", "Dessert", "Snack", "Suppe", "Salat" — or null if ' +
  "none fits. Split the instructions into one short step per action. Put every " +
  "quantity in the ingredient's \"amount\" (e.g. \"200 g\", \"2 EL\", \"1\"). " +
  "If a field is not on the photo, use null (empty array for ingredients/steps). " +
  'If the image is not a readable recipe, return {"error":"unreadable"}. No commentary.';

function clampNum(x: unknown, lo: number, hi: number): number | null {
  const n = Math.round(Number(x));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null;
}
function clampStr(x: unknown, max: number): string {
  return typeof x === "string" ? x.trim().slice(0, max) : "";
}

function coerce(raw: unknown): ParsedRecipe {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawSteps = Array.isArray(o.steps) ? o.steps : [];
  const steps = normalizeSteps(rawSteps.map((s) => String(s)))
    .map((s) => s.slice(0, 2000))
    .filter(Boolean)
    .slice(0, MAX_STEPS);
  const rawIngredients = Array.isArray(o.ingredients) ? o.ingredients : [];
  const ingredients = rawIngredients
    .map((i) => {
      const it = (i && typeof i === "object" ? i : {}) as Record<string, unknown>;
      return { name: clampStr(it.name, 120), amount: clampStr(it.amount, 60) };
    })
    .filter((i) => i.name.length > 0)
    .slice(0, MAX_INGREDIENTS);
  const mode = o.mode === "cooking" || o.mode === "baking" ? o.mode : null;
  return {
    name: clampStr(o.name, 200),
    servings: clampNum(o.servings, 1, 100),
    category: clampStr(o.category, 80) || null,
    mode,
    prepTimeMin: clampNum(o.prepTimeMin, 0, 1440),
    cookTimeMin: clampNum(o.cookTimeMin, 0, 1440),
    ovenHeatC: clampNum(o.ovenHeatC, 0, 500),
    ovenTimeMin: clampNum(o.ovenTimeMin, 0, 1440),
    ingredients,
    steps,
  };
}

export const parseRecipeFromPhoto = action({
  args: { imageBase64: v.string(), mimeType: v.string() },
  handler: async (ctx, { imageBase64, mimeType }): Promise<ParsedRecipe> => {
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "aiRecipePhoto", { key: userId, throws: true });

    if (!imageBase64 || imageBase64.length > MAX_BASE64_LEN) {
      throw new Error("IMAGE_TOO_LARGE");
    }
    if (!AI_API_KEY) throw new Error("AI_UNAVAILABLE");

    const mime = /^image\/(jpeg|png|webp|heic|heif)$/.test(mimeType) ? mimeType : "image/jpeg";

    const res = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({
        model: AI_VISION_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${imageBase64}`, detail: "high" },
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("parseRecipeFromPhoto AI HTTP", res.status, (await res.text()).slice(0, 300));
      throw new Error("AI_FAILED");
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data?.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("parseRecipeFromPhoto parse failed", text.slice(0, 200), e);
      throw new Error("UNREADABLE");
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as Record<string, unknown>).error ||
      (!Array.isArray((parsed as Record<string, unknown>).steps) &&
        !Array.isArray((parsed as Record<string, unknown>).ingredients))
    ) {
      throw new Error("UNREADABLE");
    }
    return coerce(parsed);
  },
});
