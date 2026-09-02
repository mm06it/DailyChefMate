// Turn a recipe's raw step list into short, single-action steps.
//
// External sources (TheMealDB, Spoonacular, the AI generator) hand back steps
// that are often whole paragraphs — several sentences and hard line breaks
// crammed into one numbered item. The cooking view then shows one number next
// to a wall of text, so the cook has to hunt for their place. This splits those
// apart on line breaks, inline "1." / "Step 2:" enumerators and sentence
// boundaries, then stitches obvious fragments back on.

const ENUMERATOR =
  /(?:^|[\s(])(?:\d{1,2}[.)]|(?:step|schritt)\s*\d{1,2}\s*[:.)\-]?)\s+/gi;

const HARD_BREAK = /[\r\n]+|\s*[•‣▪●·]\s*/g;

const LEADING_MARKER = /^[-–—*•]\s+/;

// Lowercase abbreviations that end in "." without ending the sentence. Short
// tokens (<= 2 letters, e.g. "ca.", "z.", "u.") are always treated this way;
// these are the longer ones worth guarding.
const ABBREV = new Set([
  "bzw", "ggf", "ggfs", "evtl", "inkl", "vgl", "sog", "usw", "etc", "zzgl",
  "approx", "tbsp", "tsp", "min", "max", "std", "sek", "ca",
]);

function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  // sentence punctuation, optional closing quote/bracket, space, then something
  // that looks like the start of a new sentence (capital, digit or quote).
  const re = /([.!?…])["')\]]?\s+(?=[A-ZÄÖÜ0-9"„¡¿(])/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const cut = m.index + m[0].length;
    const sentence = text.slice(start, m.index + 1).trim();

    if (m[1] === ".") {
      const prevChar = text[m.index - 1] ?? "";
      const nextChar = text.slice(cut)[0] ?? "";
      // decimal written as "1.5" — a dot wedged between two digits
      if (/\d/.test(prevChar) && /\d/.test(nextChar)) continue;

      // token before the dot: an abbreviation only if it's lowercase AND either
      // very short ("ca.", "z.") or an explicitly listed one ("bzw.", "usw.").
      // "…zart ist." / "…Hitze aus." must still split — those are real words.
      const token = sentence.match(/([\p{L}]+)\.?$/u)?.[1] ?? "";
      const isLower = token !== "" && token === token.toLowerCase();
      if (isLower && (token.length <= 2 || ABBREV.has(token))) continue;
    }

    if (sentence) out.push(sentence);
    start = cut;
  }

  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out.length ? out : [text.trim()];
}

function letterCount(s: string): number {
  return (s.match(/\p{L}/gu) ?? []).length;
}

export function normalizeSteps(
  raw: readonly string[] | undefined | null,
): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const pieces: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const cleaned = entry.replace(/\r\n?/g, "\n").trim();
    if (!cleaned) continue;

    for (const line of cleaned.split(HARD_BREAK)) {
      const chunk = line.replace(LEADING_MARKER, "").trim();
      if (!chunk) continue;
      for (const part of chunk.split(ENUMERATOR)) {
        const p = part.trim();
        if (!p) continue;
        pieces.push(...splitSentences(p));
      }
    }
  }

  // Stitch obvious split artefacts back onto the previous step: near-empty
  // fragments, or a short clause that only continues the one before it.
  const merged: string[] = [];
  for (const piece of pieces) {
    const words = piece.split(/\s+/).filter(Boolean).length;
    const isArtefact =
      merged.length > 0 &&
      (letterCount(piece) < 6 ||
        (words < 5 && /^(und|oder|sowie|and|or)\b/i.test(piece)));
    if (isArtefact) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${piece}`.trim();
    } else {
      merged.push(piece);
    }
  }

  const steps = merged
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => letterCount(s) > 0)
    .map((s) => (/[.!?…:)]$/.test(s) ? s : `${s}.`));

  // Never return nothing: fall back to the trimmed originals.
  return steps.length
    ? steps
    : raw
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim());
}
