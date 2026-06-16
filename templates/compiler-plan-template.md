# Compiler Plan

Proposal:
Date:
Blast radius: low / medium / high

## Product decision

What the approved wiki change says the product must do.

## Wiki units being compiled

| Unit | ID | Role in this change |
|---|---|---|
| Actor | `actor.example` |  |
| Job | `job.example` |  |
| Story | `story.example` |  |
| Capability | `capability.example` |  |
| Rule | `rule.example` |  |
| Acceptance criterion | `ac.example.behaviour` |  |
| Decision | `decision.example` |  |

## Blast radius

| Area | Files or wiki IDs | Risk |
|---|---|---:|
| Wiki units |  | low/medium/high |
| Code paths |  | low/medium/high |
| Tests/checks |  | low/medium/high |
| Data |  | low/medium/high |
| Security/privacy |  | low/medium/high |
| Design system |  | low/medium/high |

## Reuse or refactor

Existing capability to reuse:

Refactor needed before feature code:

Reason:

## Checks first

| Acceptance criterion | Check | Command |
|---|---|---|
| `ac.example.behaviour` | unit/integration/e2e/manual | `npm test ...` |

Expected first failure, when the behaviour is not implemented yet:

- `ac.example.behaviour`:

## Architecture and implementation decision

- Module that owns the behaviour:
- Public interface or contract:
- Data ownership:
- Trust boundary:
- Migration or backward compatibility:
- Observability:
- Rollback:
- Rejected approach:

## Implementation steps

1. Add or update one check for the first acceptance criterion.
2. Run checks and confirm they fail for the expected reason where applicable.
3. Make the smallest coherent code change.
4. Run the targeted check and confirm it passes.
5. Repeat for the remaining acceptance criteria.
6. Run product checks and normal repo checks.
7. Reconcile wiki links, check manifest, and decision notes.

## Verification evidence

- Commands run.
- Results.
- Remaining risk.

## Completion checklist

- [ ] Every acceptance criterion in this implemented change has a manifest entry.
- [ ] Every manifest command runs successfully or has explicit manual evidence.
- [ ] The implementation uses or extends the named capability.
- [ ] New decisions, assumptions, or risks discovered during implementation are recorded.
- [ ] `node scripts/product-wiki-check.mjs` passes.
