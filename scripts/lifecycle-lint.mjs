#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CHECKS_LINT = path.join(ROOT, "scripts/checks-lint.mjs");
const errors = [];

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function runChecksLint(cwd) {
  return spawnSync(process.execPath, [CHECKS_LINT], {
    cwd,
    encoding: "utf8",
  });
}

function expect(condition, message) {
  if (!condition) errors.push(message);
}

function fixture(status, withCoverage = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "product-wiki-lifecycle-"));

  write(
    path.join(dir, "checks/manifest.json"),
    `${JSON.stringify(
      {
        checks: withCoverage
          ? [
              {
                id: "check.calculator.addition",
                covers: ["ac.calculator.addition"],
                kind: "unit",
                command: "node -e \"process.exit(0)\"",
              },
              {
                id: "check.calculator.clear-resets",
                covers: ["ac.calculator.clear-resets"],
                kind: "unit",
                command: "node -e \"process.exit(0)\"",
              },
            ]
          : [],
      },
      null,
      2,
    )}\n`,
  );

  write(
    path.join(dir, "intake/proposals/0001-calculator.md"),
    `---
id: proposal.calculator
type: proposal
status: ${status}
approval_status: approved
approved_by: Omar
approved_at: 2026-06-16
updated: 2026-06-16
---

# Proposal: calculator

## Acceptance criteria

- \`ac.calculator.addition\`: Given 2 + 2, when the user evaluates it, then the result is 4.
- \`ac.calculator.clear-resets\`: Given a displayed result, when the user presses clear, then the display resets.

## Checks to generate

- \`ac.calculator.addition\`: Add a unit test for addition.
- \`ac.calculator.clear-resets\`: Add an interaction test for clear.
`,
  );

  for (const id of ["addition", "clear-resets"]) {
    write(
      path.join(dir, `wiki/acceptance-criteria/calculator-${id}.md`),
      `---
id: ac.calculator.${id}
type: acceptance-criterion
status: active
updated: 2026-06-16
links: []
---

# Calculator ${id}
`,
    );
  }

  return dir;
}

const approvedPending = fixture("approved", false);
const approvedRun = runChecksLint(approvedPending);
expect(
  approvedRun.status === 0,
  `approved pending compile should pass checks-lint, got ${approvedRun.status}\n${approvedRun.stderr}${approvedRun.stdout}`,
);
expect(
  approvedRun.stdout.includes("approved criterion/criteria pending compile"),
  "approved pending compile should report pending compile coverage",
);

const implementedMissing = fixture("implemented", false);
const missingRun = runChecksLint(implementedMissing);
expect(missingRun.status !== 0, "implemented criteria without manifest coverage should fail checks-lint");
expect(
  missingRun.stderr.includes("ac.calculator.addition") && missingRun.stderr.includes("ac.calculator.clear-resets"),
  "implemented missing coverage failure should name the uncovered criteria",
);

const implementedCovered = fixture("implemented", true);
const coveredRun = runChecksLint(implementedCovered);
expect(
  coveredRun.status === 0,
  `implemented criteria with manifest coverage should pass checks-lint, got ${coveredRun.status}\n${coveredRun.stderr}${coveredRun.stdout}`,
);

for (const dir of [approvedPending, implementedMissing, implementedCovered]) {
  fs.rmSync(dir, { recursive: true, force: true });
}

if (errors.length) {
  console.error(`lifecycle-lint failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("lifecycle-lint passed.");
