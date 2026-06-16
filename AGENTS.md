# AGENTS.md

This repo is a product-wiki harness for coding agents.
Use it to turn product intent into reviewed wiki changes before implementation.

## Core rule

Do not take a non-trivial product request straight to code.
First create or update a proposal in `intake/proposals/`.
Only compile to code after the proposal is approved by the user.

The user should not need to ask for a skill by name.
When a request looks like a feature idea, bug report, workflow change, product question, or retrofit task, route it into the right Product Wiki skill automatically.
Explicit skill names are only a fallback when routing is unclear.

Small mechanical edits can take a lighter path.
If a change can be described in one sentence and has no product or architecture impact, make the edit and run the relevant checks.

## Product wiki

The product wiki lives in `wiki/`.
Use stable IDs in frontmatter.
Link related units explicitly.

Core units:

- `actor`: role involved in the system.
- `job`: solution-free problem worth solving.
- `story`: one chosen solution slice.
- `acceptance-criterion`: observable done condition.
- `rule`: product logic that applies across stories.
- `journey`: flow or end-to-end path.
- `capability`: reusable product or system function.
- `decision`: ADR-style rationale.

Growth units:

- `outcome`: measurable success signal.
- `non-goal`: explicitly out of scope.
- `assumption`: risk or uncertain belief.
- `glossary`: shared language.

## Skills

Use repo skills from `.agents/skills`.

- `propose-change`: turn a request into a reviewable wiki proposal.
- `apply-wiki-change`: apply an approved proposal to `wiki/`.
- `compile-change`: turn an approved wiki change into code and executable checks.
- `import-codebase`: completely reverse-import an existing repo into the wiki. Inventory the whole codebase first, then import every capability until coverage is complete. Not a single sample.
- `reconcile-wiki`: find drift between wiki, tests, architecture, design, and code.
- `review-architecture`: check reuse, boundaries, dependencies, and refactor pressure.
- `generate-checks`: turn acceptance criteria into executable checks.

## Retrofitting an existing repo

A retrofit is a complete, end-to-end import, not a sample. Use `import-codebase` and:

1. Inventory the WHOLE codebase first into `intake/import-inventory.md` (every surface, module, route, job, data store, and cross-cutting concern).
2. Import every capability, one reviewable proposal at a time, ticking the inventory as you go. Resume from the inventory across sessions for large repos.
3. The retrofit is done only when `node scripts/import-coverage.mjs` reports 0 pending and no unmapped top-level source directory.

Do not stop after one capability. Do not edit application code during import.

## Loops

Recurring loops are defined in `routines/manifest.json`.
Native turn-end loops are wired through `.codex/config.toml` and `.claude/settings.json`.

Run deterministic loops with:

```bash
node scripts/routine-runner.mjs --all
```

Run the same lightweight loop the hooks call with:

```bash
node scripts/hook-loop.mjs --event manual
```

Loop reports are written to `.product-wiki/routine-runs/` and `.product-wiki/hook-loops/`.
They should not be committed.
When a routine finds drift that needs judgement, use `reconcile-wiki` to fix safe links or raise a proposal.

## Subagents

Use subagents only when separate context helps.
Do not spawn one reviewer per step by default.

Good uses:

- Architecture review for cross-module or high-risk changes.
- Verification review after code and checks are produced.
- Consistency review when the wiki and code may have drifted.

## Checks

Before finishing work, run:

```bash
node scripts/product-wiki-check.mjs
```

Also run the product repo's normal tests when this harness is copied into an application repo.

## Hard guardrails

Markdown files guide the agent.
Hooks, scripts, CI, and permissions enforce the hard rules.

The approval gate is enforced two ways:

- Deterministically at check time. `scripts/intent-lint.mjs` fails if an acceptance criterion is `active` without an approved or implemented proposal introducing it, and if any executable check does not cover an acceptance criterion. This runs inside `node scripts/product-wiki-check.mjs` and CI.
- Optionally at edit time. The pre-tool-use guard blocks wiki edits without an approved proposal when `PRODUCT_WIKI_ENFORCE=block` is set. The default is advisory.

Do not treat `CONSTITUTION.md` as enforcement.
It records principles.
The executable guardrails live in `hooks/`, `scripts/`, CI, and the host agent's permission settings.
