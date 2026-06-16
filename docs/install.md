# Install

Product Wiki can start a new product or be retrofitted into an existing repo.

The safest installation path is agent-led.
The agent should inspect the target repo, preserve existing project rules, install the managed harness files, and stop for review when a file needs merging.

## New repo

```bash
git clone https://github.com/omarismailb/product-wiki.git my-product
cd my-product
npm run check
npm run doctor
```

Start normally:

```text
I want to build [feature].
Ask me questions until the product wiki change is clear.
Do not write code until I approve the wiki proposal.
```

## Existing repo

Do not manually copy folders.
Ask the agent to install the harness and review the merge.

Open the target repo in Codex or Claude Code and paste:

```text
Install Product Wiki into this repo from https://github.com/omarismailb/product-wiki.

Inspect the current repo first.
Preserve existing AGENTS.md, CLAUDE.md, .claude, .codex, scripts, tests, CI, and project-specific rules.
Install managed Product Wiki files.
For existing AGENTS.md or CLAUDE.md files, activate Product Wiki by adding the managed routing block without deleting local rules.
For other files that already exist and need merging, put the Product Wiki version in .product-wiki/incoming/ and show me the diff.
Do not overwrite the product wiki, proposals, app code, or app tests.
Run the harness checks and the repo's normal checks.
Explain how to run Product Wiki routines with node scripts/routine-runner.mjs --all.
Report files changed, files skipped, and anything requiring human judgement.
```

The agent can use:

```bash
tmp="$(mktemp -d)"
git clone --depth=1 https://github.com/omarismailb/product-wiki.git "$tmp/product-wiki"
node "$tmp/product-wiki/scripts/sync-managed.mjs" --target . --write
node scripts/product-wiki-check.mjs
node scripts/doctor.mjs
```

Use a fresh clone for each install or upgrade.
That keeps the managed files tied to a clear upstream version.

The installer updates existing `AGENTS.md` and `CLAUDE.md` files with an idempotent managed block between `product-wiki-routing` markers.
That makes normal product requests route through Product Wiki immediately while preserving the repo's existing instructions.

If the target repo has a `package.json`, the installer also adds collision-free `pw:*` scripts (for example `npm run pw:check`, `npm run pw:doctor`, `npm run pw:checks-run`) without touching the repo's own scripts.
You can always call the scripts directly with `node scripts/...`.

## Enforcement

The approval gate is enforced deterministically: `node scripts/product-wiki-check.mjs` runs `intent-lint`, which fails if an acceptance criterion is `active` without an approved or implemented proposal, or if an executable check does not cover a criterion.

For a hard block at edit time, set `PRODUCT_WIKI_ENFORCE=block` in `.claude/settings.json` or `.codex/config.toml`.
In block mode the pre-tool-use guard refuses edits to `wiki/` until an approved proposal exists.
The default is advisory.

## What gets updated

Product Wiki separates managed harness files from user-owned product files.

Managed files can be updated from the upstream repo.
User-owned files should not be overwritten by an update.

See `product-wiki.json` for the current ownership map.

## First use after install

For a new codebase, ask:

```text
I want to build [feature].
Work with me to turn this into a product wiki proposal first.
Do not write code until I approve the proposal.
```

For an existing codebase, ask:

```text
Read this repo and draft the first product wiki from what the code, docs, tests, and agent instructions reveal.
Treat the output as proposals, not facts.
Chunk the import by capability so I can review it.
Do not edit application code.
```
