#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "checks/manifest.json");
const RUN = process.argv.includes("--run");
const KINDS = new Set(["unit", "integration", "e2e", "lint", "typecheck", "manual", "eval"]);

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out;
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

function collectIds() {
  const ids = new Set();
  const approvedCriteria = new Set();
  const implementedCriteria = new Set();
  const activeWikiCriteria = new Set();
  const files = [
    ...walk(path.join(ROOT, "wiki"), (file) => file.endsWith(".md")),
    ...walk(path.join(ROOT, "intake/proposals"), (file) => file.endsWith(".md")),
    ...walk(path.join(ROOT, "examples"), (file) => file.endsWith(".md")),
  ];

  for (const file of files) {
    const parsed = frontmatter(fs.readFileSync(file, "utf8"));
    if (!parsed) continue;
    if (parsed.data.id) ids.add(parsed.data.id);
    const acIds = parsed.body.match(/\bac\.[a-z0-9.-]+\b/g) || [];
    for (const acId of acIds) {
      ids.add(acId);
    }
    if (parsed.data.type === "acceptance-criterion" && parsed.data.status === "active" && parsed.data.id) {
      activeWikiCriteria.add(parsed.data.id);
    }
    if (parsed.data.type === "proposal" && parsed.data.status === "approved") {
      for (const acId of acIds) approvedCriteria.add(acId);
    }
    if (parsed.data.type === "proposal" && parsed.data.status === "implemented") {
      for (const acId of acIds) implementedCriteria.add(acId);
    }
  }

  // Lifecycle:
  // - approved proposal: ready for compile-change, checks may not exist yet.
  // - implemented proposal or active criterion outside a pending proposal: checks must exist.
  const criteriaRequiringCoverage = new Set(implementedCriteria);
  const pendingCompileCriteria = new Set();

  for (const acId of activeWikiCriteria) {
    if (implementedCriteria.has(acId)) {
      criteriaRequiringCoverage.add(acId);
    } else if (approvedCriteria.has(acId)) {
      pendingCompileCriteria.add(acId);
    } else {
      criteriaRequiringCoverage.add(acId);
    }
  }

  return { ids, criteriaRequiringCoverage, pendingCompileCriteria };
}

const errors = [];

if (!fs.existsSync(MANIFEST)) {
  console.error("checks/manifest.json is missing");
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
} catch (error) {
  console.error(`checks/manifest.json is invalid JSON: ${error.message}`);
  process.exit(1);
}

if (!manifest || !Array.isArray(manifest.checks)) {
  errors.push("checks/manifest.json must contain a checks array");
}

const ids = new Set();
const { ids: resolvableIds, criteriaRequiringCoverage, pendingCompileCriteria } = collectIds();
const coveredIds = new Set();

for (const check of manifest.checks || []) {
  if (!check || typeof check !== "object") {
    errors.push("each check must be an object");
    continue;
  }

  if (!check.id || !/^check\.[a-z0-9.-]+$/.test(check.id)) {
    errors.push("check id must look like check.some-id");
  } else if (ids.has(check.id)) {
    errors.push(`${check.id}: duplicate check id`);
  } else {
    ids.add(check.id);
  }

  if (!Array.isArray(check.covers) || check.covers.length === 0) {
    errors.push(`${check.id || "check"}: covers must be a non-empty array`);
  } else {
    for (const covered of check.covers) {
      if (typeof covered !== "string" || !/^[a-z0-9.-]+$/.test(covered)) {
        errors.push(`${check.id}: invalid covered id "${covered}"`);
      } else if (!resolvableIds.has(covered)) {
        errors.push(
          `${check.id}: covered id "${covered}" does not resolve. ` +
            `It must be a stable id declared in wiki/ (frontmatter id) or referenced in a proposal.`,
        );
      } else {
        coveredIds.add(covered);
      }
    }
  }

  if (!KINDS.has(check.kind)) {
    errors.push(`${check.id || "check"}: invalid kind "${check.kind}"`);
  }
  if (!check.command || typeof check.command !== "string") {
    errors.push(`${check.id || "check"}: command is required`);
  }
  if (check.evidence_path && !fs.existsSync(path.join(ROOT, check.evidence_path))) {
    errors.push(`${check.id || "check"}: evidence_path does not exist: ${check.evidence_path}`);
  }
}

for (const id of criteriaRequiringCoverage) {
  if (!coveredIds.has(id)) {
    errors.push(`active acceptance criterion is not covered by checks/manifest.json: ${id}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (RUN) {
  for (const check of manifest.checks) {
    console.log(`running ${check.id}: ${check.command}`);
    const result = spawnSync(check.command, {
      cwd: ROOT,
      shell: true,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      console.error(`${check.id}: command failed with exit ${result.status}`);
      process.exit(result.status || 1);
    }
  }
}

const pending = [...pendingCompileCriteria].filter((id) => !coveredIds.has(id));
if (pending.length) {
  console.log(
    `checks-lint passed: ${manifest.checks.length} check(s), ${pending.length} approved criterion/criteria pending compile.`,
  );
  console.log(`pending compile coverage: ${pending.join(", ")}`);
} else {
  console.log(`checks-lint passed: ${manifest.checks.length} check(s).`);
}
