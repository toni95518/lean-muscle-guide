// Writes public/privacy.html from src/lib/privacy.ts, so the policy has a plain URL
// (https://lean-muscle-guide.expo.app/privacy.html) that works without JavaScript.
import { writeFileSync } from "node:fs";
import { CONTACT, SECTIONS, UPDATED } from "../src/lib/privacy.ts";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const body = SECTIONS.map((s) => `<h2>${esc(s.title)}</h2>\n${s.body.map((p) => `<p>${esc(p)}</p>`).join("\n")}`).join("\n");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy policy · Lean Muscle Theory Guide</title>
<style>body{font:16px/1.6 system-ui,-apple-system,sans-serif;max-width:680px;margin:0 auto;padding:24px 16px;color:#16201B;background:#F2F5F1}h1{font-size:26px}h2{font-size:18px;margin-top:28px}a{color:#0B7A55}small{color:#5B675F}</style>
</head><body>
<h1>Privacy policy</h1>
<small>Lean Muscle Theory Guide (薄肌理论指南) · Last updated ${esc(UPDATED)}</small>
${body}
<p><a href="${CONTACT}">${CONTACT}</a></p>
</body></html>
`;
writeFileSync(new URL("../public/privacy.html", import.meta.url), html);
console.log("wrote public/privacy.html");
