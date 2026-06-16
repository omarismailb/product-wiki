#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const write = args.includes("--write");
const targetIndex = args.indexOf("--target");
const targetArg = targetIndex >= 0 ? args[targetIndex + 1] : null;

if (!targetArg || args.includes("--help")) {
  console.log(`Usage:
  node scripts/sync-managed.mjs --target <repo>
  node scripts/sync-managed.mjs --target <repo> --write

Default mode is a dry run.
The script copies managed Product Wiki files, creates missing starter files, and stages merge-required files under .product-wiki/incoming when a target already exists.`);
  process.exit(targetArg ? 0 : 1);
}

const TARGET = path.resolve(targetArg);
if (!fs.existsSync(TARGET) || !fs.statSync(TARGET).isDirectory()) {
  console.error(`Target does not exist or is not a directory: ${TARGET}`);
  process.exit(1);
}

const initiallyExisting = new Set(
  ["AGENTS.md", "CLAUDE.md"].filter((rel) => fs.existsSync(path.join(TARGET, rel))),
);

if (write && TARGET === SOURCE) {
  console.error("Refusing to sync Product Wiki into itself. Use a different --target.");
  process.exit(1);
}

const manifestPath = path.join(SOURCE, "product-wiki.json");
if (!fs.existsSync(manifestPath)) {
  console.error("product-wiki.json not found. Run this from the Product Wiki source repo.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const planned = [];

const ROUTING_BLOCKS = {
  "AGENTS.md": `<!-- product-wiki-routing:start -->
## Product Wiki Routing

For non-trivial product requests, feature ideas, bug reports, workflow changes, product questions, and retrofit tasks, route through Product Wiki before implementation.

- Create or update a proposal in \`intake/proposals/\`.
- Do not write application code until the proposal is approved.
- After approval, apply the wiki change, then compile it into checks, implementation, and verification.
- Use repo skills from \`.agents/skills\`: \`propose-change\`, \`apply-wiki-change\`, \`compile-change\`, \`generate-checks\`, \`reconcile-wiki\`, \`import-codebase\`, and \`review-architecture\`.
- Before finishing, run \`node scripts/product-wiki-check.mjs\` and the repo's normal test command.

The user should not need to name Product Wiki or a skill for ordinary product work.
<!-- product-wiki-routing:end -->`,
  "CLAUDE.md": `<!-- product-wiki-routing:start -->
## Product Wiki Routing

Follow the Product Wiki routing block in \`AGENTS.md\`.
For non-trivial product requests, use the mirrored skills in \`.claude/skills\` and do not write application code until the product wiki proposal is approved.
Use reviewer subagents from \`.claude/agents\` only when separate context helps.
<!-- product-wiki-routing:end -->`,
};

const ROUTING_START = "<!-- product-wiki-routing:start -->";
const ROUTING_END = "<!-- product-wiki-routing:end -->";

function listFiles(rel) {
  const full = path.join(SOURCE, rel);
  if (!fs.existsSync(full)) return [];
  const stat = fs.lstatSync(full);
  if (stat.isFile() || stat.isSymbolicLink()) return [rel];
  const out = [];
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const child = path.join(rel, entry.name);
    const childFull = path.join(SOURCE, child);
    const childStat = fs.lstatSync(childFull);
    if (childStat.isDirectory()) out.push(...listFiles(child));
    else out.push(child);
  }
  return out;
}

function sameFile(source, target) {
  if (!fs.existsSync(target)) return false;
  const srcStat = fs.lstatSync(source);
  const tgtStat = fs.lstatSync(target);
  if (srcStat.isSymbolicLink()) {
    return tgtStat.isSymbolicLink() && fs.readlinkSync(source) === fs.readlinkSync(target);
  }
  if (!srcStat.isFile() || !tgtStat.isFile()) return false;
  return fs.readFileSync(source).equals(fs.readFileSync(target));
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourceChild = path.join(sourceDir, entry.name);
    const targetChild = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourceChild, targetChild);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourceChild, targetChild);
    }
  }
}

function copyOne(rel, action) {
  const sourceRel = rel === "checks/manifest.json" && action === "create-starter"
    ? "templates/checks-manifest-starter.json"
    : rel;
  const source = path.join(SOURCE, sourceRel);
  const target = path.join(TARGET, rel);
  const sourceStat = fs.lstatSync(source);
  planned.push({ action, path: rel });
  if (!write) return;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (sourceStat.isSymbolicLink()) {
    if (fs.existsSync(target)) fs.rmSync(target, { force: true, recursive: true });
    const resolved = fs.realpathSync(source);
    if (fs.statSync(resolved).isDirectory()) {
      copyDirectory(resolved, target);
    } else {
      fs.symlinkSync(fs.readlinkSync(source), target);
    }
    return;
  }
  fs.copyFileSync(source, target);
}

function stageIncoming(rel) {
  const source = path.join(SOURCE, rel);
  const incoming = path.join(TARGET, ".product-wiki/incoming", rel);
  planned.push({ action: "merge-required", path: rel, incoming: path.relative(TARGET, incoming) });
  if (!write) return;

  fs.mkdirSync(path.dirname(incoming), { recursive: true });
  if (fs.lstatSync(source).isFile()) {
    fs.copyFileSync(source, incoming);
  }
}

function upsertRoutingBlock(rel) {
  if (!initiallyExisting.has(rel)) return;
  const target = path.join(TARGET, rel);
  const block = ROUTING_BLOCKS[rel];
  if (!block || !fs.existsSync(target)) return;

  const current = fs.readFileSync(target, "utf8");
  const start = current.indexOf(ROUTING_START);
  const end = current.indexOf(ROUTING_END);

  if (start !== -1 && end !== -1 && end > start) {
    const existingBlock = current.slice(start, end + ROUTING_END.length);
    if (existingBlock === block) {
      planned.push({ action: "routing-block-unchanged", path: rel });
      return;
    }

    planned.push({ action: "update-routing-block", path: rel });
    if (!write) return;

    const next = `${current.slice(0, start).trimEnd()}\n\n${block}\n${current.slice(end + ROUTING_END.length).trimStart()}`;
    fs.writeFileSync(target, next.endsWith("\n") ? next : `${next}\n`);
    return;
  }

  planned.push({ action: "activate-routing-block", path: rel });
  if (!write) return;

  const next = `${current.trimEnd()}\n\n${block}\n`;
  fs.writeFileSync(target, next);
}

function mergePackageScripts() {
  const target = path.join(TARGET, "package.json");
  if (!fs.existsSync(target)) {
    planned.push({ action: "skip-package-scripts: no package.json", path: "package.json" });
    return;
  }
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    planned.push({ action: "skip-package-scripts: invalid JSON", path: "package.json" });
    return;
  }
  // Collision-free namespace so we never clobber the repo's own scripts.
  const desired = {
    "pw:check": "node scripts/product-wiki-check.mjs",
    "pw:doctor": "node scripts/doctor.mjs",
    "pw:checks": "node scripts/checks-lint.mjs",
    "pw:checks-run": "node scripts/checks-lint.mjs --run",
    "pw:intent": "node scripts/intent-lint.mjs",
    "pw:wiki-links": "node scripts/wiki-link-lint.mjs",
    "pw:import-coverage": "node scripts/import-coverage.mjs",
    "pw:routines": "node scripts/routine-runner.mjs --all",
  };
  pkg.scripts = pkg.scripts || {};
  const added = [];
  for (const [key, value] of Object.entries(desired)) {
    if (!(key in pkg.scripts)) {
      pkg.scripts[key] = value;
      added.push(key);
    }
  }
  if (added.length === 0) {
    planned.push({ action: "package-scripts-unchanged", path: "package.json" });
    return;
  }
  planned.push({ action: `add-package-scripts: ${added.join(", ")}`, path: "package.json" });
  if (write) fs.writeFileSync(target, `${JSON.stringify(pkg, null, 2)}\n`);
}

function syncPath(rel, mode) {
  for (const file of listFiles(rel)) {
    const source = path.join(SOURCE, file);
    const target = path.join(TARGET, file);
    if (mode === "replace") {
      if (!sameFile(source, target)) copyOne(file, fs.existsSync(target) ? "update-managed" : "create-managed");
      continue;
    }
    if (mode === "create_if_missing") {
      if (!fs.existsSync(target)) copyOne(file, "create-starter");
      else planned.push({ action: "skip-existing-user-owned", path: file });
      continue;
    }
    if (mode === "merge_required") {
      if (!fs.existsSync(target)) copyOne(file, "create-merge-file");
      else if (!sameFile(source, target)) stageIncoming(file);
      else planned.push({ action: "unchanged", path: file });
    }
  }
}

for (const rel of manifest.ownership.managed_core || []) syncPath(rel, "replace");
for (const rel of manifest.ownership.create_if_missing || []) syncPath(rel, "create_if_missing");
for (const rel of manifest.ownership.merge_required || []) syncPath(rel, "merge_required");
upsertRoutingBlock("AGENTS.md");
upsertRoutingBlock("CLAUDE.md");
mergePackageScripts();

const installRecord = {
  name: manifest.name,
  version: manifest.version,
  repository: manifest.repository,
  installed_at: new Date().toISOString(),
  note: "Local product wiki, proposals, app code, and app tests remain owned by this repo.",
};

planned.push({ action: "write-install-record", path: "product-wiki.json" });
if (write) {
  fs.writeFileSync(path.join(TARGET, "product-wiki.json"), `${JSON.stringify(installRecord, null, 2)}\n`);
}

console.log(write ? "Product Wiki sync applied." : "Product Wiki sync plan.");
for (const item of planned) {
  const suffix = item.incoming ? ` -> ${item.incoming}` : "";
  console.log(`- ${item.action}: ${item.path}${suffix}`);
}

if (!write) {
  console.log("\nDry run only. Add --write to apply.");
}
