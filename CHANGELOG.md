# Changelog

## 1.3.2 - 2026-06-16

- Fixed the compile lifecycle guard so approved proposals can remain pending compile without failing Stop hooks.
- `checks-lint` now requires manifest coverage for implemented proposals and active criteria outside pending approved proposals, while still reporting approved criteria that need compile coverage.
- Updated `apply-wiki-change`, `compile-change`, AGENTS.md, and install/loop docs to make the approved -> compile -> implemented lifecycle explicit.
- Added `scripts/lifecycle-lint.mjs` to regression-test approved pending compile, implemented missing coverage, and implemented covered states.

## 1.3.1 - 2026-06-16

- Replaced brittle missing-template handling with repair-first recovery. Agents should run `node scripts/repair-contracts.mjs --write`, revalidate contracts, and continue if repair succeeds.
- Added `scripts/repair-contracts.mjs` and installer-provided `npm run pw:repair` to restore missing managed templates, skills, and scripts without touching application code, tests, wiki product units, proposals, or product check manifests.
- Updated skills, AGENTS.md, README, install docs, and pressure tests to stop only when the canonical contract cannot be restored.

## 1.3.0 - 2026-06-16

- Hardened Product Wiki skills against the thin-proposal failure mode: `propose-change` now requires the canonical proposal template, one-question-at-a-time clarification, product-unit coverage, alternatives for meaningful changes, and self-review before approval.
- Made templates first-class contracts. Skills now stop when required templates are missing instead of inferring artifact shapes from schemas, lints, examples, or memory.
- Expanded proposal, import proposal, wiki unit, and compiler plan templates to cover all product wiki units, risk, architecture/design impact, checks, and self-review.
- Added `scripts/template-lint.mjs` and `scripts/skill-lint.mjs`, and wired both into `node scripts/product-wiki-check.mjs` and `npm run check`.
- Strengthened proposal linting so real proposals must include the core review sections and every product wiki unit family.
- Added skill pressure scenarios for missing templates, simple products, high-risk travel changes, brownfield retrofits, and compiler discipline.
- Updated comparison and skill architecture docs to reflect the patterns adopted from Spec Kit, Superpowers, BMAD, and Kiro without copying their surface structure.

## 1.2.0 - 2026-06-16

- Made retrofit a complete, end-to-end import instead of a one-capability sample. import-codebase now inventories the WHOLE codebase into intake/import-inventory.md first, then imports every capability until coverage is complete, with resume-across-sessions support for large repos.
- Added scripts/import-coverage.mjs (and npm run import:coverage / pw:import-coverage) to report retrofit completeness (imported vs pending capabilities, plus a heuristic scan for unmapped top-level source modules); --strict fails when a retrofit is incomplete.
- Updated the brownfield rubric, AGENTS.md routing, and added templates/import-inventory-template.md so thorough retrofit is explicit for every installer.

## 1.1.1 - 2026-06-16

- Fixed the markdown section parser in proposal-traceability-lint and eval-golden: the previous `\z` anchor is a literal "z" in JavaScript regex, so the last `##` section in a file only parsed when its text contained the letter "z". Replaced with a true end-of-input lookahead.

## 1.1.0 - 2026-06-16

- Enforced the approval gate deterministically with `scripts/intent-lint.mjs`: an acceptance criterion can only be `active` if an approved or implemented proposal introduces it, and every executable check must cover at least one acceptance criterion.
- Added an opt-in hard block to the pre-tool-use guard (`PRODUCT_WIKI_ENFORCE=block`) that refuses wiki edits without an approved proposal; advisory remains the default.
- Fixed `scripts/doctor.mjs` local-path detection: now generic (current and cross-machine home paths) instead of hardcoded to one author's username/folder, and it only scans committable (tracked or non-ignored) files.
- Added `scripts/wiki-link-lint.mjs` to catch broken typed `[[unit.id]]` links, and gave the `wiki-health` and `architecture-drift` routines real deterministic commands instead of agent-only no-ops.
- `scripts/sync-managed.mjs` now merges collision-free `pw:*` npm scripts into an existing target `package.json` so installed repos get `npm run pw:check` and friends.
- Clearer `checks-lint` guidance when a covered id does not resolve.

## 1.0.0 - 2026-06-16

- Added version metadata and managed-file ownership rules.
- Added explicit install/update support through `scripts/sync-managed.mjs`.
- Added `scripts/doctor.mjs` to detect broken installs, local path leaks, missing files, and invalid manifests.
- Added `scripts/product-wiki-check.mjs` so existing repos can validate Product Wiki without changing their package scripts.
- Added public install, upgrade, lifecycle, and comparison docs.
- Deepened Product Wiki skills with production-grade references, templates, and review rubrics.
- Added golden eval scaffolding for the weekend flight-change flow.
- Added Codex plugin metadata and plugin linting for distribution readiness.
- Added native Codex and Claude Code Stop-hook loops, a routine manifest, and local loop reports.
