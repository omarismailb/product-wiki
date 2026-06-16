---
name: import-codebase
description: Automatically use when retrofitting Product Wiki onto an existing codebase, or when asked to set up / create the first product wiki from an existing repo. Performs a complete, end-to-end reverse import of the whole codebase into the product wiki, one capability at a time, until coverage is complete. Treats output as proposals, not facts.
---

# Import Codebase

Your job is to reverse-compile an EXISTING codebase into a complete product wiki.
This is not a sample or a first-slice. A retrofit is finished only when the whole
product is mapped: every significant surface, module, route, job, and data store is
represented by at least one capability in the wiki, or is explicitly recorded as
out of scope.

Code is evidence, not truth. It shows what the product does today; it usually cannot
recover why it exists or which options were rejected. Mark inference honestly.

## Do not

- Do not edit application code, tests, or config.
- Do not claim inferred intent as fact (mark confidence: high / medium / low).
- Do not stop after one capability. One capability is a unit of work, not the deliverable.
- Do not write final `wiki/` files. Import produces proposals under `intake/proposals/`.

## Phase 1 — Inventory the WHOLE codebase (mandatory, do this first)

Survey the entire repository before importing anything. You are building a complete map,
not reading every line. Cover, at minimum:

- Entry points and product surfaces: web routes, API endpoints, CLI commands, jobs,
  queues, cron tasks, webhooks, UI pages.
- Top-level source layout: every significant directory under the app's source roots
  (e.g. `src/`, `app/`, `lib/`, `services/`, `packages/`, `cmd/`).
- Data model: schemas, migrations, persistent stores, key entities.
- Existing intent: `README`, `docs/`, `AGENTS.md`, `CLAUDE.md`, `PRODUCT.md`, ADRs,
  design-system docs, and tests that reveal intended behaviour.
- Cross-cutting concerns: auth, permissions, secrets, money, multi-tenancy, observability.

Write the result to `intake/import-inventory.md` using
`templates/import-inventory-template.md`. It is a checklist of every candidate capability
with the code paths it covers, a confidence level, and a status box `[ ]` (pending) /
`[x]` (imported). This file is the backbone of the retrofit: it makes coverage explicit
and lets the import resume across sessions.

Run `node scripts/import-coverage.mjs` and show the user the inventory and the count of
capabilities to import. This is the only point where you pause before importing.

## Phase 2 — Import every capability (chunked, complete, resumable)

Work through the inventory until nothing significant is unmapped. For each capability:

1. Read the code paths for that capability closely enough to support claims.
2. Draft a proposal under `intake/proposals/` using `templates/import-proposal-template.md`
   with actors, jobs, stories, acceptance criteria, rules, journeys, capabilities,
   outcomes, non-goals, assumptions, glossary terms, and decisions — each with source
   evidence (file paths) and a confidence level.
3. Tick the capability `[x]` in `intake/import-inventory.md`.
4. Run `node scripts/proposal-lint.mjs` and `node scripts/proposal-traceability-lint.mjs`.

Token and context discipline: import one capability per proposal so each stays reviewable,
and so a large repo can be imported across several sessions. Re-read
`intake/import-inventory.md` at the start of each session and continue from the first
pending entry. Do not re-import completed capabilities.

## Completeness — the retrofit is done only when this holds

- Every entry in `intake/import-inventory.md` is `[x]`.
- `node scripts/import-coverage.mjs` reports 0 pending capabilities and no unmapped
  top-level source directory (or each unmapped area is listed as a deliberate non-goal).
- Every cross-cutting concern (auth, money, data ownership) is captured in a rule or decision.

If the repo is genuinely huge, it is still not acceptable to silently cover a fraction.
State the total, import in batches, and keep the inventory honest so the user can see
exactly how much is mapped and what remains.

## Output (report after each session)

- Inventory path and total capabilities discovered.
- Capabilities imported this session and proposal paths.
- Coverage so far (imported / total) from `import-coverage.mjs`.
- Remaining pending capabilities and any unmapped code areas.
- Gaps where code cannot reveal intent (the why), flagged for the owner.

## Related skills

- `apply-wiki-change`: after the human approves import proposals.
- `reconcile-wiki`: after import, to find drift between the new wiki and the code.
- `propose-change`: for new features once the retrofit baseline exists.
