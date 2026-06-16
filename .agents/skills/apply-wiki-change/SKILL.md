---
name: apply-wiki-change
description: Use when the user has approved a Product Wiki proposal and the wiki needs to be updated before implementation.
---

# Apply Wiki Change

Your job is to apply an approved proposal to the product wiki.
This is the point where the wiki changes before code.

## Preconditions

- Proposal exists under `intake/proposals/`.
- Proposal status is `approved`, or the user explicitly approves it in the current conversation.
- Application code is not edited during this skill.
- `templates/wiki-unit-template.md` exists and can be read.

If the template is missing, do not infer wiki unit structure from schemas, lints, previous examples, or memory.
First run `node scripts/repair-contracts.mjs --write`, then re-run `node scripts/template-lint.mjs`.
Continue if repair succeeds.
Stop only if the canonical contract cannot be restored.

## Workflow

1. Read the approved proposal.
2. Read `templates/wiki-unit-template.md`.
3. Build a unit application table from the proposal:
   - unit ID
   - unit type
   - create / update / link / supersede / none
   - target file
   - source section in the proposal
4. Write or update the smallest possible set of files under `wiki/`, using `templates/wiki-unit-template.md` for new units.
5. Apply acceptance criteria as first-class wiki units under `wiki/acceptance-criteria/`, not only as bullets inside a story.
6. Keep the proposal status as `approved`.
   Do not mark it `implemented` until `compile-change` has added executable checks and code.
7. Preserve existing IDs. Do not rename IDs unless the proposal explicitly says so.
8. For decisions, supersede old decisions instead of deleting or rewriting historical rationale.
9. Update related links in both directions when safe.
10. Update `wiki/index.md` if a new unit family or important entry needs discovery.
11. Append a dated entry to `wiki/log.md`.
12. Re-read the proposal and verify every proposed wiki change is represented or explicitly deferred.
13. Run `node scripts/wiki-lint.mjs`.
14. Run `node scripts/wiki-link-lint.mjs`.
15. Run `node scripts/proposal-lint.mjs`.
16. Run `node scripts/proposal-traceability-lint.mjs`.
17. Stop before implementation.

At this stage, approved acceptance criteria are pending compile.
They do not need manifest coverage yet.
The full `node scripts/product-wiki-check.mjs` gate should pass after `compile-change` has added check coverage, implemented code, and marked the proposal `implemented`.

## Output

Return:

- Files changed.
- New or updated stable IDs.
- Proposal units applied / deferred.
- Any missing links or open decisions.
- Confirmation that wiki and proposal lints passed, or the exact failures.
