#!/usr/bin/env node

// import-coverage: report how complete a brownfield retrofit is.
//
// Authoritative signal: the checkbox status in intake/import-inventory.md
// (maintained by the import-codebase skill). Advisory signal: a heuristic scan
// for top-level source modules not yet referenced anywhere in the wiki/inventory.
//
// Informational by default (exit 0). With --strict, exits 1 if any capability is
// pending or any source module looks unmapped — useful as a CI gate that a retrofit
// is actually finished.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STRICT = process.argv.includes("--strict");
const INVENTORY = path.join(ROOT, "intake/import-inventory.md");
const SOURCE_ROOTS = ["src", "app", "lib", "services", "packages", "cmd", "server", "api", "pkg", "internal"];

if (!fs.existsSync(INVENTORY)) {
  console.log("import-coverage: no intake/import-inventory.md found.");
  console.log("Run the import-codebase skill to inventory the whole repo before retrofitting.");
  process.exit(0);
}

const inventory = fs.readFileSync(INVENTORY, "utf8");
const lines = inventory.split("\n");
const imported = [];
const pending = [];
for (const line of lines) {
  const m = line.match(/^\s*-\s*\[([ xX])\]\s*(capability\.[a-z0-9.-]+|.+?)(?:\s|—|$)/);
  if (!m) continue;
  const label = (line.match(/capability\.[a-z0-9.-]+/) || [line.replace(/^\s*-\s*\[[ xX]\]\s*/, "").trim()])[0];
  if (m[1].toLowerCase() === "x") imported.push(label);
  else pending.push(label);
}

// Heuristic: top-level modules (immediate children of known source roots) that are
// never referenced in any wiki or intake file.
function mdText() {
  const out = [];
  for (const dir of ["wiki", "intake"]) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    const stack = [full];
    while (stack.length) {
      const d = stack.pop();
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (e.name.endsWith(".md")) out.push(fs.readFileSync(p, "utf8"));
      }
    }
  }
  return out.join("\n");
}
const corpus = mdText();
const unmapped = [];
for (const root of SOURCE_ROOTS) {
  const full = path.join(ROOT, root);
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) continue;
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const rel = `${root}/${e.name}`;
    if (!corpus.includes(rel) && !corpus.includes(e.name)) unmapped.push(rel);
  }
}

const total = imported.length + pending.length;
const pct = total ? Math.round((imported.length / total) * 100) : 0;
console.log(`import-coverage: ${imported.length}/${total} capabilities imported (${pct}%).`);
if (pending.length) {
  console.log(`pending (${pending.length}):`);
  for (const p of pending) console.log(`  - ${p}`);
}
if (unmapped.length) {
  console.log(`possibly unmapped source modules (heuristic, ${unmapped.length}):`);
  for (const u of unmapped) console.log(`  - ${u}`);
}

if (STRICT && (pending.length || unmapped.length)) {
  console.error("import-coverage --strict: retrofit is not complete.");
  process.exit(1);
}
