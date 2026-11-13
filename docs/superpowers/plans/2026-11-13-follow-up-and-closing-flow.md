# Actionable Follow-up and Verified Closing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an evidence-linked next-actions/implementation-plan/agent-prompt package and an explicit, verified keep-or-clean-up session ending.

**Architecture:** The host supplies contextual follow-up through optional structured input; the dependency-free runner validates and persists it, renders five deliverables, and publishes a hash manifest last. A closing orchestrator snapshots final changes and verifies retained output before removing the owned worktree. Keep the existing report entry points and schema-1 runs compatible.

**Tech Stack:** Node.js 22+ standard library, Git, `node:test`, pinned development-only Prettier 3.6.2; no production dependencies.

**Spec:** `docs/superpowers/specs/2026-11-13-follow-up-and-closing-flow-design.md`.

## Global Constraints

- Node.js 22+, Git, zero production npm dependencies.
- Run schema 1; older runs remain readable without migration or relocating data.
- Default run root `~/.electric-sheep/runs`; explicit `--runs-root` remains supported.
- Three cumulative challenges; at most one repair per challenge; five-minute default command timeout.
- No automatic source modification, stash, reset, merge-back, dependency installation, model calls, telemetry, or arbitrary numerical quality scores.
- A worktree is not a security sandbox; inherited host access and escaped processes remain relevant.
- Feature branches and PRs against `main`; no direct pushes to `main` or merge without user approval.
- Release 0.3.0; preserve canonical `evolution-stress-test` skill and `electric-sheep` identifiers.
- Every implementation task follows RED -> GREEN -> relevant regression tests -> commit. No dependency install without separate approval. Existing development tooling is already present.

## Review Focus

1. A report regenerated during cleanup must retain the authored plan, dependencies, uncertainty, and evidence rather than silently replacing it with generic text (Tasks 1, 2, 4).
2. A failed/blocked or no-finding run must not invent defects, promote hypothetical requirements to production features, or lose the cleanup offer (Tasks 1, 4, 5).
3. Worktree changes made after the previous report, including nonignored new/binary files, must survive as evidence; ignored secrets must not be copied (Tasks 3, 5).
4. A source checkout that moved, a legacy cleaned run, or package paths containing spaces/Unicode must not break retained reporting or falsely certify removal (Tasks 2, 3, 5).
5. Partial publication, running command records, locked worktrees, or a foreign path recreated after cleanup must prevent destructive/false-success behavior (Tasks 2, 3, 4).

## File structure and ownership

- New `src/follow-up.mjs`: pure follow-up validation, fallback construction, stable dependency ordering, and three Markdown renderers.
- New `src/outputs.mjs`: fixed-name atomic publication, output/evidence hash manifest, verification, and structured closing descriptor. It does not import reporting or cleanup orchestration.
- Modify `src/report.mjs`: build structured follow-up, retain legacy fields, assemble/persist the package through `outputs.mjs`.
- New `src/closing.mjs`: output-before-deletion lifecycle orchestration; imports report/workspace/protocol, not the CLI.
- Modify `src/workspace.mjs`: expose registration verification and strengthen actual cleanup postconditions without importing reports.
- Modify `src/protocol.mjs`: reconcile pending command records on terminal resume without reopening the protocol.
- Modify `src/cli.mjs`: optional follow-up input, usage errors, output/closing descriptors, orchestration under existing locks.
- New `tests/follow-up.test.mjs`, `tests/outputs.test.mjs`, `tests/closing.test.mjs`, `tests/helpers/follow-up.mjs`; extend existing report/CLI/protocol/e2e/packaging/distribution tests as their behaviors change.
- Modify canonical skill; add `skills/evolution-stress-test/references/follow-up.md` and `follow-up.example.json`; update README, usage, verification, and release metadata.

## Shared interface decisions

`FollowUpInput = { schemaVersion: 1, actions: Action[] }`. Each action has `id`, `title`, `findingIds`, `priority`, `rationale`, `targetPaths`, `steps`, `acceptanceCriteria`, `dependsOn`. Priority values are exactly `high|medium|low|untriaged`. Input actions link existing findings; an empty array is allowed. No cycles or unknown dependencies. Target paths may be empty but otherwise are repository-relative. Classification/evidence/origin are derived, never trusted input assertions.

`FollowUp = { schemaVersion: 1, source: 'host-agent'|'runner-template', actions, notes }`. Normalized actions retain input fields and add derived finding categories/origins/evidence and explicit validation/applicability gates. The report remains a schema-1 object with its current fields plus `followUp`.

`OutputPaths = { jsonPath, markdownPath, nextActionsPath, implementationPlanPath, agentPromptPath, outputManifestPath }`, all absolute. For non-cleaned runs, `ClosingDescriptor = { requiresConfirmation: true, choices: ['remove-worktree','keep-worktree'], cleanup: { executable, args, cwd }, retainedPaths }`. For recorded cleaned runs it instead has `requiresConfirmation: false`, `choices: []`, and `cleanup: null`, without claiming fresh removal verification. The cleanup command includes explicit `--runs-root` and `cwd` equal to the runs root, outside the worktree.

### Task 1: Evidence-linked follow-up model and rendering

**Files:** create `src/follow-up.mjs`, `tests/follow-up.test.mjs`, `tests/helpers/follow-up.mjs`.

**Interfaces:** consumes the current `buildReport`-shaped plain object; produces synchronous pure functions `validateFollowUp(input, report) -> FollowUpInput`, `buildFollowUp(report, input?) -> FollowUp`, `renderNextActions(report) -> string`, `renderImplementationPlan(report) -> string`, `renderAgentPrompt(report, context) -> string`. Context supplies absolute run/package paths; it never needs an existing worktree.

- [ ] **Step 1: Write failing domain/rendering tests.** Construct mixed defect/structural/hypothesis report fixtures and a valid two-action dependency chain. Assert cloning, stable topological order, exact priority labels, preserved finding IDs/refs/origins, and nonempty acceptance steps. Example boundary assertions:

  ```js
  assert.equal(buildFollowUp(report).source, 'runner-template');
  assert.equal(buildFollowUp(report, input).source, 'host-agent');
  assert.throws(() => validateFollowUp(cyclicInput, report), /depend|cycl/i);
  assert.throws(() => validateFollowUp(unknownFindingInput, report), /finding/i);
  ```

  Add named cases for `schemaVersion: 2`, duplicate IDs, empty required text/lists, invalid priority, absolute/`../` targets, unknown/self dependencies, and missing finding links. Assert no mutation of input/report. Empty `targetPaths` is accepted rather than inventing files.
- [ ] **Step 2: Run RED.** `node --test tests/follow-up.test.mjs`; expect missing exports/module, then actual missing behavior as implementation proceeds.
- [ ] **Step 3: Implement the pure module.** Preserve supplied action order among ready dependencies. Show host priorities as judgment; derive evidence/provenance and gates. Fallback actions use `untriaged`; no findings means coverage/recovery notes, not invented bugs. Render blocked baseline diagnosis, experimental applicability approval, and hypothesis validation explicitly. Escape untrusted Markdown/HTML. The agent prompt includes repository/baseline checks, fresh command approval, a new feature branch, retained evidence paths, and prohibition on blindly applying experimental patches; no live-worktree dependency.
- [ ] **Step 4: Run GREEN.** Extend assertions for completed/no-findings, blocked baseline, failure, cancellation, malicious text, and a deleted worktree. Renderers must preserve gates even when the host's wording requests an immediate fix.
- [ ] **Step 5: Commit.** `git add src/follow-up.mjs tests/follow-up.test.mjs tests/helpers/follow-up.mjs && git commit -m "feat: add evidence-linked follow-up model and handoff rendering"`.

### Task 2: Publish and verify the complete retained package

**Files:** create `src/outputs.mjs`, `tests/outputs.test.mjs`; modify `src/report.mjs`, `tests/report.test.mjs`.

**Interfaces:** consumes Task 1 functions. Produces `writeOutputBundle(run, contents, evidenceRefs) -> OutputPaths`, `verifyOutputBundle(run) -> { generationId, paths, evidenceRefs }`, and `describeClosing(run, paths) -> ClosingDescriptor`. `contents` has exactly the five fixed deliverable filenames. Preserve `writeReports(run, { followUp } = {}) -> { ...OutputPaths, closing }`; `buildReport(run)` adds normalized follow-up but retains legacy `nextActions` strings.

- [ ] **Step 1: Write failing publication/report tests.** Assert five nonempty files plus `outputs.json`, schema/run/generation IDs, read-back SHA-256 agreement, proper evidence hashes, old return keys, and saved authored follow-up reused by a later `writeReports(run)` call. Invalid follow-up must leave manifest/prior output bytes unchanged.

  ```js
  const paths = await writeReports(run, { followUp: input });
  assert.ok(paths.agentPromptPath && paths.outputManifestPath);
  assert.equal((await buildReport(run)).followUp.source, 'host-agent');
  assert.equal((await verifyOutputBundle(run)).paths.jsonPath, paths.jsonPath);
  ```

  Test legacy runs without `followUp`, missing source directory, and Unicode/spaced paths. Add actual filesystem failures: directory/symlink at a fixed output destination, missing/tampered deliverable, stale publication manifest, missing/escaping/symlinked evidence. Use directory junction fixtures on Windows where file symlink creation needs privileges. Verification must reject them without writing outside the owned run.
- [ ] **Step 2: Run RED.** `node --test tests/outputs.test.mjs tests/report.test.mjs`.
- [ ] **Step 3: Implement publication and report assembly.** Validate/clone authored follow-up before writes, persist valid input separately from the approved exercise plan, and reuse it by default. Use `ownedDirectory`, restrictive exclusive temporary files, rename, and read-back hashes; publish manifest last. Derive evidence refs from report/finding/result/diff records and saved acceptance `evidencePath` fields. Do not follow symlinked evidence roots or accept arbitrary filenames from a manifest. Clean temporary publication files on failure. Keep partial packages detectable, not falsely transactional.
- [ ] **Step 4: Run GREEN.** Run the tests above plus `node --test tests/store.test.mjs tests/distribution.test.mjs`. Verify ordinary reporting can still describe prepared/partial/cleaned runs without project execution. `describeClosing` contains absolute literal executable/argv and correct explicit runs root for non-cleaned runs, but does not remove anything or record consent. On a cleaned run it returns no cleanup choice/command and does not assert freshly verified removal.
- [ ] **Step 5: Commit.** Stage only Task 2 files; commit `feat: publish verified reports plans and agent handoff packages`.

### Task 3: Preserve final evidence and verify actual cleanup

**Files:** create `src/closing.mjs`, `tests/closing.test.mjs`; modify `src/workspace.mjs`, `src/protocol.mjs`, `tests/workspace.test.mjs`, `tests/protocol.test.mjs`.

**Interfaces:** consumes Task 2 `writeReports`/`verifyOutputBundle` and existing `captureDiff`, `collectDeltas`, `cancelRun`, `cleanupWorkspace`, `interruptPending`. Export `isWorkspaceRegistered(run) -> Promise<boolean>` from workspace (rename the current private `registered` helper consistently). Produce `finalizeCleanup(run, { deleteEvidence = false, cwd = process.cwd() } = {}) -> Promise<CleanupReceipt>`. Receipt has `id`, original `outcome`, `phase: 'cleaned'`, `verified: true`, `evidenceDeleted`, and `retainedPaths`. Caller owns the mutation lock and consent check.

- [ ] **Step 1: Write failing real-worktree tests.** Add dirty tracked, new text, and binary changes after a previous report. Add ignored secret content. Cleanup must save an applicable final diff, keep previous snapshots/patches and all deliverables, omit the ignored secret, remove directory/registration, and leave source snapshot/branch unchanged.

  ```js
  const receipt = await finalizeCleanup(run, { cwd: root });
  assert.equal(receipt.verified, true);
  assert.equal(receipt.evidenceDeleted, false);
  assert.equal(await isWorkspaceRegistered(run), false);
  await assert.rejects(access(run.workspace));
  assert.deepEqual(await repo.snapshot(), original);
  ```

  Add tests for output publication failure retaining the worktree; `cwd` inside the worktree; pending `running` command records; locked worktree removal failure/retry using real `git worktree lock/unlock`; forged ownership, symlinks, checkpoint drift, missing workspace/registration reconciliation; and a foreign replacement path after successful cleanup. Repeat cleanup must be safe but must not certify/delete the replacement path.
- [ ] **Step 2: Run RED.** `node --test tests/closing.test.mjs tests/workspace.test.mjs tests/protocol.test.mjs`.
- [ ] **Step 3: Implement the ordered lifecycle.** Check cwd/pending records/ownership before mutations. Capture final diff without project commands or a commit, then explicitly cancel unfinished work, collect deltas, publish/verify outputs, remove only the owned worktree, and verify both actual postconditions before saving `cleaned`. Preserve original terminal outcomes. Already-absent worktrees need absent registrations; old cleaned runs can publish from retained state. On removal error retain outputs and report retry guidance. Explicit purge returns no retained paths and must verify deletion rather than claim preservation.

  For terminal `validateResume`, reconcile `running` results through `interruptPending` after the documented operator stop check, preserving terminal phase/outcome/attempts. Do not restart tests, mark unknown outcomes passed, or claim escaped descendants were killed. Keep workspace primitives free of imports from reporting/closing to avoid cycles.
- [ ] **Step 4: Run GREEN.** Test interrupted terminal resume followed by cleanup, successful and failed outcome preservation, missing-source failure without destruction, and idempotent cleanup. Replay checkpoint patches and the final binary-capable patch in a separate temporary baseline checkout; the recovered final files must match the saved experiment, without relying on detached commits surviving cleanup.
- [ ] **Step 5: Commit.** Stage only Task 3 files; commit `fix: preserve final evidence and verify worktree cleanup postconditions`.

### Task 4: Wire the CLI and make session closing explicit in the skill

**Files:** modify `src/cli.mjs`, `tests/cli.test.mjs`, `tests/skills.test.mjs`, canonical `SKILL.md`, `README.md`, `docs/usage.md`; create `skills/evolution-stress-test/references/follow-up.md` and `follow-up.example.json`.

**Interfaces:** CLI `report --run ID [--follow-up FILE] [--runs-root PATH]` calls Task 2; `cleanup --run ID --confirm ID [--delete-evidence]` calls Task 3 under `withRunLock`. No new mandatory user arguments. The host prepares follow-up input and presents the closing descriptor; it does not auto-approve it.

- [ ] **Step 1: Write failing CLI/skill tests.** Test optional flag omission, valid/invalid JSON and contract input, exact run-ID consent, no worktree removal during report, full output paths/choices, explicit nondefault runs root, saved follow-up persistence through cleanup, output verification failure exit 1, and usage failure exit 2 without mutation. Validate the shipped reference example against a real fixture report. Structural skill tests check the specified closing steps, but must not be represented as live-model behavioral proof.
- [ ] **Step 2: Run RED.** `node --test tests/cli.test.mjs tests/skills.test.mjs`.
- [ ] **Step 3: Wire interfaces.** Mark `follow-up` optional rather than accidentally required by the generic flag loop; restrict it to `report`. Parse/validate it before persistence and map malformed input to `UsageError`. Keep report read-only with respect to project code and preserve exit semantics for exercise failures. Delegate cleanup orchestration instead of duplicating it. Return verified retained paths and truthful explicit-purge status; no cleanup side effect from the closing descriptor.
- [ ] **Step 4: Update the canonical closing workflow and docs.** Cover every terminal outcome: findings -> authored follow-up/fallback -> verified package -> visible summary/paths -> explicit remove-or-keep question -> leave workspace/resolve processes -> matching-confirmation cleanup -> verified receipt or clear recovery failure. No response means keep. Show a concrete closing conversation and copy/paste handoff usage; explain retained files/default root, snapshot limits, hypotheses/applicability gates, fresh approvals, failure/retry, historical worktree paths, and the destructive purge distinction. The example JSON must use only the specified contract and clearly illustrative finding IDs.
- [ ] **Step 5: Run GREEN and commit.** Run Task 4 tests plus report/closing tests, `git diff --check`, and README internal anchor validation. Commit `feat: expose actionable handoff and explicit session closing workflow`.

### Task 5: Prove end-to-end delivery and release consistent metadata

**Files:** modify `tests/e2e.test.mjs`, `tests/packaging.test.mjs`, `tests/distribution.test.mjs`, `docs/verification.md`, `package.json`, `package-lock.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`. No bundler allowlist change is expected: it already includes complete `src/` and `skills/`.

**Interfaces:** use the public CLI and generated bundles, not new test-only execution hooks. Preserve all runtime interfaces from Tasks 1-4 and existing local install layouts.

- [ ] **Step 1: Write failing complete-session/distribution tests.** Exercise three-round success with mixed authored findings, a terminal failure, and a blocked baseline. Assert complete output before a cleanup choice; keep leaves the worktree; confirmed removal yields a readable package and safe agent prompt with no live-worktree dependency. After removal, regenerate reports and verify same authored actions and evidence. Test the independently copied Codex skill can report/clean a fixture from unrelated cwd, including spaces/Unicode. Assert release metadata is exactly `0.3.0` and schema remains `1`.
- [ ] **Step 2: Run RED.** `node --test tests/e2e.test.mjs tests/packaging.test.mjs tests/distribution.test.mjs`; new metadata assertions must fail before release values change.
- [ ] **Step 3: Align release metadata.** Update package/lock root versions and both plugin manifests/catalog entry to `0.3.0`. Retain historical verification claims and add current evidence/limitations only after executing checks. Resolve reproduced integration failures with failing regressions, not speculative refactoring.
- [ ] **Step 4: Final verification and author review.** Run `npm test`, `npm run check`, `npm run format:check`, `npm pack --dry-run`, `git diff --check`, and `claude plugin validate --strict --json .`. Verify both complete bundles and copied standalone runtime. Read the whole diff against the spec, explicitly inspect all five Review Focus cases, and record that no independent reviewer/model exercise was available. Do not install dependencies or invoke paid models to satisfy a verification claim.
- [ ] **Step 5: Commit and delivery.** Commit `feat: release actionable output and verified closing as 0.3.0`. Push only the feature branch; open a PR against `main`, report actual checks/remaining host limitations, preserve this worktree for feedback, and leave the PR unmerged.

## Plan self-review and execution handoff

- Spec coverage: Task 1 owns actionable reasoning/provenance and prompt safety; Task 2 owns publication/compatibility/integrity; Task 3 owns final evidence and verified removal; Task 4 owns actual user/CLI/host closing flow; Task 5 owns installed delivery and release detection.
- Interface check: modules form a one-way composition (`follow-up`/`outputs` -> `report` -> `closing` -> CLI); output verification does not import reports. Existing `writeReports` keys remain; optional follow-up is not part of the approved exercise plan.
- Review Focus: each listed condition is explicitly assigned regression tests above. Micro-races with arbitrary external editors or escaped processes remain a documented host-concurrency limit, not a new confinement guarantee.
- Execution capability: this Pi session has no subagent/reviewer tool. Recommend native execution through `superpowers:executing-plans`, with honest author self-review rather than invented independent review.
- [x] User reviewed this plan and confirmed native execution before implementation. Task completion/test evidence is recorded in the feature commits and `docs/verification.md`.
