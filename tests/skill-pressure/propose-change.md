# Propose Change Pressure Scenarios

Use these scenarios when reviewing or changing `propose-change`, `apply-wiki-change`, or `compile-change`.
They are designed to catch the failure modes normal linting cannot see.

## How to run

Use a fresh agent session in a temporary repo with Product Wiki installed.
Give the agent one scenario at a time.
Record whether it:

- loads the named templates before writing artifacts,
- asks only material questions, one at a time,
- covers every product wiki unit family,
- proposes alternatives for meaningful changes,
- stops for approval before code,
- creates first-class acceptance criteria,
- generates executable checks before or during compilation,
- repairs missing managed contracts before stopping,
- never invents structure from schemas, previous examples, or lint failures.

## Scenario 1: Missing Template Trap

Temporarily rename `templates/wiki-unit-template.md`.
Then approve a proposal and ask the agent to apply it.

Expected behaviour:

- The agent runs `node scripts/repair-contracts.mjs --write`.
- It re-runs `node scripts/template-lint.mjs`.
- If repair succeeds, it continues applying the approved wiki change.
- If repair fails, it stops before writing canonical wiki files and reports the missing contract.
- It does not infer the wiki unit shape from schemas, previous examples, or lint failures.

## Scenario 2: Simple Product, Complete Units

Prompt:

```text
I want to build a simple calculator app.
Work with me on the product wiki proposal before writing code.
```

Expected behaviour:

- The proposal can be short, but it still has actor, job, story, acceptance criteria, capability, rule, outcome, non-goal, assumption, glossary, and decision rows.
- Missing units are marked `none`, `not affected`, or `deferred`; they are not silently omitted.
- The agent asks material questions only, such as decimal support or chained operations.
- The user-facing summary should not make the proposal look thinner than the full artifact.

## Scenario 3: High-Risk Travel Change

Prompt:

```text
Travellers keep calling on weekends because agents are offline.
I want them to change booked flights themselves.
Work with me on the proposal before code.
```

Expected behaviour:

- The agent recognizes this as high risk.
- It asks about eligibility, fare differences, ticketing authority, payment confirmation, support handoff, and airline penalty availability as needed.
- It compares at least two approaches.
- It records security, data, payment, observability, rollback, design-system, and support-handoff impact.
- It does not jump straight to UI or API implementation.

## Scenario 4: Brownfield Retrofit

Prompt inside an existing repo:

```text
Read this repo and draft the first product wiki from what exists.
```

Expected behaviour:

- The agent routes to `import-codebase`, not `propose-change`.
- It inventories the whole codebase before importing one capability.
- It writes proposals, not active wiki files.
- It marks confidence and evidence for every inferred claim.
- It reports import coverage and remaining capabilities.

## Scenario 5: Compiler Discipline

After approving a proposal whose acceptance criteria are pending compile, ask:

```text
Compile the approved proposal into code.
```

Expected behaviour:

- The agent loads `templates/compiler-plan-template.md` for medium or high-risk work.
- It maps each acceptance criterion to an executable check.
- It runs a check before implementation when the behaviour is not already present.
- It updates `checks/manifest.json`.
- It runs `node scripts/checks-lint.mjs --run` and `node scripts/product-wiki-check.mjs`.
- It reconciles new decisions, assumptions, and traceability after implementation.
