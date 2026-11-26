---
name: evolution-stress-test
description: Stress-test a feature through three cumulative changes with evidence-backed findings and follow-up.
disable-model-invocation: true
---

# Evolution stress test

Explicit-use local preview. Independent skill behavioral validation remains unverified.

## Prerequisites

Requires Node 22+, Git, and a committed clean project with no untracked files. Preserve source; never stash, commit or reset it to meet prerequisites.

Locate this skill's absolute directory from the host-provided path. Invoke `node "<absolute-skill-directory>/scripts/run.mjs" --help`, resolving runner and reference paths from the skill, not the target cwd. Missing runner: stop and request a complete installation; never download it with `npx`.

## 1. Approve the exercise

Read repository instructions, requirements and existing tests; confirm ambiguous scope. Before proposing challenges, read [challenge guidance](references/challenges.md) and adapt the [example plan](references/plan.example.json).

**Gate:** user approves exactly three cumulative realistic requirements, acceptance checks, concrete executable/argv/cwd commands, timeouts, setup and exclusions before project code executes. Installation needs separate explicit consent. A worktree is **not a security sandbox**: account for inherited credentials, network and scripts. Stop without a safe test environment.

## 2. Establish the baseline

Save the approved plan outside source. Run `inspect`, then `start` with the plan and approval note; retain run ID and worktree path. Run `baseline` there.

**Gate:** meaningful approved checks pass. A failing/missing baseline blocks the exercise. Without meaningful tests, obtain approval for a minimal worktree baseline contract and record `coverage: limited`; an empty green command proves nothing.

## 3. Evolve each round

Inside the owned worktree, write acceptance tests before implementation, preferably in new per-round files; protect existing tests/configuration too. Before each `freeze`, complete the [coverage matrix](references/challenges.md#pre-freeze-coverage).

Run `freeze` to snapshot checks and record the pre-implementation result; then implement and `evaluate`.

**Gate:** all earlier checks remain required; at most one repair/re-evaluation per challenge. Stop challenge work on blocked, failed, invalid or cancelled status. Preserve frozen tests; explicit `amend` retains approval/evidence history and spent attempts.

## 4. Publish every terminal handoff

On completed, failed, blocked, invalid or cancelled status, read [assessment](references/assessment.md) to record evidence-linked findings and limits. Without separate agents, label the exercise single-agent, not independent.

Then follow [handoff and closing](references/follow-up.md) to author proportional actions and publish with `report --follow-up`.

**Gate:** verified output package, truthful outcome/uncertainty, recommended actions and absolute output paths; insufficient findings justify empty actions, not invented tasks. Plain reports are labeled template fallbacks.

## 5. Decide retention

Ask explicitly: **remove the experimental worktree while retaining outputs/evidence, or keep it for inspection?** No answer means keep. Applying, pushing or merging experimental changes needs separate approval.

On removal consent, follow the closing procedure's exact returned descriptor from outside the worktree after known processes stop.

**Gate:** a receipt with `verified: true` and retained paths, or an explicit failure/recovery diagnostic. Never routinely offer evidence deletion.

## Interruption

Use `status`; `resume` only after old processes stop. Stale-lock recovery needs explicit confirmation.

## Interpretation

Size is a signal, not a verdict; passing checks is not production-readiness proof. Hypothetical requirements are experiments, not automatic recommendations. Keep solutions proportional.
