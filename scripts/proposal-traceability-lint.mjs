#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function parseProposal(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match || !/^type:\s*proposal$/m.test(match[1])) return null;
  return text.slice(match[0].length);
}

function section(body, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im"));
  return match ? match[1] : "";
}

const files = [
  ...walk(path.join(ROOT, "intake/proposals")),
  ...walk(path.join(ROOT, "examples")),
];

const errors = [];
let checked = 0;

for (const file of files) {
  const body = parseProposal(fs.readFileSync(file, "utf8"));
  if (!body) continue;
  checked += 1;

  const rel = path.relative(ROOT, file);
  const acSection = section(body, "Acceptance criteria");
  const checksSection = section(body, "Checks to generate") || section(body, "Checks");
  const acIds = [...new Set(acSection.match(/\bac\.[a-z0-9.-]+\b/g) || [])];

  if (acIds.length && !checksSection.trim()) {
    errors.push(`${rel}: acceptance criteria need a "## Checks to generate" section`);
    continue;
  }

  for (const id of acIds) {
    if (!checksSection.includes(id)) {
      errors.push(`${rel}: ${id} is not referenced in checks`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`proposal-traceability-lint passed: ${checked} proposal file(s).`);
