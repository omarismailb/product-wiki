#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const steps = [
  ["wiki-lint", ["scripts/wiki-lint.mjs"]],
  ["wiki-link-lint", ["scripts/wiki-link-lint.mjs"]],
  ["proposal-lint", ["scripts/proposal-lint.mjs"]],
  ["proposal-traceability-lint", ["scripts/proposal-traceability-lint.mjs"]],
  ["checks-lint", ["scripts/checks-lint.mjs"]],
  ["intent-lint", ["scripts/intent-lint.mjs"]],
  ["eval-golden", ["scripts/eval-golden.mjs"]],
  ["plugin-lint", ["scripts/plugin-lint.mjs"]],
  ["routine-runner", ["scripts/routine-runner.mjs", "--check"]],
  ["hook-loop", ["scripts/hook-loop.mjs", "--check"]],
];

for (const [name, args] of steps) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`product-wiki-check failed at ${name}`);
    process.exit(result.status || 1);
  }
}

console.log("product-wiki-check passed.");
