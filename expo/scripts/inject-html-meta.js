// Patches dist/index.html after `expo export -p web`. Expo Router's
// `app/+html.tsx` document-template override only applies when
// `web.output` is "static"/"server" — this project stays on the default
// "single" (SPA) output, so the SEO/social meta tags are added here instead,
// as a small postbuild step (see vercel.json's buildCommand).
const fs = require("fs");
const path = require("path");

const SITE_URL = "https://www.dailychefmate.com";
const TITLE = "DailyChefMate – Rezepte, Kühlschrank & Wochenplan";
const DESCRIPTION =
  "Rezepte entdecken, aus deinen Kühlschrank-Zutaten kochen, den Wochenplan füllen und mit Freunden teilen – DailyChefMate ist dein digitaler Kochbegleiter.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const file = path.join(__dirname, "..", "dist", "index.html");
let html = fs.readFileSync(file, "utf8");

if (!html.includes('property="og:title"')) {
  html = html.replace('<html lang="en">', '<html lang="de">');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`);

  const metaBlock = `
    <meta name="theme-color" content="#F0603F" />
    <meta name="description" content="${DESCRIPTION}" />
    <link rel="canonical" href="${SITE_URL}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="DailyChefMate" />
    <meta property="og:url" content="${SITE_URL}" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:locale" content="de_DE" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${TITLE}" />
    <meta name="twitter:description" content="${DESCRIPTION}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />
  </head>`;
  html = html.replace(/<\/head>/, metaBlock);

  fs.writeFileSync(file, html);
  console.log("[inject-html-meta] dist/index.html patched with SEO/OG tags");
} else {
  console.log("[inject-html-meta] already patched, skipping");
}
