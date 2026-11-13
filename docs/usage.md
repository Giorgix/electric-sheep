# CLI usage

Run `node /absolute/path/to/electric-sheep/bin/electric-sheep.mjs --help`, or use the plugin's skill-relative `scripts/run.mjs`. No runtime install/build is needed. Node 22+ and Git must already exist.

## Persistent Claude installation

Inside Claude Code, run `/plugin marketplace add Giorgix/electric-sheep`, then `/plugin install electric-sheep@electric-sheep`. The shell shortcut on current Claude versions is:

```bash
claude plugin install electric-sheep --marketplace Giorgix/electric-sheep
```

This uses the repository's self-hosted catalog and defaults to user scope. Start a fresh Claude session in your target project and invoke `/electric-sheep:evolution-stress-test TARGET`; no `--plugin-dir` is needed after installation. Refresh with `claude plugin marketplace update electric-sheep`, update with `claude plugin update electric-sheep@electric-sheep`, and restart Claude. Uninstall with `claude plugin uninstall electric-sheep@electric-sheep`; experimental worktrees/evidence require the runner's separate explicit cleanup.

Use a real terminal for interactive Claude. A tool-run process with captured stdout may enter print mode; give `claude --print` an explicit prompt for a noninteractive response. Print mode is not the exercise's approval conversation and should be used only in a trusted project. See the [installation walkthrough](../README.md#claude-code-persistent-github-installation).

## Commands

All commands accept `--runs-root PATH`, defaulting to `~/.electric-sheep/runs`. Keep this outside the source repository. Successful operational output is JSON; diagnostics use stderr. Exit codes: 0 successful operation/checks; 1 blocked, failed, invalid, interrupted exercise or operational failure; 2 usage/JSON input error. A first failed evaluation returns 1 even though one repair remains. `freeze` may return 0 with an expected failing pre-implementation check: that is not an implementation pass.

| Verb | Required options | Meaning |
|---|---|---|
| `inspect` | `--repo PATH`, optional repeatable `--scope PATH` | Read-only clean-source prerequisites; scope defaults to `.` |
| `start` | `--repo PATH --plan FILE --approval-note TEXT` | Record consent and create a detached worktree; no project commands yet |
| `baseline` | `--run ID` | Run approved setup/checks and preserve baseline acceptance artifacts |
| `freeze` | `--run ID` | Snapshot current challenge tests and run pre-implementation checks |
| `evaluate` | `--run ID` | Run current and earlier regressions, then checkpoint a passing round |
| `amend` | `--run ID --plan FILE --approval-note TEXT` | Preserve prior approval/tests/results; explicitly amend before evaluation |
| `finding` | `--run ID --file FILE` | Add attributed, evidence-linked agent interpretation |
| `status` | `--run ID` | Read saved state without executing project code |
| `report` | `--run ID`, optional `--follow-up FILE` | Publish/verify report, next actions, implementation plan, agent prompt and hash manifest; no project execution |
| `resume` | `--run ID` | Validate checkpoint/artifacts and mark pending commands interrupted, never passed |
| `recover-lock` | `--run ID --approval-note TEXT` | Explicit recovery only after confirming old processes stopped |
| `cancel` | `--run ID --note TEXT` | Record terminal cancellation |
| `cleanup` | `--run ID --confirm ID` | Snapshot final changes, cancel unfinished work, verify output, remove only the owned worktree and verify actual absence |

`cleanup --delete-evidence` additionally deletes the entire owned run including reports, follow-up plan and prompt. This is explicit and destructive, not the normal session-ending offer. Default cleanup retains the complete package, logs, acceptance snapshots and diffs. No broad `git clean` or `prune` is used. Run cleanup from outside the worktree; for full evidence deletion also stay outside the run directory.

## Existing runs after a rename

New runs use the current default storage directory. Upgrading does not move or delete earlier run directories. To inspect, resume, report, or clean up a schema-1 run stored elsewhere, pass its existing runs directory explicitly:

```bash
node /absolute/path/to/electric-sheep/bin/electric-sheep.mjs status --run ID --runs-root /absolute/path/to/previous/runs
```

Use the directory containing the run-ID folders, not an individual run folder. Keep that location unchanged; ownership records contain absolute paths.

## Plan JSON

See [the complete checkout plan](../skills/evolution-stress-test/references/plan.example.json). Fields:

- `schemaVersion`: exactly `1`.
- `scope`: nonempty array of existing repository-relative paths.
- `commands`: unique `id`, `executable`, literal string-array `args`, `purpose` (`setup` or `check`), optional relative `cwd` (default `.`), and optional positive integer `timeoutMs` (default `300000`, maximum `2147483647`). No automatic shell expansion or environment overrides. An explicitly approved shell executable is possible but must be reviewed as such. On Windows, `.cmd` commands require an explicitly approved command processor; prefer executable files such as `node` where possible.
- `setupCommandIds`: setup commands the user explicitly approved, often empty. No automatic installation.
- `baselineCommandIds`: nonempty check-command IDs.
- `baselineProtectedPaths`: nonempty file/directory selections; baseline tests, configuration, and fixtures worth protecting. Each directory selection must contain regular files. Symlinks/escaping selections are rejected.
- `coverage`: `existing` or `limited`; `coverageNote` is required for limited coverage. The runner cannot infer assertion quality from an arbitrary external test framework: the agent must inspect actual tests and disclose limited coverage. An empty green command is not useful proof.
- `challenges`: exactly three ordered objects with unique `id`, `requirement`, `rationale`, nonempty `constraints`, `protectedPaths`, `commandIds`, and `stopCondition`. Add each challenge's acceptance files in the worktree before `freeze`; no production edit first. Prefer separate new test files to avoid modifying prior protected files.
- `exclusions`: generated-file relative paths/prefixes excluded from structural metrics, not glob patterns and not test-skip rules.
- `host`: actual coding host name; `roleSeparation`: `single-agent`, `separate-agents`, or `unknown`. Never claim separate agents without them.

Approve commands, requirements, setup, and timeouts together before project execution. Save the plan outside source so it does not make the required clean checkout dirty. Approval notes document consent conveyed by the coding host; they are not an authenticated security boundary against it.

## State and repairs

A run progresses `prepared` → `baseline` → `ready` → `challenge` → `ready` (next round) → `completed`. Each challenge allows two evaluations total: initial implementation and one repair. Earlier tests run every time. A failed baseline is blocked, not a discovered defect. A second failed evaluation stops, leaving later rounds not run. An acceptance hash change invalidates the exercise; it cannot be silently approved afterward.

An approved amendment before evaluation retains old approvals/artifacts, rechecks the baseline, and requires refreezing. Spent attempts remain spent. It cannot erase history, replace passed requirements, change setup/scope, or reopen terminal exercises. Changed setup/scope or an invalid/failed terminal run requires a new exercise. Historical files and previous failure results remain in evidence.

After a crash, inspect `status`, confirm old processes have stopped, explicitly recover a stale lock if necessary, and then `resume`. Unknown outcomes become interrupted. An interrupted evaluation consumes its attempt; an interrupted setup is not silently rerun. Unexplained checkpoint/test drift invalidates the run instead of resetting files. Hard-killed host processes may leave descendants: the runner does not claim to detect or stop all of them during later resume.

## Findings and reports

A finding JSON object has `id`, `category`, `origin`, `impact`, `summary`, `evidenceRefs`, and `recommendation`. Categories: `defect`, `evolution-friction`, `maintainability-concern`, `hypothesis`. Origins: `baseline`, `experimental`, `uncertain`. References must be existing run-relative `evidence/` files, obtained from command records or diff/artifact events. Defects need failed-check evidence; structural concerns need code/diff evidence. Hypotheses may have no executed evidence but stay explicitly unproven.

Reports contain scope/baseline/environment limits; the approved plan and executable/argv/cwd/timeout inventory; per-challenge requirements and evidence; regressions and structural deltas; attributed findings; next actions; resume/cleanup. Each executed command also records its exact specification so later approved command amendments do not obscure historical execution. Structural measurements are text-file Git deltas, not semantic complexity scores. Generated/binary files are excluded. Interpretation remains the agent's judgment, not a runner-certified quality verdict.

### Actionable follow-up input

The host agent authors the input; ordinary users only review the output and approve any further work. See the [example and contract](../skills/evolution-stress-test/references/follow-up.md). After recording findings:

```bash
node /absolute/path/to/electric-sheep/bin/electric-sheep.mjs report --run ID --follow-up /absolute/path/to/follow-up.json --runs-root /absolute/path/to/runs
```

Input uses `schemaVersion: 1` and an `actions` array. Each action needs unique `id`, `title`, one or more existing `findingIds`, `priority` (`high|medium|low|untriaged`), `rationale`, repository-relative `targetPaths` (empty if unknown), nonempty string arrays `steps` and `acceptanceCriteria`, and `dependsOn` action IDs. Unknown findings/dependencies, cycles, escaping paths, or malformed input are usage errors (exit 2) without modifying run state or previous outputs. Priorities are agent judgments; categories/origins/evidence and mandatory gates are derived from findings. New proposed files need not already exist.

Validated input is saved as optional `run.followUp`, separate from the approved exercise plan. Later reporting and cleanup reuse it; source schema-1 runs need no migration. A plain `report --run ID` remains available. Without authored input it produces a labeled runner-template draft with untriaged priorities and no fabricated file locations. No findings means coverage/recovery guidance, not invented defects; a blocked baseline needs diagnosis before implementation.

### Output verification and closing

A successful report returns absolute `jsonPath`, `markdownPath`, `nextActionsPath`, `implementationPlanPath`, `agentPromptPath`, and `outputManifestPath`. These point to `report.json`, `report.md`, `next-actions.md`, `implementation-plan.md`, `agent-prompt.md`, and `outputs.json` in the owned run directory. `outputs.json` is published last and hashes the five deliverables plus referenced retained evidence. Files are individually atomic, not a multi-file transaction: missing/mismatched data means incomplete publication, not a usable verified package. Repair the problem and rerun report. Hashes record file integrity, not the truth of agent conclusions.

For non-cleaned runs the response also contains `closing.requiresConfirmation: true`, `choices: ["remove-worktree", "keep-worktree"]`, retained paths and a `cleanup` object with absolute `executable`, literal `args`, and outside-worktree `cwd`. The host must first present the package and explicitly ask which choice the user wants. No answer means keep; receiving a descriptor is not consent. A report for a recorded cleaned run has no cleanup command/choices and makes no fresh removal claim.

After explicit removal approval, stop known project processes and execute the returned command from the returned cwd. Cleanup refuses `running` result records; after confirming processes stopped, use `resume` to mark pending results interrupted (including terminal runs, without reopening them). It cannot detect or stop arbitrary escaped descendants. Stop concurrent edits during closing.

Default cleanup saves a final binary-capable diff of tracked/nonignored new changes, preserves earlier checkpoint patches and acceptance snapshots, regenerates/verifies all outputs, and only then removes the verified owned worktree. Ignored files such as credentials/dependency directories are not copied. A successful receipt contains `verified: true`, `phase: cleaned`, original `outcome`, `evidenceDeleted: false`, and retained paths. Both filesystem and Git registration absence are checked. Windows junction residue is removed only under the already validated owned path; nested link targets are not followed.

Failures preserve available output/worktree data and must not be presented as success. For a locked worktree, inspect why it is locked and resolve the specific lock only with appropriate approval, then retry the same confirmed command. For cwd errors, leave the worktree first. For output/evidence errors, repair/regenerate before retrying. For ownership, registration, checkpoint, or missing-source mismatches, stop for manual inspection; do not adopt foreign paths or broadly prune metadata. Repeated cleanup is idempotent but refuses a foreign path recreated at the old workspace location.

The report is a historical snapshot; current cleanup state is in status/the receipt. Reports can be regenerated after cleanup from retained state without the old worktree. The handoff tells the next agent to verify the package, review repository/HEAD drift, use a new feature branch, reproduce applicable findings and seek fresh command/dependency approval. It must not rely on surviving detached commits or blindly apply experimental patches. Explicit `--delete-evidence` instead removes the entire run and returns no retained paths.

## Safety, privacy, and supported inputs

Target inputs require an initial Git commit and a clean index/worktree including no untracked files. Ignored files are not copied, including `.env`, ignored dependencies, and local build outputs. Commit only appropriate source yourself; never commit secrets to satisfy this restriction. Non-Git targets, dirty snapshots, submodules, and Git filter/LFS materialization are unsupported in v1.

**A worktree isolates source changes, not the host machine.** Git metadata/objects are shared; runner-owned commits are detached, use a local experiment identity, and never push. Runner Git mechanics disable hooks/signing/fsmonitor; approved project scripts can still execute arbitrary code. Host tools are not confined by the runner. Source instructions, host permissions, external services, inherited environment credentials, network use, and safe dependency setup need review. No credentials are copied deliberately and no production services are used by default, but there is no comprehensive environment scrubbing or network blockade. Use a sandbox for untrusted code.

Logs/evidence are local and can contain secrets. Do not publish automatically. The host model continues using its own provider/privacy policy. Timeouts apply to runner commands, not model token spend or every host tool. Windows termination uses a PID-specific process-tree request; POSIX uses a process group and escalation. Neither confines arbitrary descendants that detach or escape. After a timeout/signal the runner allows a two-second termination grace, then releases inherited pipes if necessary and marks output incomplete instead of waiting indefinitely. Escaped descendants may still need manual cleanup.

## Local packaging

```bash
node scripts/package-local.mjs --host claude --out ../electric-sheep-claude
node scripts/package-local.mjs --host codex --out ../electric-sheep-codex
```

Use fresh output directories outside the source tree. Packaging copies an allowlist, not repository history/settings/tests/credentials. Claude Code: `claude --plugin-dir /absolute/path/to/bundle`; use `/electric-sheep:evolution-stress-test TARGET`. Codex: copy the generated complete skill into an unused `~/.agents/skills/evolution-stress-test`, restart if necessary, invoke `$evolution-stress-test TARGET`. On PowerShell, `Copy-Item -Recurse "<bundle>/skills/evolution-stress-test" "$HOME/.agents/skills/evolution-stress-test"` after creating the parent. Do not overwrite an existing skill without reviewing it.

The Codex generated skill has an embedded runtime so a standalone copy works without symlinks or guessing a sibling installation path. Do not copy only the source `SKILL.md`. The Claude bundle also contains the self-hosted marketplace catalog; official marketplace submission and live model behavior are not implied. Native Codex marketplace installation is not claimed; consult [verification](verification.md).
