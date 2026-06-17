# Product Wiki

Product Wiki is an open-source harness for building software with coding agents.
It is especially useful for non-technical builders who want to build complex products without the codebase turning messy.

Coding agents are becoming very good at turning natural language into production-grade code.
The problem is that they mostly reason from the current codebase and the current chat thread.
Code records how a product was built.
It does not reliably record why it was built, what it is meant to do, or which trade-offs were rejected.

The missing layer is a product wiki: a natural-language abstraction layer above the codebase.
A request, such as a new feature, bug report, or workflow change, becomes a small change to the wiki.
The wiki says what the product should do, who it affects, what must stay true, and how to know it works.
The compiler turns that wiki change into design decisions, checks, and the smallest safe code change.

## What this does

Product Wiki sits between the chat box and the codebase.
You still speak to the coding agent normally: "add this feature", "fix this bug", or "change this workflow".

Instead of going straight to code, the harness runs a chain of skills:

1. `propose-change` clarifies the request, asks material questions one at a time, and drafts a proposed wiki change from the canonical template.
2. `apply-wiki-change` updates the product wiki after human approval.
3. `compile-change` turns that approved wiki change into design decisions, executable checks, an implementation plan, code, and verification evidence.
4. `wiki-anchor-lint` validates `PW:` anchors that link important code paths back to wiki IDs.
5. `routine-runner` runs deterministic loops that can pass or fail.
6. `ratchet-lint` checks that approval coverage, check coverage, and wiki anchors have not slipped backwards.
7. `reconcile-wiki` handles the judgement loop: fixing safe links and raising proposals when the wiki, checks, architecture, design system, and code drift.

The core units are actors, jobs, stories, acceptance criteria, rules, journeys, capabilities, and decisions.
As the product grows, the wiki also tracks outcomes, non-goals, assumptions, risks, and glossary terms.

## The point

The aim is practical determinism.
It does not make the model deterministic.
It pins down the behaviour a change must produce, so there is less room for the agent to invent the architecture while it writes the code.

The important part is that the checks run against the code.
Otherwise the wiki becomes another stale document with more confidence around it.

## Wiki anchors

The code can carry small wiki anchors so agents can jump from product intent to implementation:

```ts
// PW:capability.self-serve-flight-change
// PW:rule.fare-difference-confirmation
```

When an agent searches the codebase, it should check `PW:` anchors first, then fall back to normal code search.
Anchors should appear at useful boundaries such as routes, services, workflows, domain modules, and tests.
They are signposts for agents, not comments on every line.
`node scripts/wiki-anchor-lint.mjs --write-report` turns those signposts into a local source map for the next agent pass.

## Quick install (one command)

From the root of the repo you want Product Wiki in:

```bash
npx github:omarismailb/product-wiki#v1.5.1 init
```

That installs the managed harness, activates routing in `AGENTS.md` / `CLAUDE.md` without
touching your local rules, adds `pw:*` scripts, and runs the checks — no global install.
Pin to a release tag (`#v1.5.1`) for a reproducible install. Use `sync` instead of `init`
to upgrade later, and `--dry-run` to preview. The agent-led and manual paths below still work.

## Install in a new repo

The easiest path is to ask Codex or Claude Code to start from Product Wiki.

Open a fresh folder and paste:

```text
Start a new product from https://github.com/omarismailb/product-wiki.

Set up the repo, run the harness checks, and then work with me on the first product wiki proposal before writing application code.
```

The agent can run the setup underneath:

```bash
git clone https://github.com/omarismailb/product-wiki.git my-product
cd my-product
node scripts/product-wiki-check.mjs
node scripts/doctor.mjs
```

Then start with a product request:

```text
I want to build [feature].
Ask me questions until the product wiki change is clear.
Do not write code until I approve the wiki proposal.
```

You should not need to name a skill for normal use.
Codex and Claude Code can choose relevant skills from the task description.
Use `$propose-change` in Codex or `/propose-change` in Claude Code only when you want to force the route explicitly.

## Install in an existing repo

For full install notes, see `docs/install.md`.

The recommended path is agent-led.
Open the target repo in Codex or Claude Code and paste:

```text
Install Product Wiki into this repo from https://github.com/omarismailb/product-wiki.

Inspect the current repo first.
Preserve any existing AGENTS.md, CLAUDE.md, .claude, .codex, scripts, tests, and CI.
Activate Product Wiki routing without overwriting local project rules.
Set it up so normal product requests go through the product wiki before code.
Run the harness checks and the repo's normal checks.
Show me the files changed and any conflicts or judgement calls.
```

The agent can run the managed installer underneath:

```bash
tmp="$(mktemp -d)"
git clone --depth=1 https://github.com/omarismailb/product-wiki.git "$tmp/product-wiki"
node "$tmp/product-wiki/scripts/sync-managed.mjs" --target . --write
node scripts/product-wiki-check.mjs
node scripts/doctor.mjs
```

This is not a manual copy-paste install.
The sync helper separates managed harness files from product-owned files.
When `AGENTS.md` or `CLAUDE.md` already exists, it adds a managed routing block to the active file and stages the full upstream version under `.product-wiki/incoming/` for review.

For a mature codebase, start with the reverse import:

```text
Read this repo and draft a first product wiki from what the code, docs, tests, and existing agent instructions reveal.
Treat the output as proposals, not facts.
Chunk the import by capability so I can review it.
Create an import inventory with batches and a resume point before importing capabilities.
Do not edit application code.
```

## Use with Codex

Codex reads `AGENTS.md` and discovers repo skills from `.agents/skills`.
Codex can choose skills implicitly when the task matches the skill description.
Mention a skill directly only when you want to force the route.

Good first prompts can be natural:

```text
Draft the first product wiki for this repo. Use small proposals and mark confidence.
```

```text
Users need to change booked flights when support is offline. Work with me on the proposal before code.
```

```text
Compile the approved proposal in intake/proposals/[file].md into code and executable checks.
```

Use subagents only when the work benefits from separate context.
The included Codex custom agents are reviewers, not mandatory workers.

## Update policy

Product Wiki does not silently update installed repos.

That is deliberate.
Skills, hooks, and agent instructions can change how code gets written, so updates should be explicit, versioned, and reviewable.

Use the upgrade prompt in `docs/upgrade.md` or run `scripts/sync-managed.mjs` from a fresh clone of Product Wiki.
The script updates managed harness files, preserves product-owned wiki/proposal/check files, and refreshes the managed routing block in active agent instructions.

For Codex distribution, the source repo also includes `.codex-plugin/plugin.json`.
See `docs/distribution.md`.

## Loops

Loops run through native Claude Code and Codex hooks plus the routine runner.

At the end of a turn, `.claude/settings.json` and `.codex/config.toml` call:

```bash
node scripts/hook-loop.mjs --event stop
```

That script looks at changed files, runs the relevant deterministic routines, writes a local report, and tells the agent when `reconcile-wiki` is needed.

Run all deterministic routines:

```bash
node scripts/routine-runner.mjs --all
```

Write or refresh the local wiki-to-code source map:

```bash
node scripts/wiki-anchor-lint.mjs --write-report
```

Run the ratchet check:

```bash
node scripts/ratchet-lint.mjs
```

List routines:

```bash
node scripts/routine-runner.mjs --list
```

The runner writes local reports to `.product-wiki/routine-runs/`.
The native hook writes local reports to `.product-wiki/hook-loops/`.
Those reports are intentionally ignored by git.

The agent loop is `reconcile-wiki`.
It reads routine output and changed files, fixes objective links where safe, and raises proposals when a drift issue needs human judgement.

See `docs/loops.md`.

## Use with Claude Code

Claude Code reads `CLAUDE.md` and discovers skills from `.claude/skills`.
The `.claude/skills` entries in this repo mirror the `.agents/skills` entries so Claude and Codex share the same workflows.
They are symlinks in this scaffold; if your copy method does not preserve symlinks, copy the skill directories instead.

Good first prompts:

```text
Draft the first product wiki for this repo. Use small proposals and mark confidence.
```

```text
Users need to change booked flights when support is offline. Work with me on the proposal before code.
```

When a change is risky, explicitly ask for a reviewer:

```text
After the implementation plan is drafted, use the architecture-reviewer subagent to check reuse, boundaries, and refactor pressure.
```

## Directory map

```text
product-wiki/
  AGENTS.md                     portable agent contract
  CLAUDE.md                     Claude Code entrypoint
  CONSTITUTION.md               principles, not enforcement
  .codex-plugin/plugin.json     Codex plugin metadata
  .agents/skills/               Codex skills
  .claude/skills/               Claude Code skills
  .claude/agents/               Claude reviewer subagents
  .codex/agents/                Codex reviewer subagents
  checks/                        check manifests and verification notes
  hooks/                        deterministic guardrails
  intake/                       raw requests and proposals
  routines/                     recurring maintenance loops
  schemas/                      file contracts
  scripts/                      lint, eval, doctor, and sync helpers
  wiki/                         product wiki
  .product-wiki/                local reports, source maps, and incoming updates
  evals/golden/                 regression cases
  examples/                     greenfield and retrofit examples
```

## What to review before code

Every non-trivial change should answer:

- Which job does this serve?
- Which story changes?
- Which capability should be reused?
- What outcome would prove it mattered?
- What is deliberately out of scope?
- What must remain true?
- Which checks will run against the code?
- Does this fit the current architecture, or does it need a refactor first?

Templates are part of the contract.
If a required template is missing, the agent should run `node scripts/repair-contracts.mjs --write`, validate the contract, and continue if repair succeeds.
It should stop only if the canonical contract cannot be restored.
It should never invent the shape from schemas or previous examples.

## Release status

This is the first production release of Product Wiki.
It is designed to be copied into real product repos, tested against real changes, and improved through small, reviewable contributions.

Tested locally on 2026-06-16 with Node 20 and the current documented Claude Code and Codex project primitives.

## Contributing

Contributions are welcome while the shape is still settling.
Start with `CONTRIBUTING.md`, keep changes small, and run `npm run check` before opening a pull request.

## License

MIT.
