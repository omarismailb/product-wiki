#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EVAL_ROOT = path.join(ROOT, "evals/golden");
const errors = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${path.relative(ROOT, file)}: invalid JSON (${error.message})`);
    return null;
  }
}

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  const data = {};
  for (const raw of match[1].split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!parts) continue;
    data[parts[1]] = parts[2].replace(/^["']|["']$/g, "");
  }
  return { data, body: text.slice(match[0].length) };
}

function section(body, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im"));
  return match ? match[1] : "";
}

function validateEval(file) {
  const rel = path.relative(ROOT, file);
  const fixture = readJson(file);
  if (!fixture) return;

  if (!fixture.id || !/^eval\.[a-z0-9.-]+$/.test(fixture.id)) {
    errors.push(`${rel}: id must look like eval.some-id`);
  }
  if (!fixture.request || typeof fixture.request !== "string") {
    errors.push(`${rel}: request is required`);
  }
  if (!fixture.proposal || typeof fixture.proposal !== "string") {
    errors.push(`${rel}: proposal path is required`);
    return;
  }

  const proposalPath = path.join(ROOT, fixture.proposal);
  if (!fs.existsSync(proposalPath)) {
    errors.push(`${rel}: proposal does not exist: ${fixture.proposal}`);
    return;
  }

  const parsed = frontmatter(fs.readFileSync(proposalPath, "utf8"));
  if (!parsed || parsed.data.type !== "proposal") {
    errors.push(`${rel}: proposal path does not point at a proposal file`);
    return;
  }

  const proposalRel = path.relative(ROOT, proposalPath);
  const requestText = `${parsed.data.request || ""}\n${parsed.body}`;
  if (!requestText.includes(fixture.request)) {
    errors.push(`${proposalRel}: does not include eval request text`);
  }

  const proposedChanges = section(parsed.body, "Proposed wiki additions") || section(parsed.body, "Proposed wiki changes");
  const acSection = section(parsed.body, "Acceptance criteria");
  const checksSection = section(parsed.body, "Checks to generate") || section(parsed.body, "Checks");

  for (const unit of fixture.must_include_units || []) {
    if (!unit.id || !unit.type) {
      errors.push(`${rel}: every must_include_units item needs id and type`);
      continue;
    }
    if (!proposedChanges.includes(unit.id)) {
      errors.push(`${proposalRel}: missing expected ${unit.type} unit ${unit.id}`);
    }
  }

  for (const acId of fixture.must_include_acceptance_criteria || []) {
    if (!acSection.includes(acId)) {
      errors.push(`${proposalRel}: missing expected acceptance criterion ${acId}`);
    }
  }

  for (const check of fixture.must_include_checks || []) {
    if (!check.covers || !check.kind) {
      errors.push(`${rel}: every must_include_checks item needs covers and kind`);
      continue;
    }
    if (!checksSection.includes(check.covers)) {
      errors.push(`${proposalRel}: missing check strategy for ${check.covers}`);
    }
  }
}

if (!fs.existsSync(EVAL_ROOT)) {
  console.error("evals/golden is missing");
  process.exit(1);
}

const evalFiles = [];
for (const entry of fs.readdirSync(EVAL_ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(EVAL_ROOT, entry.name, "expected.json");
  if (fs.existsSync(file)) evalFiles.push(file);
}

for (const file of evalFiles) validateEval(file);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (evalFiles.length === 0) {
  console.log("eval-golden skipped: no fixtures found under evals/golden/*/expected.json.");
  process.exit(0);
}

console.log(`eval-golden passed: ${evalFiles.length} fixture(s).`);
