# Loops

Product Wiki has loops, but they are not a magic background daemon.

They are a small set of repeatable routines that keep the product wiki, checks, architecture, design-system notes, and code from drifting apart.

## The loop stack

| Layer | What it does | Where it lives |
|---|---|---|
| Native hooks | Run lightweight turn-end loop checks inside Codex and Claude Code | `.codex/config.toml`, `.claude/settings.json`, `scripts/hook-loop.mjs` |
| Deterministic checks | Fast checks that can pass or fail without judgement | `scripts/`, `checks/manifest.json` |
| Routine runner | Runs named maintenance routines and writes local reports | `routines/manifest.json`, `scripts/routine-runner.mjs` |
| Agent reconciliation | Reads routine output, changed files, and wiki units, then fixes safe links or raises proposals | `.agents/skills/reconcile-wiki/` |
| Optional automation | Runs routine checks on a schedule or in CI | `.github/workflows/product-wiki-routines.yml` |

Routine reports are written under `.product-wiki/routine-runs/`.
Hook loop reports are written under `.product-wiki/hook-loops/`.
That folder is ignored by git.

## Native Codex and Claude Code loop

Product Wiki wires into both agents through their native hook systems:

- Codex: `.codex/config.toml` runs `scripts/hook-loop.mjs` on `Stop`.
- Claude Code: `.claude/settings.json` runs `scripts/hook-loop.mjs` on `Stop`.

The hook is intentionally lightweight.
It looks at changed files, chooses the relevant deterministic routines, writes a local report, and prints follow-up guidance for the agent.

It does not silently edit product intent.
It does not run expensive checks on every turn unless the changed files justify it.

## How a loop runs

After implementation, before a larger feature, or on a schedule:

```bash
node scripts/routine-runner.mjs --all
```

For one routine:

```bash
node scripts/routine-runner.mjs --routine routine.traceability-drift
```

To inspect available routines:

```bash
node scripts/routine-runner.mjs --list
```

To run the same lightweight loop the hooks call:

```bash
node scripts/hook-loop.mjs --event manual
```

## What is automatic

The deterministic part is automatic:

- turn-end hook checks in Codex and Claude Code
- wiki structure linting
- broken wiki-link detection
- proposal linting
- acceptance-criteria-to-check coverage
- approval-gate enforcement (active criteria trace to an approved proposal)
- check manifest execution
- routine manifest validation

Two routines are now deterministic that previously only prompted an agent: `wiki-health` runs the link check, and `architecture-drift` runs `intent-lint`. `design-drift` remains an agent-review routine because comparing UI against design intent needs judgement, not a script.

These commands run through native hooks, `node scripts/product-wiki-check.mjs`, and CI.

## What still needs an agent or human

Some drift cannot be fixed safely by a script.

Examples:

- a feature duplicates an existing capability
- an architecture decision no longer matches the code
- a design-system rule is contradicted by a new UI
- an assumption has become stale
- a missing check requires product judgement

For those, run the `reconcile-wiki` skill.
It should auto-fix objective links when safe and raise proposals for anything that changes product intent.

That split is deliberate best practice:

- hooks and scripts handle deterministic work
- skills handle workflow and judgement
- reviewer subagents handle fresh-context review when needed
- CI or Codex automations handle scheduled maintenance

## Recommended cadence

- After implementation: `routine.traceability-drift` and `routine.verification`.
- Weekly or before a large feature: `routine.wiki-health`.
- After several features: `routine.architecture-drift`.
- After UI-heavy changes: `routine.design-drift`.

## Important boundary

Product Wiki should only claim determinism where a command runs and can fail.

The loops make drift visible.
They do not silently rewrite product intent.
