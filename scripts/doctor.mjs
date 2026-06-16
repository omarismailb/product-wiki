#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Catch local machine paths leaking into committed files. Generic, not tied to
// any one username or folder: this machine's home dir, plus any absolute home
// path (cross-machine leak).
const LOCAL_PATH_PATTERNS = [
  new RegExp(escapeRegExp(os.homedir()) + "(/|\\\\|$)"),
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/,
];
const ROUTING_MARKER = "product-wiki-routing:start";
const errors = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch (error) {
    errors.push(`${rel}: invalid or unreadable JSON (${error.message})`);
    return null;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    if (entry.isDirectory()) out.push(...walk(full));
    if (entry.isFile()) out.push(full);
    if (entry.isSymbolicLink()) {
      try {
        if (fs.statSync(full).isFile()) out.push(full);
      } catch {
        warnings.push(`${path.relative(ROOT, full)}: broken symlink`);
      }
    }
  }
  return out;
}

const commonRequired = [
  "AGENTS.md",
  "CLAUDE.md",
  "CONSTITUTION.md",
  "product-wiki.json",
  ".agents/skills/propose-change/SKILL.md",
  ".agents/skills/import-codebase/SKILL.md",
  ".agents/skills/compile-change/SKILL.md",
  ".agents/skills/apply-wiki-change/SKILL.md",
  ".agents/skills/generate-checks/SKILL.md",
  ".agents/skills/reconcile-wiki/SKILL.md",
  ".agents/skills/review-architecture/SKILL.md",
  "checks/manifest.json",
  "scripts/wiki-lint.mjs",
  "scripts/proposal-lint.mjs",
  "scripts/proposal-traceability-lint.mjs",
  "scripts/checks-lint.mjs",
  "scripts/intent-lint.mjs",
  "scripts/wiki-link-lint.mjs",
  "scripts/import-coverage.mjs",
  "scripts/eval-golden.mjs",
  "scripts/hook-loop.mjs",
  "scripts/plugin-lint.mjs",
  "scripts/product-wiki-check.mjs",
  "scripts/routine-runner.mjs",
  "scripts/sync-managed.mjs",
  "scripts/doctor.mjs",
  "routines/manifest.json",
  "wiki/index.md",
  "wiki/log.md",
];

const sourceRequired = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "SUPPORT.md",
  "VERSION",
  "CHANGELOG.md",
  ".codex-plugin/plugin.json",
  "package.json",
];

const manifest = readJson("product-wiki.json");
const isSourceRepo = Boolean(manifest?.ownership);
const required = isSourceRepo ? [...commonRequired, ...sourceRequired] : commonRequired;

for (const rel of required) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

if (manifest) {
  if (isSourceRepo) {
    const versionFile = exists("VERSION") ? fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim() : null;
    if (versionFile && manifest.version !== versionFile) {
      errors.push(`VERSION (${versionFile}) does not match product-wiki.json (${manifest.version})`);
    }
    for (const section of ["managed_core", "merge_required", "create_if_missing", "user_owned", "source_only"]) {
      if (!Array.isArray(manifest.ownership?.[section])) {
        errors.push(`product-wiki.json missing ownership.${section} array`);
        continue;
      }
      for (const rel of manifest.ownership[section]) {
        if (rel === "application code" || rel === "application tests") continue;
        if (!exists(rel)) errors.push(`product-wiki.json ownership.${section} path does not exist: ${rel}`);
      }
    }
  } else {
    for (const key of ["name", "version", "repository", "installed_at"]) {
      if (!manifest[key]) errors.push(`installed product-wiki.json missing ${key}`);
    }
    if (exists("AGENTS.md")) {
      const agentsText = fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8");
      const hasFullContract = agentsText.includes("This repo is a product-wiki harness");
      const hasRoutingBlock = agentsText.includes(ROUTING_MARKER);
      if (!hasFullContract && !hasRoutingBlock) {
        errors.push("AGENTS.md does not activate Product Wiki routing");
      }
    }
    if (exists("CLAUDE.md")) {
      const claudeText = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
      const hasFullContract = claudeText.includes("Claude Code should use the same workflow as Codex");
      const hasRoutingBlock = claudeText.includes(ROUTING_MARKER);
      if (!hasFullContract && !hasRoutingBlock) {
        errors.push("CLAUDE.md does not activate Product Wiki routing");
      }
    }
  }
}

readJson("checks/manifest.json");
if (exists("package.json")) readJson("package.json");

// Only scan files that would actually be committed (tracked or untracked but
// not git-ignored). This avoids false positives on local scratch and reports,
// and falls back to a full walk outside a git repo.
function committableFiles() {
  const git = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (git.status === 0) {
    return git.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((rel) => path.join(ROOT, rel));
  }
  return walk(ROOT);
}

for (const file of committableFiles()) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith(".product-wiki/")) continue;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (LOCAL_PATH_PATTERNS.some((pattern) => pattern.test(text))) {
    errors.push(`${rel}: contains a local machine path`);
  }
}

const claudeSkills = fs.existsSync(path.join(ROOT, ".claude/skills"))
  ? fs.readdirSync(path.join(ROOT, ".claude/skills"))
  : [];

for (const name of claudeSkills) {
  const rel = `.claude/skills/${name}`;
  const full = path.join(ROOT, rel);
  const stat = fs.lstatSync(full);
  if (!stat.isSymbolicLink() && !exists(`${rel}/SKILL.md`)) {
    warnings.push(`${rel}: expected symlink or skill directory`);
  }
}

const check = spawnSync(process.execPath, ["scripts/product-wiki-check.mjs"], {
  cwd: ROOT,
  encoding: "utf8",
});

if (check.status !== 0) {
  errors.push("Product Wiki check failed");
  process.stderr.write(check.stderr || "");
  process.stdout.write(check.stdout || "");
}

if (warnings.length) {
  console.warn("Warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error("Doctor failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("product-wiki doctor passed.");
