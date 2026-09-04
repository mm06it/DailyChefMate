// Pull the stable error code out of whatever a Convex call rejected with.
//
// Server handlers throw `new ConvexError("SOME_CODE")`; on the client that
// arrives as an object whose `.data` is the string "SOME_CODE" — and, crucially,
// `.data` survives the production redaction that strips plain `Error` messages
// and stack traces. Fall back to the message string for non-Convex errors and
// for dev builds (which still carry the real text).
export function errorCode(e: unknown): string {
  if (e && typeof e === "object") {
    const data = (e as { data?: unknown }).data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const code = (data as { code?: unknown }).code;
      if (typeof code === "string") return code;
    }
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return String(e ?? "");
}
