# Import inventory

Complete map of the codebase for a Product Wiki retrofit. One line per candidate
capability. Tick `[x]` once it has an import proposal. The retrofit is done only when
every box is ticked and `node scripts/import-coverage.mjs` reports 0 pending.

Status: pending = `[ ]`, imported = `[x]`.

## Product surfaces discovered

- routes / endpoints: <list>
- CLI / jobs / queues / cron: <list>
- UI pages: <list>

## Capabilities to import

- [ ] capability.<id> — code paths: `src/...`, `src/...` — confidence: high|medium|low
- [ ] capability.<id> — code paths: `...` — confidence: ...
<!-- add one line per capability discovered across the WHOLE codebase -->

## Cross-cutting concerns (capture as rules or decisions)

- [ ] auth / permissions — code paths: `...`
- [ ] money / billing — code paths: `...`
- [ ] data ownership / tenancy — code paths: `...`
- [ ] observability — code paths: `...`

## Deliberately out of scope (non-goals)

- <code area> — reason: <why it is not product intent worth modelling>
