---
name: evolution-stress-test
description: Use when the user explicitly requests an evolution stress test of a feature or module, especially concerns about happy-path code, missed edge cases, spaghetti code, or overengineering.
disable-model-invocation: true
---

# Evolution stress test

Make the solution survive the next reasonable changes. This is an explicit-use local preview; independent skill behavioral validation is not yet established.

## Runner and prerequisites

Locate this skill's absolute directory from the host-provided skill path. Invoke `node "<absolute-skill-directory>/scripts/run.mjs" --help`; resolve paths from the skill, never from the target project's cwd. The complete installed bundle includes the runner. If missing, stop and request a complete installation; do not download code with `npx`.

Requires Node 22+, Git, and a committed clean project including no untracked files. Follow repository instructions. Never stash, commit, or reset source to satisfy prerequisites.

## Workflow

1. Read the target's requirements and existing tests. Confirm scope only if ambiguous. Read [challenge guidance](references/challenges.md), [assessment](references/assessment.md), and the [example plan](references/plan.example.json); adapt it to this project.
2. Propose exactly three cumulative, realistic requirements. Show acceptance checks, concrete executable/argv commands, timeouts, setup needs, and exclusions together. Obtain approval before executing project code. A worktree is **not a security sandbox**: inherited credentials, network access, and project scripts remain relevant. Stop if a safe test environment is unavailable. Dependency installation needs separate explicit consent.
3. Store the approved plan outside source. Run `inspect`, then `start` with its file and an approval note; retain the returned run ID and worktree path. `baseline` runs approved checks. A failing/missing baseline blocks the exercise. With no meaningful tests, propose a minimal baseline contract in the worktree for approval and record `coverage: limited`; an empty green test command proves nothing.
4. Inside that worktree, write each challenge's acceptance tests before implementation, preferably as separate new files. Protect existing tests/config too. Run `freeze`: it snapshots checks and records the pre-implementation result. Then implement the requirement and run `evaluate`; all earlier checks remain required. At most one repair/re-evaluation is allowed. Stop when the runner blocks, fails, invalidates, or cancels a run. Never weaken frozen tests silently; explicit `amend` preserves approval/evidence history and spent attempts.
5. Record findings using [assessment](references/assessment.md), then run `report`. Distinguish baseline defects, experimental defects, evolution friction, concerns, and hypotheses. Without separate agents, label the exercise single-agent, not independent.
6. Offer minimal useful fixes separately. Never apply or merge experimental changes into source automatically. Offer explicit `cleanup --confirm <run-id>`; retained reports may contain secrets.

## Quick reference

`start` → `baseline` → (`freeze` → edits → `evaluate`) × 3 → `finding` → `report` → optional `cleanup`.

Use `status` after interruption; use `resume` only after old processes stop. Recover a stale lock only with explicit confirmation. CLI help and the bundled usage guide describe arguments.

## Common mistakes

File length is a signal, not a verdict. Passing checks is not production-readiness proof. New requirements are experiments, not automatic recommendations. Do not add infrastructure merely to make a challenge impressive.
