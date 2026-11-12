# CLI usage

Run `node /absolute/path/to/electronic-sheeps/bin/electronic-sheeps.mjs --help`, or use the plugin's skill-relative `scripts/run.mjs`. No runtime install/build is needed. Node 22+ and Git must already exist.

## Commands

All commands accept `--runs-root PATH`, defaulting to `~/.electronic-sheeps/runs`. Keep this outside the source repository. Successful operational output is JSON; diagnostics use stderr. Exit codes: 0 successful operation/checks; 1 blocked, failed, invalid, interrupted exercise or operational failure; 2 usage/JSON input error. A first failed evaluation returns 1 even though one repair remains. `freeze` may return 0 with an expected failing pre-implementation check: that is not an implementation pass.

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
| `report` | `--run ID` | Save `report.md` and `report.json`; read-only with respect to project code |
| `resume` | `--run ID` | Validate checkpoint/artifacts and mark pending commands interrupted, never passed |
| `recover-lock` | `--run ID --approval-note TEXT` | Explicit recovery only after confirming old processes stopped |
| `cancel` | `--run ID --note TEXT` | Record terminal cancellation |
| `cleanup` | `--run ID --confirm ID` | Cancel unfinished work, save evidence/report, remove only the owned worktree |

`cleanup --delete-evidence` additionally deletes the entire owned run including reports. This is explicit and destructive. Default cleanup retains reports and logs. No broad `git clean` or `prune` is used.

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

Reports contain scope/baseline/environment limits; per-challenge requirements and evidence; regressions and structural deltas; attributed findings; next actions; resume/cleanup. Structural measurements are text-file Git deltas, not semantic complexity scores. Generated/binary files are excluded. Interpretation remains the agent's judgment, not a runner-certified quality verdict.

## Safety, privacy, and supported inputs

Target inputs require an initial Git commit and a clean index/worktree including no untracked files. Ignored files are not copied, including `.env`, ignored dependencies, and local build outputs. Commit only appropriate source yourself; never commit secrets to satisfy this restriction. Non-Git targets, dirty snapshots, submodules, and Git filter/LFS materialization are unsupported in v1.

**A worktree isolates source changes, not the host machine.** Git metadata/objects are shared; runner-owned commits are detached, use a local experiment identity, and never push. Runner Git mechanics disable hooks/signing/fsmonitor; approved project scripts can still execute arbitrary code. Host tools are not confined by the runner. Source instructions, host permissions, external services, inherited environment credentials, network use, and safe dependency setup need review. No credentials are copied deliberately and no production services are used by default, but there is no comprehensive environment scrubbing or network blockade. Use a sandbox for untrusted code.

Logs/evidence are local and can contain secrets. Do not publish automatically. The host model continues using its own provider/privacy policy. Timeouts apply to runner commands, not model token spend or every host tool. Windows termination uses a PID-specific process-tree request; POSIX uses a process group and escalation. Neither confines arbitrary descendants that detach or escape.

## Local packaging

```bash
node scripts/package-local.mjs --host claude --out ../electronic-sheeps-claude
node scripts/package-local.mjs --host codex --out ../electronic-sheeps-codex
```

Use fresh output directories outside the source tree. Packaging copies an allowlist, not repository history/settings/tests/credentials. Claude Code: `claude --plugin-dir /absolute/path/to/bundle`; use `/electronic-sheeps:evolution-stress-test TARGET`. Codex: copy the generated complete skill into an unused `~/.agents/skills/evolution-stress-test`, restart if necessary, invoke `$evolution-stress-test TARGET`. On PowerShell, `Copy-Item -Recurse "<bundle>/skills/evolution-stress-test" "$HOME/.agents/skills/evolution-stress-test"` after creating the parent. Do not overwrite an existing skill without reviewing it.

The Codex generated skill has an embedded runtime so a standalone copy works without symlinks or guessing a sibling installation path. Do not copy only the source `SKILL.md`. Marketplace submission and live host compatibility are not implied; consult [verification](verification.md).
