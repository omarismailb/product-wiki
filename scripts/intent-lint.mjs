#!/usr/bin/env node

// intent-lint: enforce the approval gate deterministically.
//
// 1. An acceptance criterion may only be `status: active` if an `approved` or
//    `implemented` proposal introduced it. Active criteria must trace back to
//    human approval before they can become pending compile or implemented
//    behaviour.
// 2. Every executable check (unit, integration, e2e) must cover at least one
//    acceptance criterion, so running code always traces to product intent.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXECUTABLE_KINDS = new Set(["unit", "integration", "e2e"]);
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

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const raw of match[1].split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (parts) data[parts[1]] = parts[2].replace(/^["']|["']$/g, "");
  }
  return { data, body: text.slice(match[0].length) };
}

const activeCriteria = new Map(); // id -> file
const approvedCriteria = new Set(); // ac ids introduced by an approved/implemented proposal

for (const file of [...walk(path.join(ROOT, "wiki")), ...walk(path.join(ROOT, "intake/proposals")), ...walk(path.join(ROOT, "examples"))]) {
  const { data, body } = frontmatter(fs.readFileSync(file, "utf8"));
  const rel = path.relative(ROOT, file);

  if (data.type === "acceptance-criterion" && data.status === "active" && data.id) {
    activeCriteria.set(data.id, rel);
  }
  if (data.type === "proposal" && ["approved", "implemented"].includes(data.status)) {
    for (const acId of body.match(/\bac\.[a-z0-9.-]+\b/g) || []) approvedCriteria.add(acId);
  }
}

for (const [id, rel] of activeCriteria) {
  if (!approvedCriteria.has(id)) {
    errors.push(
      `${rel}: acceptance criterion "${id}" is active but no approved or implemented proposal introduces it. ` +
        `Approval gate: add "${id}" to an approved proposal in intake/proposals/, or set the criterion status to draft.`,
    );
  }
}

const manifestPath = path.join(ROOT, "checks/manifest.json");
if (fs.existsSync(manifestPath)) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    console.error(`checks/manifest.json is invalid JSON: ${error.message}`);
    process.exit(1);
  }
  for (const check of manifest.checks || []) {
    if (!EXECUTABLE_KINDS.has(check.kind)) continue;
    const covered = (check.covers || []).some((id) => /^ac\./.test(id));
    if (!covered) {
      errors.push(
        `${check.id || "check"}: an executable check (kind ${check.kind}) must cover at least one acceptance criterion (an "ac.*" id).`,
      );
    }
  }
}

if (errors.length) {
  console.error(`intent-lint failed with ${errors.length} issue(s):`);
  for (const issue of errors) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`intent-lint passed: ${activeCriteria.size} active criterion/criteria traced to approval.`);
