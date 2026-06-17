#!/usr/bin/env node

// Product Wiki installer CLI.
//
// One-command install/upgrade, no global install needed:
//
//   npx github:omarismailb/product-wiki#v1.5.1 init      install into the current repo
//   npx github:omarismailb/product-wiki#v1.5.1 sync      re-sync managed files (upgrade)
//   npx github:omarismailb/product-wiki#v1.5.1 init --dry-run   preview without writing
//
// It wraps scripts/sync-managed.mjs (the ownership-aware copy) and then runs the
// harness checks, so the documented install is one line instead of a temp-dir dance.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = process.cwd();
const argv = process.argv.slice(2);
const cmd = argv[0] || "help";
const dryRun = argv.includes("--dry-run");

function run(script, args = []) {
  return spawnSync(process.execPath, [path.join(PKG_ROOT, "scripts", script), ...args], {
    cwd: TARGET,
    stdio: "inherit",
  });
}

if (cmd === "help" || argv.includes("--help") || argv.includes("-h")) {
  console.log(`Product Wiki — install or upgrade the harness in the current repo.

Usage (no global install needed):
  npx github:omarismailb/product-wiki#<tag> init        install into the current directory
  npx github:omarismailb/product-wiki#<tag> sync        re-sync managed files (upgrade)
  npx github:omarismailb/product-wiki#<tag> init --dry-run   preview the plan, write nothing

Run from the root of the repo you want to add Product Wiki to.
Pin to a release tag (#v1.5.1) for a reproducible install.`);
  process.exit(0);
}

if (cmd !== "init" && cmd !== "sync") {
  console.error(`Unknown command: ${cmd}\nRun with --help for usage.`);
  process.exit(1);
}

if (PKG_ROOT === TARGET) {
  console.error("Refusing to install Product Wiki into its own source repo. Run this from your product repo.");
  process.exit(1);
}

console.log(`Product Wiki: ${dryRun ? "previewing install for" : (cmd === "sync" ? "upgrading" : "installing into")} ${TARGET}`);

const sync = run("sync-managed.mjs", ["--target", TARGET, ...(dryRun ? [] : ["--write"])]);
if (sync.status !== 0) process.exit(sync.status || 1);

if (dryRun) {
  console.log("\nDry run only. Re-run without --dry-run to apply.");
  process.exit(0);
}

console.log("\nVerifying install...");
const check = run("product-wiki-check.mjs");
const doctor = run("doctor.mjs");

if (check.status === 0 && doctor.status === 0) {
  console.log("\nProduct Wiki installed and verified. Next: open Claude Code or Codex in this repo");
  console.log("and describe the feature you want to build — it will route through a proposal first.");
  process.exit(0);
}

console.log("\nProduct Wiki installed, but the checks above reported issues. Review them before continuing.");
process.exit(1);
