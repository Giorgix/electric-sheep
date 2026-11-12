# Electronic Sheeps Evolution Stress Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a locally installable Claude Code/Codex skill pack and small CLI that exercise realistic successive changes in disposable Git worktrees and produce evidence-backed reports.

**Architecture:** Host-native skills propose challenges and implement experimental changes; a dependency-free Node CLI manages workspaces, command approvals, checkpoints, run state, and evidence. A single canonical skill is shared by thin host integrations. The CLI never launches model sessions, automatically merges changes, or claims to provide a security sandbox.

**Tech Stack:** Node.js 22+, ES modules, Node standard library and `node:test`, Git, Markdown skills, JSON plugin manifests.

**Spec:** `docs/superpowers/specs/2026-11-12-evolution-stress-test-design.md`

## Global Constraints

- Node.js 22+ and Git as runtime requirements; no production npm dependencies initially.
- V1 requires a Git repository with an initial commit and a clean checkout, including no untracked files.
- Ignored files are not copied into the experiment.
- Three cumulative challenges by default, approved together before execution.
- Use one implementation attempt and at most one repair cycle per challenge by default.
- Runner-owned commands have a default five-minute timeout, adjustable at approval.
- No automatic merge, repair of the original project, model API calls, or external reporting.
- No universal quality score or automatic ship/no-ship verdict.
- Actual OS-level confinement requires a separate sandbox and is outside v1.
- Logs remain local; the runner has no telemetry or upload feature.
- Maintain one canonical skills directory and thin host-specific packaging for Claude Code and Codex.
- Only claim real Claude Code/Codex compatibility after testing those hosts.
- Support Windows, macOS, and Linux in the design; report actual verification separately.

## Review Focus

1. Paths with spaces, Unicode, traversal, or symlinked parents: ordinary paths work; run IDs and cleanup destinations cannot escape the owned run root. Tests: Tasks 2–3.
2. Git configuration that executes code (hooks, filters, signing, fsmonitor): runner Git mechanics do not silently execute it; unsupported materialization is rejected. Tests: Tasks 1 and 3.
3. Interrupted or concurrent CLI invocations: evidence survives, only one mutation proceeds, and resume never invents a passed check. Tests: Tasks 2, 4, and 7.
4. Tests that disappear, are weakened, or pass without meaningful coverage: invalidate changed protected artifacts and label approved smoke-only coverage as limited. Tests: Tasks 5 and 8.
5. Host packaging installs skills but omits their runner or resolves it relative to the target project: installed artifacts contain the runner and resolve it relative to the plugin. Tests: Task 9.

---

## Execution prelude

The workspace currently contains only design documentation and is not a Git repository. Do not run these actions until execution is approved.

- [ ] Confirm the approved spec and this plan are the only existing project files; preserve any new user files.
- [ ] Initialize Git only if still absent, then commit the approved design and plan. Use existing Git identity; if none is configured, ask for a repository-local identity instead of inventing one or changing global settings.
- [ ] Invoke `using-git-worktrees` and establish the implementation workspace before product changes. Keep this implementation workspace distinct from the disposable exercise worktrees the product creates.
- [ ] Execute tasks in order with TDD. Read `writing-skills` before Task 8; follow its actual skill-testing process, marking unavailable independent-agent validation rather than substituting text checks for behavioral evidence.

## File structure

```text
package.json                         # package metadata, bin, npm test/check scripts
bin/electronic-sheeps.mjs             # CLI entry point only
src/contracts.mjs                    # defaults, input validation, JSDoc data contracts
src/git.mjs                          # runner-owned Git invocation policy
src/repository.mjs                   # read-only repository/scope prerequisites
src/store.mjs                        # run IDs, locks, atomic persistence, ownership
src/workspace.mjs                    # disposable worktrees, checkpoints, cleanup
src/commands.mjs                     # approved command execution and raw evidence
src/protocol.mjs                     # baseline/challenge lifecycle and integrity
src/report.mjs                       # findings validation and JSON/Markdown reports
src/cli.mjs                          # argument dispatch and user-facing errors
skills/evolution-stress-test/SKILL.md # shared user-invoked workflow
skills/evolution-stress-test/references/challenges.md
skills/evolution-stress-test/references/assessment.md
skills/evolution-stress-test/agents/openai.yaml
.claude-plugin/plugin.json
.codex-plugin/plugin.json
scripts/package-local.mjs            # reproducible local host bundles, not publishing
examples/checkout/                   # dependency-free sample code, tests, and exercise
tests/helpers/repos.mjs              # temporary Git fixture helper
tests/*.test.mjs                     # one test file per responsibility, plus e2e/packaging
README.md
docs/usage.md                       # full CLI/plan schema and permissions
docs/verification.md                 # actual host/OS checks, including unverified ones
.github/workflows/test.yml
.gitignore
.gitattributes
```

Use standard-library modules; do not introduce a web framework, TypeScript build, schema dependency, or generic plugin abstraction. File boundaries may be refined if tests reveal a concrete need, not to create a framework.

## Shared contracts

Define these in JSDoc in `src/contracts.mjs`; subsequent tasks use the same names. All exported operations are async unless stated otherwise.

- `CommandSpec = { id, executable, args: string[], cwd: string, timeoutMs: number, purpose: 'setup'|'check' }`. `cwd` is worktree-relative, default `'.'`; `timeoutMs` defaults to `300000`. No implicit shell expansion. Environment overrides are not a v1 input.
- `Challenge = { id, requirement, rationale, constraints: string[], protectedPaths: string[], commandIds: string[], stopCondition }`.
- `ExercisePlan = { schemaVersion: 1, scope: string[], commands: CommandSpec[], setupCommandIds: string[], baselineCommandIds: string[], baselineProtectedPaths: string[], coverage: 'existing'|'limited', coverageNote, challenges: Challenge[], exclusions: string[], host: string, roleSeparation: 'single-agent'|'separate-agents'|'unknown' }`.
- `RepositoryInfo = { root, commit, branch, scope: string[], gitVersion, nodeVersion }`.
- `Run = { schemaVersion: 1, id, directory, repository: RepositoryInfo, workspace, plan: ExercisePlan, approvals: Approval[], phase, outcome: string|null, currentIndex: number, attempts: number, checkpoint, rounds: Round[], protectedArtifacts: Artifact[], commandResults: CommandResult[], deltas: object[], events: object[], findings: Finding[] }`.
- `Round = { challengeId, index: number, status: 'not-run'|'frozen'|'passed'|'failed'|'invalid', attempts: number, beforeCheckpoint: string|null, afterCheckpoint: string|null, protectedArtifacts: Artifact[], resultIds: string[] }`. Initialize all three rounds as not run; preserve their outcomes after cleanup.
- `outcome` is initially null and records the terminal exercise phase when reached. Cleanup changes `phase` to `cleaned` without erasing `outcome`, rounds, or recorded metrics.
- `Approval = { at, note, planHash }`; note records consent conveyed by the host, not authenticated human identity.
- `Artifact = { path, sha256, evidencePath }`; paths are relative to the worktree and regular files, copies are outside it.
- `CommandResult = { id, commandId, stage, status: 'running'|'passed'|'failed'|'timed-out'|'interrupted'|'spawn-error', exitCode: number|null, signal: string|null, startedAt, finishedAt: string|null, durationMs: number|null, stdoutPath, stderrPath }`.
- `Finding = { id, category: 'defect'|'evolution-friction'|'maintainability-concern'|'hypothesis', origin: 'baseline'|'experimental'|'uncertain', impact, summary, evidenceRefs: string[], recommendation }`.
- `phase` is one of `prepared`, `baseline`, `ready`, `challenge`, `completed`, `blocked`, `failed`, `invalid`, `cancelled`, `cleaned`.

Reports expose `status` as `run.outcome ?? run.phase`, `roleSeparation` from the approved plan, `findings`, and `challenges` derived from recorded rounds with `id`, `requirement`, `outcome`, and `evidenceRefs`. Round `frozen` maps to report outcome `in-progress`; other round statuses retain their names. Evidence references are run-relative files under `evidence/`, not arbitrary absolute paths; referenced command IDs are resolved to their saved artifacts. Reports also include the full baseline, approval, environment, and limitation records from the spec.

Persist a run as `manifest.json` with immutable numbered evidence files under `evidence/`, worktree under `worktree/`, and an ownership marker beside the manifest. Default run root is `~/.electronic-sheeps/runs`; expose `--runs-root` for testing and deliberate alternate storage. Reject roots nested inside the source repository. Use opaque UUID run IDs, not user-controlled filesystem paths.

Approval amendments replace the plan with an explicitly recorded version, preserving the earlier approved copy and hash. They may add commands or narrowly authorize acceptance-test changes, but cannot erase past failures or increase completed-round counts. V1 accepts exactly three challenges; non-default challenge counts are deferred rather than adding premature budget configuration.

## Task 1: Validated exercise plans and read-only repository inspection

**Files:** Create `package.json`, `.gitignore`, `.gitattributes`, `src/contracts.mjs`, `src/git.mjs`, `src/repository.mjs`, `tests/helpers/repos.mjs`, `tests/contracts.test.mjs`, `tests/repository.test.mjs`.

**Interfaces:**
- Produce `validatePlan(input: object): ExercisePlan` (synchronous); export `SCHEMA_VERSION = 1`, `DEFAULT_TIMEOUT_MS = 300000`.
- Produce `runGit(cwd: string, args: string[]): Promise<string>` for runner-owned mechanics only; disable hooks, signing, fsmonitor, pagers, external diff/textconv, and interactive prompts as relevant. Never reuse this helper to authorize arbitrary project commands.
- Produce `inspectRepository({repo, scope}: {repo: string, scope: string[]}): Promise<RepositoryInfo>`.
- Produce test helper `createRepo({files = {}, commit = true} = {}): Promise<{root, git(...args), write(path, text), snapshot(), dispose()}>`. Use local fixture identity and isolated test Git configuration.

- [ ] **Step 1: Write failing tests.** Name tests `valid plan receives exact defaults`, `rejects ambiguous command approvals`, `clean committed source is inspected without mutation`, and `unsupported checkout is blocked`. Assertions include:
  ```js
  assert.equal(validatePlan(validPlan).commands[0].timeoutMs, 300000);
  assert.throws(() => validatePlan({...validPlan, challenges: []}));
  assert.throws(() => validatePlan(duplicateCommandIds));
  assert.throws(() => validatePlan(unknownCommandReference));
  assert.throws(() => validatePlan(shellStringInsteadOfArgv));
  assert.throws(() => validatePlan(emptyBaselineChecks));
  assert.deepEqual(await repo.snapshot(), before);
  await assert.rejects(inspectRepository({repo: dirtyRoot, scope: ['.']}), /dirty/i);
  ```
  Add staged, unstaged, untracked, unborn, non-Git, nonexistent scope, `../` scope, empty acceptance checks/protected paths, and invalid/nonpositive timeout cases. Reject submodules and any Git filter attributes in v1 before worktree materialization; test both with sentinel executables that must not run. Test a configured fsmonitor sentinel and unchanged source hooks/config.
- [ ] **Step 2: Verify RED.** Run `node --test tests/contracts.test.mjs tests/repository.test.mjs`; expect failed imports or assertions for missing functionality, not syntax errors.
- [ ] **Step 3: Implement the interfaces.** Use NUL-delimited Git status/path output and argument arrays. Resolve scope against the actual repository root. Validate required nonempty strings, unique IDs, command references, three ordered challenges, nonempty protected-file selections, and explicit limited-coverage notes. Do not parse code, install dependencies, or execute project scripts. Add `npm test` → `node --test tests/*.test.mjs` and a syntax-check script using Node, with no dependencies.
- [ ] **Step 4: Verify GREEN.** Rerun the targeted tests and `npm test`; all assertions pass, including no sentinel execution and unchanged source snapshots.
- [ ] **Step 5: Commit** the task files with `feat: validate exercise plans and inspect clean repositories`.

## Task 2: Owned run storage, atomic state, and mutation locks

**Files:** Create `src/store.mjs`, `tests/store.test.mjs`.

**Interfaces:** Consume Task 1 contracts. Produce `createRun({runsRoot, repository, plan, approvalNote}): Promise<Run>`, `loadRun(runsRoot, id): Promise<Run>`, `saveRun(run): Promise<void>`, `withRunLock(runsRoot, id, action: (run: Run) => Promise<unknown>): Promise<unknown>`, and `recoverLock(runsRoot, id, approvalNote): Promise<void>`.

- [ ] **Step 1: Write failing tests.** Cover `round-trip approved run`, `exclusive mutation`, `atomic save preserves old state on error`, and `run paths cannot escape ownership`:
  ```js
  assert.equal(reloaded.phase, 'prepared');
  assert.equal(reloaded.approvals[0].planHash, expectedHash);
  await assert.rejects(loadRun(root, '../source'), /invalid.*id/i);
  await assert.rejects(secondWriter(), /locked/i);
  assert.deepEqual(await loadRun(root, run.id), previousCompleteManifest);
  ```
  Include Unicode/spaced roots, malformed schema versions, missing/forged ownership markers, symlinked run directories, runs roots inside the source checkout, and stale-lock recovery requiring an explicit note. Never automatically infer that an old PID makes a lock safe to delete.
- [ ] **Step 2: Verify RED.** Run `node --test tests/store.test.mjs`; expect missing storage behavior.
- [ ] **Step 3: Implement the interfaces.** Use `crypto.randomUUID`, owner-only permissions where supported, exclusive file creation for locks, and same-directory write-then-rename for manifests. Validate realpath containment and non-symlink ownership before mutation. Keep the lock across the complete caller mutation, including command execution; do not recursively acquire it. Explicit recovery is an audit event, not proof a competing process is gone.
- [ ] **Step 4: Verify GREEN.** Run the task tests and `npm test`; previous state remains readable after simulated write failure.
- [ ] **Step 5: Commit** with `feat: persist owned runs with atomic state and locks`.

## Task 3: Disposable workspaces, checkpoints, and safe cleanup

**Files:** Create `src/workspace.mjs`, `tests/workspace.test.mjs`; modify `src/git.mjs` only for mechanics this task exercises.

**Interfaces:** Consume `Run`, `runGit`, and store ownership validation. Produce `createWorkspace(run): Promise<Run>`, `checkpoint(run, label: string): Promise<{commit: string, diffPath: string}>`, `validateWorkspace(run): Promise<void>`, and `cleanupWorkspace(run, {deleteEvidence = false} = {}): Promise<void>`. These functions are called while a run lock is held.

- [ ] **Step 1: Write failing tests.** Cover `detached experiment leaves original source unchanged`, `checkpoint captures added files`, and `cleanup refuses unrelated paths`:
  ```js
  assert.notEqual(run.workspace, repo.root);
  assert.equal(await gitInWorkspace('branch', '--show-current'), '');
  assert.deepEqual(await repo.snapshot(), before);
  assert.equal(await readFile(run.workspace + '/ignored-secret', 'utf8').catch(() => null), null);
  await assert.rejects(cleanupWorkspace(forgedRun), /ownership|workspace/i);
  assert.equal(await reportStillExists(), true);
  ```
  Test paths containing spaces; checkpoint without global Git identity; malicious commit/post-checkout hooks, signing settings, source branch movement after run creation, tracked-path symlink escape during cleanup, and interruption after worktree registration but before manifest save. Reconciliation must not remove a foreign directory. Verify source HEAD and branch remain unchanged throughout.
- [ ] **Step 2: Verify RED.** Run `node --test tests/workspace.test.mjs`.
- [ ] **Step 3: Implement the interfaces.** Add a detached worktree at the recorded commit. Use runner-local commit identity/settings without changing repository config. Store full diffs outside the worktree and preserve ignored inputs by not copying them. Cleanup removes only the exact verified run-owned registration/path, never broad prune/clean operations; preserve evidence by default. Record partial setup as blocked and make cleanup retryable.
- [ ] **Step 4: Verify GREEN.** Run the task tests and `npm test`; sentinel hooks never run, cleanup retains evidence, and source snapshots match.
- [ ] **Step 5: Commit** with `feat: isolate exercises in owned detached worktrees`.

## Task 4: Approved commands with durable execution evidence

**Files:** Create `src/commands.mjs`, `tests/commands.test.mjs`.

**Interfaces:** Consume `Run`, `CommandSpec`, `CommandResult`, and `saveRun`. Produce `executeApproved(run, commandId: string, stage: string): Promise<CommandResult>` and `interruptPending(run): Promise<void>`. Caller owns the lock. Commands are looked up from the current approved plan, never supplied as free-form replacement arguments.

- [ ] **Step 1: Write failing tests.** Cover `approved argv is literal`, `nonzero exit remains failure`, `timeout is recorded`, and `running evidence survives interruption`:
  ```js
  await assert.rejects(executeApproved(run, 'unapproved', 'baseline'), /approved/i);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.exitCode, 7);
  assert.equal(timedOut.status, 'timed-out');
  assert.equal(interrupted.status, 'interrupted');
  assert.equal(await literalArgumentOutput(), 'a; echo NOT_EXECUTED');
  ```
  Include missing executable, missing/escaping/symlinked cwd, high stdout/stderr volume, a short test-only approved timeout, a subprocess spawning a child, and interrupted evidence left with `status: 'running'`. Verify full logs stream to files rather than accumulating unbounded memory, and any quoted/metacharacter paths remain literal.
- [ ] **Step 2: Verify RED.** Run `node --test tests/commands.test.mjs`.
- [ ] **Step 3: Implement the interfaces.** Use `child_process.spawn` without a shell, persist a running result before spawning, then stream logs and persist its actual terminal outcome. Apply approved timeout with bounded termination escalation. For Windows, test a PID-specific `taskkill /T /F` fallback; for POSIX, test a separately created process group and group termination. Document observed limitations; never promise arbitrary descendant confinement. `interruptPending` records unknown/interrupted outcomes without converting them to passes.
- [ ] **Step 4: Verify GREEN.** Run the task tests and `npm test`; confirm no timed-out fixture child remains active where the platform supports the tested termination method.
- [ ] **Step 5: Commit** with `feat: execute approved checks and record durable evidence`.

## Task 5: Cumulative challenge protocol and acceptance integrity

**Files:** Create `src/protocol.mjs`, `tests/protocol.test.mjs`.

**Interfaces:** Consume prior task interfaces. Produce `runBaseline(run): Promise<Run>`, `freezeChallenge(run): Promise<Run>`, `evaluateChallenge(run): Promise<Run>`, `amendPlan(run, plan: ExercisePlan, approvalNote: string): Promise<Run>`, `cancelRun(run, note: string): Promise<Run>`, and `validateResume(run): Promise<Run>`. Mutators assume the run lock. `freezeChallenge` selects `plan.challenges[currentIndex]`; no caller-selected skipping.

- [ ] **Step 1: Write failing tests.** Cover `failed baseline blocks all challenges`, `three rounds preserve previous contracts`, `two failed evaluations stop sequence`, `changed protected test invalidates round`, and `resume cannot invent success`:
  ```js
  assert.equal(blocked.phase, 'blocked');
  await assert.rejects(freezeChallenge(blocked), /baseline|phase/i);
  assert.equal(afterFirstFailure.attempts, 1);
  assert.equal(afterSecondFailure.phase, 'failed');
  assert.equal(afterTampering.phase, 'invalid');
  assert.equal(afterThirdPass.phase, 'completed');
  assert.equal(resumed.commandResults.at(-1).status, 'interrupted');
  ```
  Add removed/renamed protected files, earlier regression failure after a new check passes, non-file or escaping protected paths, empty protected-directory selections, cancellation, changed checkpoint on resume, approved test amendment preserving earlier hashes/results, and limited baseline coverage requiring a note. A zero-exit test command alone is not proof that tests exist.
- [ ] **Step 2: Verify RED.** Run `node --test tests/protocol.test.mjs`.
- [ ] **Step 3: Implement baseline and freeze.** Persist phase transitions before running commands. Run approved setup commands only as declared, then all baseline checks; preserve snapshots/hashes of nonempty baseline protected files. On success move to `ready`; failures block. Freeze each challenge's acceptance artifacts before implementation, preserving earlier protected artifacts and the requirement. Protected paths may be regular files or recursively selected directories, but must resolve to a nonempty set of regular files inside the worktree. Use separate new acceptance files per challenge in examples; editing a prior protected test requires an amendment. The freeze operation runs the current challenge's approved checks once with stage `pre-implementation`, clearly distinguished from actual evaluation; expected red acceptance checks do not consume repair attempts. A precheck that already passes is reported as already satisfied, not invented red evidence. Snapshot/hash acceptance artifacts before and after prechecks too.
- [ ] **Step 4: Implement evaluation, amendments, and resume.** Run baseline and all applicable prior/current challenge checks on every evaluation. Hash protected files before and after commands; unexpected changes invalidate. Count each begun evaluation toward the two-attempt limit, including interrupted evaluations. Checkpoint passing rounds, increment index/reset attempts, and complete after round three. Record failed-round diffs too. Amendments require a note, retain old approvals/evidence, invalidate obsolete result eligibility, and require reruns; they never clear failure history or silently reopen terminal runs. An amendment to an active round returns it to `ready` for a new freeze while preserving attempts already consumed. Baseline-test amendments rerun baseline checks without rerunning setup automatically; changing baseline tests or setup before baseline completion instead requires a new run. Do not reset an active round's attempts when refreezing it. Resume validates ownership, checkpoint, artifacts, and incomplete results; cancellation is terminal. Unexpected drift stops for explicit review, not automatic reset or acceptance.
- [ ] **Step 5: Verify GREEN.** Run the task tests and `npm test`; assert sequence completion requires evidence for every applicable check, not merely a phase assignment.
- [ ] **Step 6: Commit** with `feat: enforce cumulative challenges and protected acceptance checks`.

## Task 6: Findings, contextual metrics, and honest reports

**Files:** Create `src/report.mjs`, `tests/report.test.mjs`.

**Interfaces:** Produce `addFinding(run, finding: Finding): Promise<Run>`, `collectDeltas(run): Promise<object[]>`, `buildReport(run): Promise<object>`, and `writeReports(run): Promise<{jsonPath: string, markdownPath: string}>`. Findings may be added after a terminal exercise outcome while evidence is retained. Report writing is allowed for blocked, failed, invalid, cancelled, and cleaned runs too.

- [ ] **Step 1: Write failing tests.** Cover `report preserves evidence and uncertainty`, `unsupported proof claims are rejected`, `both reports describe the same failed run`, and `cleaned runs remain reportable`:
  ```js
  assert.equal(report.findings[0].origin, 'experimental');
  assert.equal(report.roleSeparation, 'single-agent');
  assert.equal('qualityScore' in report, false);
  await assert.rejects(addFinding(run, defectWithNoEvidence), /evidence/i);
  assert.equal(report.challenges[2].outcome, 'not-run');
  assert.match(markdown, /not a security sandbox/i);
  ```
  Include nonexistent artifact references, a hypothesis without executed proof (allowed but explicitly labeled), baseline failure not presented as a newly discovered defect, generated/binary-file metric exclusion, and source/finding text containing Markdown/HTML that must not become executable report content.
- [ ] **Step 2: Verify RED.** Run `node --test tests/report.test.mjs`.
- [ ] **Step 3: Implement the interfaces.** Use runner records for outcomes/timings and separately attributed agent findings for interpretation. Calculate only supported Git/text deltas (touched files, additions/deletions, text-file line growth), excluding declared generated paths and binary content. Leave semantic complexity, dependency meaning, and observed coupling to evidence-linked interpretation; never fabricate language-independent function metrics. Save deltas before cleanup, use relative evidence links, and include all six report sections from the spec plus privacy, host-limit, and coverage disclosures. Defects require referenced failing check/input evidence; friction/concerns require referenced diffs/code. Hypotheses remain visibly unproven.
- [ ] **Step 4: Verify GREEN.** Run the task tests and `npm test`; verify Markdown facts agree with parsed JSON, including partial/invalid runs and metrics unavailable after an interruption.
- [ ] **Step 5: Commit** with `feat: report evidence-backed evolution findings without quality scores`.

## Task 7: A complete CLI workflow with interruption recovery

**Files:** Create `bin/electronic-sheeps.mjs`, `src/cli.mjs`, `tests/cli.test.mjs`; modify `package.json` to register the bin and publishable file list.

**Interfaces:** Produce `main(argv: string[], {stdout, stderr}: object): Promise<number>`. Entry point calls it and sets `process.exitCode`; importing it does not execute commands.

CLI verbs (all support `--runs-root`):
- `inspect --repo PATH --scope PATH` (repeatable scope).
- `start --repo PATH --plan FILE --approval-note TEXT` → approved run/worktree; no project commands yet.
- `baseline --run ID`, `freeze --run ID`, `evaluate --run ID`.
- `amend --run ID --plan FILE --approval-note TEXT`.
- `finding --run ID --file FILE`, `status --run ID`, `report --run ID`.
- `resume --run ID`, `recover-lock --run ID --approval-note TEXT`.
- `cancel --run ID --note TEXT`.
- `cleanup --run ID --confirm ID` (optionally `--delete-evidence`, explicitly destructive).

- [ ] **Step 1: Write failing process-level tests.** Cover `full CLI workflow`, `unknown options fail without side effects`, `approval is required`, and `interrupted run is recoverable`:
  ```js
  assert.equal((await cli(['--help'])).exitCode, 0);
  assert.notEqual((await cli(['start', '--repo', repo.root, '--plan', file])).exitCode, 0);
  assert.equal(JSON.parse((await cli(['status', '--run', id])).stdout).id, id);
  assert.notEqual((await cli(['cleanup', '--run', id, '--confirm', otherId])).exitCode, 0);
  assert.deepEqual(await repo.snapshot(), originalSnapshot);
  ```
  Include malformed/truncated JSON, another process holding a lock, cleanup twice, missing/moved source repository, start failure after run creation, and SIGINT during a fixture command. Status/report must remain useful without executing source code or assuming all artifacts exist.
- [ ] **Step 2: Verify RED.** Run `node --test tests/cli.test.mjs`.
- [ ] **Step 3: Implement the CLI.** Use `util.parseArgs` with verb-specific options and reject unknown flags. Output machine-readable JSON on successful operational commands; diagnostics go to stderr. Use exit code `0` for successful operations and passed checks, `1` for unsuccessful/blocked/invalid exercises or execution failure, and `2` for usage/input errors. Read-only status/report may succeed for failed runs. Acquire one run lock for every mutating verb, persist interruption, and route commands through protocol interfaces only. Explicit cleanup confirmation must match the UUID; never accept an arbitrary deletion path. Before worktree deletion, collect/persist deltas and write reports while source artifacts are still available. For an unfinished exercise, cleanup first records cancellation so the report retains a truthful terminal outcome. Already-cleaned owned runs return an idempotent result; full evidence deletion is separately explicit.
- [ ] **Step 4: Verify GREEN.** Run the task tests, `node bin/electronic-sheeps.mjs --help`, and `npm test`. The CLI can run the complete fixture without importing test helpers into production code.
- [ ] **Step 5: Commit** with `feat: expose bounded evolution exercises through a local CLI`.

## Task 8: One portable skill with relevant challenges and calibrated assessment

**Files:** Create `skills/evolution-stress-test/SKILL.md`, its two reference files listed above, `tests/skills.test.mjs`, `tests/skill-scenarios.md`.

**Interfaces:** Skill calls the Task 7 CLI using an absolute plugin-relative runner path, not the target project's cwd or a network `npx` download. References use the same plan schema and finding categories as Tasks 1 and 6.

- [ ] **Step 1: Follow `writing-skills` and establish RED behavioral scenarios.** Record baseline behavior for a dirty checkout, an irrelevant enterprise-scale challenge, a large cohesive generated file, an agent weakening a test, no meaningful baseline tests, and a host without subagents. Expected behavior is respectively stop without stash; reject scope creep; avoid unsupported complexity accusations; invalidate/amend with consent; propose limited approved baseline; disclose single-agent evaluation. Use independent runs where available; if unavailable, record that limit and keep live behavioral validation unverified.
- [ ] **Step 2: Add failing structural tests.** Assert frontmatter has a name/description, referenced files exist, examples parse with `validatePlan`, runner invocation matches CLI verbs, there are no automatic bootstrap hooks, and the skill includes approval/isolation/evidence limitations. Run `node --test tests/skills.test.mjs`; expect missing-skill failures. These tests are not substitutes for Step 1 behavioral tests.
- [ ] **Step 3: Write the skill and references.** Keep the main workflow short and explicit-use only. Cover repository instructions, source prerequisites, scope inference, batch challenge/command approval, worktree-only edits, baseline/limited coverage, frozen acceptance, at most two evaluations, cumulative regressions, report/cleanup, and no automatic fixes in source. Provide challenge patterns for boundary, failure, compatibility, and extension pressures with relevance/anti-overengineering checks. Assessment requires origin attribution, uncertainty, contextual evidence, and no arbitrary scores. Include natural-language invocation and host-relative runner resolution with no secret/API setup.
- [ ] **Step 4: Verify GREEN.** Rerun available behavioral scenarios and structural tests, then `npm test`. Record actual behavioral checks separately from static checks; never mark an unavailable independent evaluation as passed.
- [ ] **Step 5: Commit** with `feat: add a portable evidence-driven evolution testing skill`.

## Task 9: Thin Claude Code/Codex packaging with a bundled runner

**Files:** Create `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `skills/evolution-stress-test/agents/openai.yaml`, `scripts/package-local.mjs`, `tests/packaging.test.mjs`, `README.md`, `docs/usage.md`, `docs/verification.md`.

**Interfaces:** `package-local.mjs --host claude|codex --out PATH` creates a local directory bundle containing that host's manifest, canonical skills, `bin/`, `src/`, and `package.json`. It does not publish, install globally, copy personal configuration, or omit the runner. Output must be outside the source tree and not overwrite existing nonempty directories.

- [ ] **Step 1: Check current host requirements.** Use installed Claude CLI help and authoritative current host/plugin documentation to settle supported local installation/loading commands and Codex skill metadata. Do not copy Superpowers' author identity, branding, publisher URLs, portal metadata, or unneeded assets. Record versions and references; the current environment has a `claude` executable but no `codex` executable on PATH.
- [ ] **Step 2: Write failing packaging tests.** Name tests `bundles include executable runner and shared skill`, `installed paths are independent of target cwd`, and `unsafe outputs are rejected`:
  ```js
  assert.equal(claudeManifest.name, 'electronic-sheeps');
  assert.equal(codexManifest.name, 'electronic-sheeps');
  assert.equal(claudeManifest.version, packageJson.version);
  assert.equal(codexManifest.version, packageJson.version);
  assert.equal(await bundledRunnerHelpFromForeignCwd(), 0);
  assert.equal(await canonicalSkillMatchesBothBundles(), true);
  await assert.rejects(packageIntoSourceTree(), /output/i);
  ```
  Assert no host credentials, Git history, source test fixtures, or bootstrap hooks are included; no shell-only packaging dependency or symlink requirement on Windows. Run `node --test tests/packaging.test.mjs`; expect missing manifests/bundler.
- [ ] **Step 3: Implement the packaging and installation docs.** Use version `0.1.0` consistently. Bundle by copying an explicit allowlist; derive skills/runner paths from the installation root. Provide local install steps that match inspected host versions and a documented local-skill fallback where necessary, without pretending it is a marketplace installation. Add prerequisites, quick start, all CLI verbs/plan fields, approvals, clean-checkout limits, setup/dependency consent, source isolation vs sandboxing, inherited environment caveats, local logs/provider privacy, partial failures, resume, safe cleanup, and explicit integration verification status. Marketplace publication remains deferred.
- [ ] **Step 4: Verify GREEN and smoke-test available hosts.** Run packaging tests, `npm test`, `npm pack --dry-run`, and a bundled CLI smoke test from a temporary unrelated cwd. If permitted by installed host capabilities/authentication, load the plugin in Claude Code and confirm skill discovery plus a bounded sample invocation. Do not trigger paid model calls without consent. Mark Codex and any unexercised Claude workflow as unverified; structural validation alone is not compatibility proof.
- [ ] **Step 5: Commit** with `feat: package local Claude Code and Codex integrations`.

## Task 10: Reproducible sample exercise and cross-platform release checks

**Files:** Create `examples/checkout/checkout.mjs`, `examples/checkout/checkout.test.mjs`, `examples/checkout/exercise.json`, `examples/checkout/README.md`, `tests/e2e.test.mjs`, `.github/workflows/test.yml`; update `docs/verification.md` and usage examples.

**Interfaces:** The example is a dependency-free module, copied to a temporary committed repository by e2e tests. The test simulates the host's edits between CLI stages; it must not imply the runner writes solutions or invokes an AI. Example plan references actual fixture files and exact CLI schema.

- [ ] **Step 1: Write failing e2e tests.** Cover `known boundary omission is demonstrated without altering source`, `three cumulative requirements complete`, and `failed or invalid exercise still reports and cleans safely`:
  ```js
  assert.equal(failedReport.challenges[0].outcome, 'failed');
  assert.equal(completedReport.challenges.filter(c => c.outcome === 'passed').length, 3);
  assert.equal(completedReport.status, 'completed');
  assert.deepEqual(await source.snapshot(), before);
  assert.equal(await experimentalWorktreeExistsAfterCleanup(), false);
  assert.equal(await finalEvidenceExists(), true);
  ```
  Fixture scenario: initial checkout handles a single valid item; approved successive challenges cover multiple items/empty-cart rules, nonnegative monetary totals with defined rounding, and idempotent order recording without duplicating prior behavior. Acceptance tests are written/frozen before each simulated implementation; regressions remain cumulative. Include a deliberate first-round omitted edge case that fails twice and stops; a second success run satisfies all requirements.
- [ ] **Step 2: Verify RED.** Run `node --test tests/e2e.test.mjs` against the existing CLI; expect missing fixtures or unsatisfied scenario assertions, not a model API/network dependency.
- [ ] **Step 3: Implement sample and CI.** Keep the initial sample intentionally small and document its exercise limitations. Add a GitHub Actions matrix for Node 22 and 24 on `ubuntu-latest`, `windows-latest`, and `macos-latest`, running syntax checks, `npm test`, and packaging checks with no runtime dependency installation. Test Git fixture identity is local; no CI secret or service is required. Record which CI checks actually ran, not merely which workflow was authored.
- [ ] **Step 4: Verify GREEN and release evidence.** Run `npm run check`, `npm test`, `npm pack --dry-run`, both local bundle builds into fresh temporary directories, and the documented CLI example. Inspect `git diff --check` and `git status --short`. Record Node/Git/OS versions, observed test results, timeout/child-process limitations, skill behavioral validation, and host smoke-test results in `docs/verification.md`. Do not claim macOS/Linux or Codex success without executed results.
- [ ] **Step 5: Commit** with `test: exercise evolution workflow and cross-platform delivery`.

## Self-review and handoff tracking

- [x] Spec coverage: prerequisites/isolation Tasks 1–3; approvals/execution Task 4; cumulative challenges/stop rules Task 5; evaluation/evidence/reporting Task 6; invocation/resume/cleanup Task 7; relevance/calibration Task 8; integrations/install Task 9; sample/OS verification Task 10.
- [x] Step scan: signatures, test assertions, commands, and file paths identify checkable actions without writing implementation bodies.
- [x] Type consistency: clarified persistent round outcomes, report status after cleanup, acceptance prechecks, and amendment attempt accounting.
- [x] Review focus: all five listed conditions have tests in their owning tasks.
- [x] Proportion: a small CLI and one canonical skill; no unrelated subsystem or provider service.
- [ ] Human review of this plan and selection of an available execution method.

No implementation has been started. In this session there is no subagent tool, so native execution through `executing-plans` is the available method. A fresh independent whole-branch review requires an additional reviewer/tool; if unavailable, disclose that limit and perform self-review rather than claiming independent review.
