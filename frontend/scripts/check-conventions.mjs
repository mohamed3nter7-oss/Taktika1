/**
 * Conventions the design system and CLAUDE.md require, checked mechanically.
 *
 * These are the DoD checkboxes for the profile UI: no physical direction
 * utilities (they do not mirror under RTL), no arbitrary Tailwind values, no
 * inline style objects (which slip past a className-only grep), no hardcoded
 * colours outside globals.css, and identical keys in both locale files.
 *
 * Run with: npm run check:conventions
 */
import fs from "node:fs";
import path from "node:path";

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
})("src");

const gates = [
  {
    name: "physical direction utilities",
    re: /(?:^|["'\s:])-?(?:ml|mr|pl|pr)-[\w.]|(?:^|["'\s:])border-[lr]\b|(?:^|["'\s:])rounded-[lr]\b|(?:^|["'\s:])(?:left|right)-[\w.]|text-left|text-right|float-left|float-right/,
    classOnly: true,
  },
  { name: "arbitrary Tailwind values", re: /-\[[^\]]+\]/, classOnly: true },
  { name: "inline style objects", re: /style=\{\{/, classOnly: false },
  {
    name: "hardcoded colours",
    re: /#[0-9a-fA-F]{3,8}\b|\brgba?\(/,
    classOnly: false,
  },
];

let failures = 0;
for (const gate of gates) {
  const hits = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    src.split("\n").forEach((line, i) => {
      const subject = gate.classOnly
        ? (line.match(/className=(?:"[^"]*"|\{[^}]*\}|`[^`]*`)/g) || []).join(" ")
        : line;
      if (subject && gate.re.test(subject)) {
        hits.push(`${file}:${i + 1}  ${line.trim().slice(0, 110)}`);
      }
    });
  }
  console.log(`\n${hits.length === 0 ? "PASS" : "FAIL"}  ${gate.name}  (${hits.length})`);
  hits.slice(0, 12).forEach((h) => console.log("      " + h));
  if (hits.length) failures++;
}

const flat = (o, p = "") =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? flat(v, p + k + ".") : [p + k],
  );
const en = flat(JSON.parse(fs.readFileSync("messages/en.json", "utf8"))).sort();
const ar = flat(JSON.parse(fs.readFileSync("messages/ar.json", "utf8"))).sort();
const onlyEn = en.filter((k) => !ar.includes(k));
const onlyAr = ar.filter((k) => !en.includes(k));
const parity = onlyEn.length === 0 && onlyAr.length === 0;
console.log(`\n${parity ? "PASS" : "FAIL"}  locale key parity (${en.length} keys)`);
if (!parity) {
  console.log("      only in en: " + onlyEn.join(", "));
  console.log("      only in ar: " + onlyAr.join(", "));
  failures++;
}

process.exit(failures ? 1 : 0);
