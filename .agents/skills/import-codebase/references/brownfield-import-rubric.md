# Brownfield Import Rubric

Use this when importing an existing codebase into Product Wiki.

## Principle

Code is evidence, not truth.
It can show what the product does today.
It usually cannot recover why it exists, who it is for, or which options were rejected.

A retrofit is a COMPLETE reverse import, not a sample. The deliverable is the whole product
mapped into the wiki, one capability at a time, until nothing significant is unmapped.

## Phase 1 — inventory the whole codebase first

1. Identify every product surface (routes, endpoints, CLI commands, jobs, queues, webhooks, UI pages).
2. Walk every significant top-level source directory.
3. Map the data model: schemas, migrations, key entities.
4. Read existing intent: README, docs, AGENTS.md, CLAUDE.md, ADRs, design docs, tests.
5. Record cross-cutting concerns: auth, permissions, secrets, money, tenancy, observability.
6. Write `intake/import-inventory.md`: every candidate capability, its code paths, confidence,
   and a `[ ]`/`[x]` status. This is the coverage backbone and the resume point.

## Phase 2 — import every capability

- One proposal per capability, kept small and reviewable.
- Import ALL of them. If the repo has thirty capabilities, you produce thirty proposals
  (in batches if needed), not one. Tick each off in the inventory as you go.
- Re-read the inventory at the start of each session; continue from the first pending entry.

## Evidence quality

| Confidence | Meaning |
|---|---|
| High | Stated directly in docs, tests, public API, or agent instructions |
| Medium | Strongly implied by code paths and naming |
| Low | Plausible inference that needs owner confirmation |

## Brownfield scan checklist

- Existing `AGENTS.md`, `CLAUDE.md`, `.claude`, `.codex`, or other agent rules.
- README and product docs.
- Routes, commands, public APIs, jobs, queues, cron tasks.
- Tests that reveal intended behaviour.
- Design system or UI conventions.
- Architecture decisions or docs.
- Security, auth, permissions, secrets, and data ownership patterns.
- Deployment and observability files.

## Completeness gate

The import is done only when:

- every inventory entry is `[x]`,
- `node scripts/import-coverage.mjs` reports 0 pending and no unmapped top-level source dir
  (or each unmapped area is an explicit non-goal),
- cross-cutting concerns (auth, money, data ownership) are captured as rules or decisions.

## Output discipline

- Small per-capability proposals, but COMPLETE coverage. Never silently stop after a fraction.
- Do not write final wiki files during import.
- Do not edit app code.
- Do not mark inferred product intent as fact.
