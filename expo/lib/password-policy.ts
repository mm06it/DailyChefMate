// Shared password policy — imported by the sign-up form (app/auth.tsx) and by
// the Convex Password provider (convex/auth.ts) so the client and server agree
// on exactly the same rules. Only applied to *new* passwords (sign-up); sign-in
// never re-validates, so existing accounts are never locked out.

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

// Lowercased + whitespace-stripped forms of the passwords that actually turn up
// first in credential-stuffing lists and in what users reach for. Not a full
// dictionary — the length + character-class rules cover the long tail.
const COMMON = new Set([
  "password", "passwort", "password1", "passwort1", "password123", "passwort123",
  "passwort!", "password!", "p@ssw0rd", "passw0rd", "password12", "passwort12",
  "12345678", "123456789", "1234567890", "1234567890", "1234512345",
  "11111111", "00000000", "0123456789", "87654321",
  "qwert123", "qwertzuiop", "qwertyuiop", "asdfghjkl", "1q2w3e4r", "1qaz2wsx", "q1w2e3r4",
  "iloveyou", "letmein123", "welcome123", "admin123", "adminadmin", "administrator",
  "sonnenschein", "fussball1", "schatz123", "hallo1234", "geheim123", "willkommen",
  "dailychefmate", "chefmate123", "rezepte123", "kochen123",
]);

const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^A-Za-z0-9]/;

function charClasses(pw: string): number {
  return (
    Number(LOWER.test(pw)) +
    Number(UPPER.test(pw)) +
    Number(DIGIT.test(pw)) +
    Number(SYMBOL.test(pw))
  );
}

const SEQ = "abcdefghijklmnopqrstuvwxyz0123456789";

// A single straight keyboard/number run with nothing else ("abcdefghij", "0123456789").
function isStraightRun(pw: string): boolean {
  const low = pw.toLowerCase();
  const rev = [...low].reverse().join("");
  return SEQ.includes(low) || SEQ.includes(rev);
}

export type PasswordIssue =
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_LONG"
  | "PASSWORD_TOO_COMMON"
  | "PASSWORD_TOO_SIMPLE";

// null = acceptable. Otherwise a machine code the UI maps to a localized string
// (and the server throws as an Error message).
export function checkPassword(pw: string): PasswordIssue | null {
  if (typeof pw !== "string" || pw.length < PASSWORD_MIN) return "PASSWORD_TOO_SHORT";
  if (pw.length > PASSWORD_MAX) return "PASSWORD_TOO_LONG";

  const norm = pw.toLowerCase().replace(/\s+/g, "");
  if (COMMON.has(norm)) return "PASSWORD_TOO_COMMON";

  if (/^(.)\1+$/.test(pw)) return "PASSWORD_TOO_SIMPLE"; // all one character
  if (isStraightRun(pw)) return "PASSWORD_TOO_SIMPLE";
  if (charClasses(pw) < 2) return "PASSWORD_TOO_SIMPLE"; // needs 2+ of lower/upper/digit/symbol

  return null;
}

// 0 weak · 1 ok · 2 strong — a coarse hint shown under the sign-up field.
export function passwordStrength(pw: string): 0 | 1 | 2 {
  if (checkPassword(pw) !== null) return 0;
  const classes = charClasses(pw);
  if (pw.length >= 16 || (pw.length >= 12 && classes >= 3)) return 2;
  return 1;
}
