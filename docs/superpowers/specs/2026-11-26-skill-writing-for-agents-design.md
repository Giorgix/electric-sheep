# Electric Sheep skill clarity design

## Intent and approval

Apply `writing-for-agents` to the existing `evolution-stress-test` skill: reduce unnecessary reading and make its workflow more predictable without changing the runner. The user approved this documentation-only design in conversation on 2026-11-26. Implementation, dependency setup, publication, client updates and cleanup are separate gates.

## Approaches

- Cosmetic shortening: cheap, but leaves compound steps and ambiguous completion conditions intact.
- **Focused workflow refactor (approved):** reorganize the existing skill and its references around stages, observable completion criteria and authoritative rule locations.
- Router or multiple skills: adds invocation and maintenance overhead without an independently useful new operation; out of scope.

## Scope and constraints

- Change the source skill documentation, relevant skill/packaging tests and the behavioral-scenario document. Retain the existing file layout and examples.
- Keep `name: evolution-stress-test` and `disable-model-invocation: true`. Write the description as a short human-facing summary, following the explicitly requested `writing-for-agents` guidance for user-invoked skills.
- Keep package/version 0.4.2, schema 1, Node 22+, Git, canonical names, exact MIT notices and zero production dependencies. Preserve pinned development Prettier 3.6.2 and its lockfile resolution/integrity.
- Change no runner code, CLI behavior, contracts, example schemas, installation metadata or installed-client caches. Add no skill or agent dependency.
- Work on `docs/skill-writing-for-agents` in an isolated worktree based on `703257c74053c2ec059e0601de08a39511c272e0`. Preserve the original checkout and other worktrees. A worktree is not a security sandbox.

## Information hierarchy

The main file carries prerequisites, ordered stages, completion gates and safety-critical decisions. It points to the existing references with explicit stage triggers:

- Challenge design: `references/challenges.md` and `references/plan.example.json` before proposal approval.
- Assessment: `references/assessment.md` when interpreting results, including early terminal outcomes.
- Handoff and closing: `references/follow-up.md` when preparing a terminal handoff; the follow-up example is reached there when authoring input.

Keep detailed finding definitions in assessment and literal reporting/export/cleanup procedures in closing. Short main-file gates may name an invariant without repeating its procedure. Aim for a main file of about 500 words or fewer, measured against the current 642-word file; preserve clarity and safety over a word-count target.

## Completion gates

- Scope and proposal: three cumulative realistic requirements, meaningful acceptance checks, concrete commands/timeouts/setup/exclusions and user approval before project code execution. Installation retains its separate explicit-consent gate.
- Baseline: approved meaningful checks pass in the owned worktree; limited coverage is labeled. The original checkout remains untouched.
- Each challenge: before `freeze`, map every promised behavior and distinct branch to an existing named test/check and its approved command. Each matrix row has **requirement/branch, expected result, test file plus test/check name, approved command ID**. Resolve missing coverage before freezing; record any agreed scope revision before proceeding. For a ready/blocked purity contract, ready and blocked effect checks are separate rows. The matrix is an external host-authored artifact, not a new runner-plan schema field or a claim of automatic coverage verification.
- Evaluation: tests precede implementation, frozen earlier checks stay cumulative, at most one repair/re-evaluation per challenge, and runner terminal states stop further challenge work. Explicit amendments retain approval, evidence and spent attempts.
- Terminal handoff: evidence-backed calibrated findings, honest coverage/role limits and a verified authored output package; empty justified actions remain valid.
- Cleanup decision: default keep; removal requires explicit consent and the exact returned descriptor, followed by verified receipt. Experimental changes are not applied, merged or published automatically.

## Validation and non-goals

Existing automated tests verify metadata/assets, actual runner examples and generated host bundles. Update the metadata assertion that currently requires a model-facing `Use when` prefix; keep validation of the explicit-use identity and nonempty description. Verify changed reference assets survive both generated host bundles and an independently copied Codex skill after its parent bundle is deleted.

Avoid keyword tests of prose, arbitrary length assertions or simulated agent responses. Add observable behavioral scenarios before editing the skill, then retain their execution status honestly. The Document X-Ray ready-path omission motivates the coverage gate but is historical single-agent evidence, not a new controlled baseline.

No fresh-agent tool is available and no additional model/provider calls are authorized. This design does not establish behavioral RED/GREEN. Execution approval must explicitly permit a documentation-preview refactor with fresh-agent pressure testing deferred; otherwise stop after planning. Preserve the skill's unverified behavioral-validation disclosure. No claim of improved reliability, cost or token consumption follows from shorter prose or passing compatibility tests.

No Amanda pilot, external project test, release/version bump, push, PR, merge, installation update or worktree removal is part of this change.
