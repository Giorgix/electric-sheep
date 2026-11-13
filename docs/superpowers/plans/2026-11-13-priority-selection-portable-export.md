# Priority Selection and Portable Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the reviewed self-exercise patches and tests as documented, opt-in Electric Sheep 0.4.0 features.

**Architecture:** Replay the three verified incremental patches, preserving pure follow-up selection, owned publication checks and a separate portable archive/verifier. Reuse report rendering/evidence enumeration rather than cloning the report pipeline. Keep the canonical exercise/closing workflow unchanged; export is an explicit CLI operation.

**Tech Stack:** Node.js 22+ standard library, Git, node:test, existing pinned development-only Prettier 3.6.2; zero production dependencies.

**Spec:** `docs/superpowers/specs/2026-11-13-priority-selection-portable-export-design.md`.

## Global Constraints

- Node.js 22+, Git, zero production npm dependencies.
- Run/plan schema 1; existing runs remain readable without migration or relocating data.
- Default run root `~/.electric-sheep/runs`; explicit `--runs-root` remains supported.
- Three cumulative challenges; at most one repair per challenge; five-minute default command timeout.
- Preserve canonical `evolution-stress-test` skill and `electric-sheep` package/CLI identities.
- Release 0.4.0 across package/lock root versions, Claude plugin/catalog and Codex compatibility manifest.
- No automatic source stash/reset/commit, merge-back, telemetry, model backend, numerical quality scores, uploads or dependency installation. This forbids manipulating unrelated user changes to satisfy prerequisites; approved feature commits remain allowed.
- No local dependency installation without separate approval; reuse existing pinned development Prettier 3.6.2. Remote CI retains the repository's existing `npm ci --ignore-scripts` workflow and pinned development dependency.
- Feature branches and PRs against `main`; no direct pushes to `main` or merge without user approval.
- Preserve the original checkout's untracked documents, installed runner, and retained exercise evidence.
- A worktree is not a security sandbox; inherited host access, escaped processes and concurrent external edits remain relevant.

## Review Focus

1. Filtered fallback/no-findings reports preserve classification and stored data and do not invent defects: Task 1 compatibility tests.
2. Selected exports are not redaction: full findings and all referenced evidence remain coherent after relocation and loss of original fixture run: Task 2 acceptance, Task 3 docs/copied-runtime test.
3. A portable archive must not become an owned run or weaken cleanup ownership checks: Task 2 archive-as-run refusal and existing ownership tests.
4. Canonical paths, Windows case, Unicode/spaces and parent aliases obey the explicit destination policy on supported OSes: Task 2 fixture tests, Task 3 copied-runtime canonical destination and Task 4 actual CI.
5. Wrong identities, incomplete archives and corrupted source evidence fail without overwriting/re-hashing unrelated data: Task 2 verifier tests and retained acceptance; Task 4 review. Do not claim unexecuted mid-write/resource-limit tests.

## Files and reconstruction

Source worktree: `D:/CODING/electronic-sheeps/.worktrees/evolution-stress-test`, branch `feat/priority-selection-and-portable-export`, based on current main `e451b5110d8878da60a181122db087a5ae455606`. Reuse existing isolation/tooling; do not create another worktree or alter the original main checkout.

Retained run directory (`RUN`): `D:/CODING/electric-sheep-self-test-runs/d9a3b3f6-2d82-475d-a441-7839e0c86ce9`. Reverify `outputs.json` file/evidence hashes before replay. Reconstruct from patches, not unreachable detached commits:
- P1: `RUN/evidence/18bdd417-3101-4a61-8d20-e3a94e55801a.diff` — priority selection.
- P2: `RUN/evidence/a9ea279d-c4c6-4ee6-a124-908e9f906325.diff` — dependency closure.
- P3: `RUN/evidence/2493ce24-54d3-4a53-9b4e-a836e7ba3a52.diff` — portable handoff.

Runtime: modify `src/follow-up.mjs`, `src/report.mjs`, `src/outputs.mjs`, `src/cli.mjs`; add `src/export.mjs`. Replay three `tests/stress-*.test.mjs`; add focused `tests/selection-compatibility.test.mjs` and `tests/export-compatibility.test.mjs`. Extend `tests/packaging.test.mjs` and update `tests/distribution.test.mjs`. Documentation: `README.md`, `docs/usage.md`, `docs/verification.md`, `skills/evolution-stress-test/references/follow-up.md`; release metadata: package/lock and both plugin manifests/catalog. No bundler or canonical SKILL.md workflow change is expected.

### Task 1: Replay selected/dependency-aware follow-up views

**Files:** `src/follow-up.mjs`, `src/report.mjs`, `src/cli.mjs`; new `tests/stress-priority-selection.test.mjs`, `tests/stress-dependency-selection.test.mjs`, `tests/selection-compatibility.test.mjs`.

**Interfaces:** `validatePriorities(values?: string[]) -> string[]|undefined`; `selectFollowUp(followUp, priorities?) -> FollowUp`; `buildReport(run, {priorities} = {})`; `writeReports(run, {followUp, priorities} = {})`. Selected follow-up adds `selection: {priorities, dependencyIds}` and notes; optional CLI `report --priority VALUE` is repeatable. Complete findings/saved actions stay intact.

- [x] **Step 1: Restore tests first.** Use `git apply --check --include=tests/stress-priority-selection.test.mjs P1` then apply that path; restore only the dependency test from P2. Add compatibility cases for runner-template findings filtered by high/untriaged, and no-findings with an explicit selection: assert honest empty/nonempty actions, unchanged stored findings/input and no invented defects.
  New cases: `template selection preserves untriaged provenance and saved data` and `selection without findings does not invent tasks`. Pin the outcomes independently:
  ```js
  assert.equal(report.followUp.source, 'runner-template');
  assert.deepEqual(report.followUp.selection.priorities, ['untriaged']);
  assert.equal(report.followUp.actions[0].priority, 'untriaged');
  assert.equal(saved.followUp, undefined);
  // In the no-findings fixture, or high-only view over an untriaged template:
  assert.deepEqual(report.followUp.actions, []);
  ```
- [x] **Step 2: Observe RED.** Run `node --test tests/stress-priority-selection.test.mjs tests/stress-dependency-selection.test.mjs tests/selection-compatibility.test.mjs`. Missing `--priority` must produce failing positive assertions; do not treat already passing validation cases as new failures.
- [x] **Step 3: Restore source in order.** Check/apply only the three permitted source paths from P1, then `src/follow-up.mjs` from P2. Preserve complete graph validation before projection, dependency explanations and per-invocation semantics. Defer formatting until P3 is replayed so raw hunk context remains intact; do not change behavior to satisfy tests silently.
- [x] **Step 4: Verify GREEN.** Run the three tests above, `npm test`, `npm run check`, and `git diff --check`. Preserve all existing regression tests and schema-1 APIs; new defaults must not require priority input.
- [x] **Step 5: Commit.** Stage only Task 1 files; commit `feat: add dependency-aware priority views for follow-up`.

### Task 2: Replay and pin portable export ownership/integrity boundaries

**Files:** new `src/export.mjs`, `tests/stress-portable-handoff.test.mjs`, `tests/export-compatibility.test.mjs`; modify `src/outputs.mjs`, `src/report.mjs`, `src/cli.mjs`; formatting-only changes to Task 1 files are permitted after replay.

**Interfaces:** `exportReport(run, {out, priorities} = {}) -> {runId, directory, portable:true, verified:true, paths}`; CLI `export --run ID --out DIRECTORY [--priority VALUE ...] [--runs-root ROOT]`; `verifyPortableBundle(directory, expectedRunId?) -> {generationId, paths, evidenceRefs}`; existing `verifyOutputBundle(run)` still requires ownership. Shared `evidenceReferences(run)`, `reportContents(report, context)`, `readEvidence(run, ref)` serve export without modifying source publication.

- [x] **Step 1: Restore acceptance/add boundary tests.** Apply only `tests/stress-portable-handoff.test.mjs` from P3. Add a synthetic archive under `<temporary-export-parent>/<fixture-run-id>` and assert CLI cleanup cannot adopt/delete it without owner metadata. After valid export, assert wrong expected run ID and absent outputs.json fail portable verification; full owned publication still verifies. Never access real/default user roots except existing isolated-home tests.
  Name the cases `portable archive cannot be adopted by cleanup`, `portable verification rejects a different run ID`, and `portable verification rejects a missing publication manifest`. For the archive-as-run case:
  ```js
  assert.notEqual(cleanupAttempt.exitCode, 0);
  assert.equal(await readFile(join(archive, 'outputs.json'), 'utf8'), before);
  await verifyPortableBundle(archive, fixture.run.id);
  ```
- [x] **Step 2: Observe RED.** `node --test tests/stress-portable-handoff.test.mjs tests/export-compatibility.test.mjs`; positive export assertions fail because export is unavailable. Missing-file/direct API checks run only after successful export, not import-time missing-export errors.
- [x] **Step 3: Restore source.** Check/apply P3 source paths only: export/outputs/report/CLI. Preserve exclusive destination creation, physical-parent policy, complete-report evidence, source preverification, relative archive links, no owner marker and truthful partial-directory failure. If review finds an actual defect, add a failing regression before a minimal fix; do not silently address deferred path-policy/memory hypotheses.
- [x] **Step 4: Verify GREEN and format.** Run acceptance/boundary tests, `npm test`, `npm run check`, `npm run format`, `npm run format:check`, and `git diff --check`. Formatting can touch replayed source/tests only. Test relocation, independent SHA verification after fixture cleanup/original-run hiding, tampered/missing evidence, existing/unsafe destinations and Unicode/canonical paths through the 13 retained cases. Record untested fault/resource/platform limits honestly.
- [x] **Step 5: Commit.** Commit scoped files as `feat: add verified portable follow-up archives`.

### Task 3: Ship complete 0.4.0 bundles and usage documentation

**Files:** `tests/packaging.test.mjs`, `tests/distribution.test.mjs`, `package.json`, `package-lock.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, `README.md`, `docs/usage.md`, `skills/evolution-stress-test/references/follow-up.md`.

**Interfaces:** preserve complete Claude/Codex layouts and copied skill launcher. Metadata is exactly 0.4.0; run/plan schema stays 1. Optional priority/export inputs do not change the canonical exercise/consent workflow.

- [x] **Step 1: Add executable distribution coverage.** Set release expectations to 0.4.0. Extend the existing independently copied Codex skill test: after deleting its original bundle, use its own launcher to report with `--priority untriaged`, export into a fresh directory under `await realpath(root)`, confirm selected task/full findings and evidence, clean only the fixture run using its returned descriptor, and verify the moved archive using the copied runtime's portable verifier. Assert source run IDs/roots explicitly; unrelated spaced/Unicode cwd remains in use.
  Assert `metadata.version === '0.4.0'`; the copied runtime's JSON report has `followUp.selection.priorities` equal to `['untriaged']`, one `validate-boundary` action, complete finding IDs, and archive manifest `schemaVersion === 1` / `runId === fixture.run.id`.
- [x] **Step 2: Observe release RED.** `node --test tests/distribution.test.mjs tests/packaging.test.mjs`; metadata expectations must fail before bumping versions. Copied-runtime integration may already pass because Task 2 ships complete src; do not claim it newly failed if it did not.
- [x] **Step 3: Align metadata and document usage.** Change all package/lock/plugin/catalog root versions to 0.4.0. Document repeatable priority selection, transitive prerequisites, empty/default/fallback behavior, full-findings/not-redaction semantics, actual export command/receipt, relative verification after relocation, no owned-run status for archives, sensitive evidence review, existing physical parent/absent destination, symlink policy, memory buffering and partial-output recovery. Read the writing-skills guidance before editing the skill reference; no fresh-model compliance claim or canonical workflow redesign.
- [x] **Step 4: Verify GREEN.** Run distribution/packaging tests, `npm test`, `npm run check`, `npm run format:check`, `npm pack --dry-run`, and separate strict Claude catalog/plugin validation. Check package includes src/export.mjs and updated reference; preserve zero production dependencies. No local install or auxiliary model evaluation; the subsequently user-authorized branch review is recorded in Task 4.
- [x] **Step 5: Commit.** Commit `feat: release priority views and portable export as 0.4.0`.

### Task 4: Review and deliver without merging

**Files:** `docs/verification.md`, plan task status; regression files only for reproduced review/CI failures.

**Interfaces:** no new runtime contract; existing CI matrix remains Ubuntu/Windows/macOS × Node 22/24.

- [x] **Step 1: Review complete branch.** Compare against the spec and all five Review Focus conditions, inspect owned-vs-portable validation, source nonmutation, complete archive references and partial-publication claims. Use requesting-code-review guidance; perform author self-review plus the subsequently user-authorized fresh, read-only Claude Code Sonnet 5.5 review. Record exact model/HEAD and rule on declined/unverified areas explicitly.
- [x] **Step 2: Resolve reproduced failures.** For any Important/Critical review issue, demonstrate RED before a minimal fix, rerun affected and full tests, and commit separately. Do not add speculative streaming or relax destination policy to make CI pass; canonicalize test destinations in accordance with the approved interface.
- [x] **Step 3: Final local verification and evidence.** Run full tests, check, format:check, package dry run, strict catalog/plugin validation and diff --check. Update docs/verification.md only with executed evidence and known limitations. Verify original checkout/untracked docs, installed runner and retained run evidence were not changed; preserve feature worktree.
- [ ] **Step 4: Publish feature PR.** Push only `feat/priority-selection-and-portable-export`, open a PR against main and inspect actual current-head six-combination CI. Fix reproduced CI errors through regressions as above, not force pushes. Report actual checks/limits; do not infer host instruction-following or GitHub install transport from packaging.
- [ ] **Step 5: Close delivery.** Record PR/check evidence and current HEAD, confirm clean synchronized feature branch, and leave PR unmerged/worktree retained for feedback. Do not remove the original development checkout or purge exercise data.

## Plan self-review and execution handoff

Spec coverage: Task 1 owns selected/compatible views; Task 2 owns coherent archives, source ownership and replay evidence; Task 3 owns deliverable distribution, docs and release identity; Task 4 owns whole-branch review, actual platform evidence and safe delivery. Interfaces match retained patches; raw replay precedes formatting to avoid artificial context conflicts. Five Review Focus cases have named test/verification owners. No speculative operating-envelope or cross-host assertion is required.

The short design/adoption scope is approved. This plan introduces no new product behavior beyond it; boundary tests and documentation clarify existing tested policy. This Pi session has no native subagent tool; execution is inline. The user's subsequent instruction explicitly authorized Claude Code review with Sonnet 5.5. Its availability was verified as `claude-sonnet-5-5`; whole-branch fresh-context, read-only review complements author checks without claiming human/security assurance.

- [x] User reviewed the written plan and confirmed continuous native execution through a merge-ready PR, adding Claude Code Sonnet 5.5 review; no merge authorized.

### Task 4 review integration notes

All three retained patches were replayed before formatting, preserving their 25 acceptance cases. A complete copied-runtime test and six compatibility cases added production boundaries. External review reproduced a `..archive` destination containment bypass; shared containment now distinguishes parent segments from legitimate `..name` filenames. Author triage regraded report/manifest inconsistency and false no-findings notes as Important and reproduced them RED-to-GREEN. A small `src/evidence.mjs` extraction avoids circular imports/duplicate enumeration while preserving the report helper export. These are reproduced correctness fixes, not speculative memory/alias policy changes. Nonblocking diagnostics/test-polish suggestions and unmeasured envelopes are recorded in `docs/verification.md`. Actual final review and CI status are recorded in the feature PR; do not infer them from historical baseline evidence.
