#!/usr/bin/env node

// wiki-link-lint: catch broken typed wiki links.
//
// A "typed link" is a [[id]] whose target looks like a stable unit id, i.e.
// lowercase with at least one dot (e.g. [[capability.option-scoring]]). Those
// must resolve to a declared frontmatter id somewhere in the product wiki or
// proposals. Free-form links like [[Some Note]] are ignored, so prose is safe.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function frontmatterId(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const idLine = match[1].split("\n").find((line) => /^id:\s*/.test(line.trim()));
  return idLine ? idLine.replace(/^id:\s*/, "").trim().replace(/^["']|["']$/g, "") : null;
}

const scanDirs = ["wiki", "intake/proposals", "examples"];
const files = scanDirs.flatMap((dir) => walk(path.join(ROOT, dir)));

const declared = new Set();
for (const file of files) {
  const id = frontmatterId(fs.readFileSync(file, "utf8"));
  if (id) declared.add(id);
}

const TYPED = /^[a-z0-9]+(?:\.[a-z0-9-]+)+$/; // lowercase, dotted

let linkCount = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const target = match[1].trim();
    if (!TYPED.test(target)) continue; // ignore free-form links
    linkCount += 1;
    if (!declared.has(target)) {
      errors.push(`${rel}: broken wiki link [[${target}]] does not resolve to a declared unit id.`);
    }
  }
}

if (errors.length) {
  console.error(`wiki-link-lint failed with ${errors.length} issue(s):`);
  for (const issue of errors) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`wiki-link-lint passed: ${linkCount} typed link(s) resolve.`);
