# Comparison

Product Wiki sits in the same broad family as Spec Kit, BMAD, Kiro, and Tessl.

## What it borrows

- From Spec Kit: phased movement from request to spec to plan to tasks, plus explicit upgrade safety.
- From Superpowers: one-question-at-a-time discovery, alternatives before implementation, self-review, pressure testing skills, TDD discipline, and verification before completion.
- From BMAD: richer elicitation, brownfield awareness, project context, and adversarial review.
- From Kiro: steering files, hooks, and the idea that agent behaviour should be shaped by durable project instructions.
- From Tessl: skills need lifecycle, versioning, evaluation, and distribution discipline.
- From Claude Code and Codex: skills as the normal workflow primitive, hooks/scripts for deterministic checks, and subagents as optional reviewers rather than mandatory ceremony.

## What is different

Product Wiki is not trying to be the largest workflow library.
It is trying to make product intent durable, inspectable, and useful to a coding agent over time.

The center is the product wiki:

- Small natural-language units.
- Stable IDs.
- Explicit links.
- Product-to-code traceability.
- A non-technical reviewer path.
- Brownfield import where code is evidence, not truth.

## Maturity

Product Wiki is a production-ready harness with a deliberately narrow claim.
It persists product intent, routes non-trivial requests through proposals, keeps a traceable wiki, and requires executable checks once approved criteria become implemented behaviour.

Future releases should be driven by real repo use: where import, proposal, compile, and reconciliation workflows fail under pressure.

## Deliberate choices

- Skills first, because normal product requests should route naturally.
- Three reviewer agents, because more agents would add ceremony before the repo has earned it.
- Templates as contracts with repair-first recovery, because agents should not reverse-engineer artifact shapes from schemas but the harness should not collapse over a missing managed file.
- One-question-at-a-time clarification for meaningful uncertainty, because stacked questions hide product decisions.
- Check-first compilation for behaviour changes, because practical determinism only matters when checks run against code.
- Explicit upgrades, because silently changing hooks and agent rules in installed repos is unsafe.
- Source-only plugin metadata, because the Codex plugin is for distributing Product Wiki itself, not for every app repo that installs the harness.
- Starter check manifests for installed repos, because application repos should not inherit source-repo examples they do not contain.
