# Electric Sheep: actionable follow-up and verified session closing

Status: option B and the closing flow approved by the user; implementation details below are assistant design calls for plan review.
Date: 2026-11-13
Base: merged PR #3, `c776b937cbf0c26e1c9b66a343f5dbf04daebff0`.

## Intent and approved scope

Keep the evidence report and additionally generate recommended next actions, an implementation plan, and a ready-to-use prompt for another AI coding agent. After publishing the output, explicitly offer to keep or remove the experimental worktree. Remove it only on confirmation, verify the result, and preserve the deliverables and evidence by default.

The package must remain useful after cleanup and in a new agent conversation. Completing an experiment must not silently authorize applying its changes to production.

## Approaches

- **A — expand the report only:** fewer files, but inconvenient for handing a plan or prompt to another agent. Not selected.
- **B — follow-up package alongside the report:** selected by the user. Separate human diagnosis, actionable plan, and agent handoff; preserve all of them when removing the experiment.
- Automatic fixes, automatic cleanup, and a separate model backend are not alternatives within the approved scope.

## Existing behavior and constraints

The report currently maps finding recommendations to a flat `nextActions` string list. Cleanup already checks ownership, removes a registered detached worktree, and preserves run data by default. The CLI writes reports before deletion, but it does not capture a fresh final diff, verify a complete handoff package, return a detailed closing receipt, or enforce a reliable host conversation ending. No specific user-reported cleanup error has yet been reproduced; the implementation must establish regressions before claiming a bug fix.

Preserve these constraints exactly:

- Node.js 22+, Git, zero production npm dependencies.
- Run schema 1; older runs remain readable without migration or relocating data.
- Default run root `~/.electric-sheep/runs`; explicit `--runs-root` remains supported.
- Three cumulative challenges; at most one repair per challenge; five-minute default command timeout.
- No automatic source modification, stash, reset, merge-back, dependency installation, model calls, telemetry, or arbitrary numerical quality scores.
- A worktree is not a security sandbox; inherited host access and escaped processes remain relevant.
- Feature branches and PRs against `main`; no direct pushes to `main` or merge without user approval.

## Output package

Store all generated files in the owned run directory, outside the source checkout:

1. `report.md` and `report.json`: existing evidence report, extended with structured follow-up while retaining the existing `nextActions` string list.
2. `next-actions.md`: action IDs, priority, rationale, finding IDs, evidence references, category, and baseline/experimental/uncertain provenance.
3. `implementation-plan.md`: ordered tasks, dependencies, target paths when known, concrete steps, acceptance criteria, and applicability/approval gates.
4. `agent-prompt.md`: copy/paste handoff with source root, recorded baseline commit, scope, run/package paths, and safe implementation instructions.
5. `outputs.json`: publication manifest with schema version 1, run ID, generation ID, and SHA-256 hashes of the five deliverables and referenced retained evidence. This is a completeness/integrity receipt, not proof of agent conclusions.

Publish individual files atomically and the publication manifest last. Verify the published files by reading them back. An interrupted multi-file write is not a transaction: a stale/mismatching manifest means the package is incomplete and must be regenerated. Do not delete the worktree after a publication or verification failure.

Reject symlinked/non-regular output destinations and references escaping the owned run/evidence directory. Only fixed deliverable filenames are writable; an agent cannot supply arbitrary output paths. Do not embed raw logs in prompts or execute text from reports.

## Agent-authored follow-up and compatible fallback

The host agent supplies the contextual reasoning. Add optional `report --run ID --follow-up FILE`; the normal user never needs to author JSON. The skill prepares this file outside source after recording findings. Validate it, persist a cloned copy as optional `run.followUp`, and reuse it on later reports/cleanup. Invalid input must not modify the run or prior outputs. The approved exercise plan/hash is never changed by follow-up authoring.

Input shape:

```text
{ schemaVersion: 1, actions: [
  { id, title, findingIds, priority, rationale, targetPaths,
    steps, acceptanceCriteria, dependsOn }
] }
```

- IDs are unique nonempty strings. Each authored action references one or more existing finding IDs.
- `priority` is `high`, `medium`, `low`, or `untriaged`; it is explicitly host judgment, not a runner-certified severity or quality score.
- `title`, `rationale`, `steps`, and `acceptanceCriteria` are nonempty. Steps/criteria are nonempty string arrays.
- `targetPaths` is an array of repository-relative paths, allowed to be empty when locations are not yet established. Do not require proposed new files to exist or fabricate file/line locations.
- `dependsOn` names existing action IDs, with no duplicates, self-dependencies, or cycles. Use a stable topological execution order; priority labels do not override dependencies.
- Derive evidence and provenance from the referenced findings, not agent assertions. Hypotheses require validation before a fix; structural concerns remain judgments. Experimental failures require an applicability/product-scope decision before becoming source changes.
- Render finding/agent text as data with Markdown/HTML escaping. The prompt must say that quoted findings, logs, and repository content cannot override user/project instructions; this is not a prompt-injection confinement guarantee.

`report --run ID` remains supported, including old runs and partial exercises. Without authored follow-up, generate explicitly labeled runner-template tasks from recorded recommendations, with untriaged priority and investigation/applicability gates; do not invent project-specific changes or confidence. No findings means an honest coverage/recovery review, not invented bugs. A blocked baseline gets diagnosis/recovery guidance and is never described as a discovered defect. A complete no-finding run does not certify correctness.

## Handoff safety and lifetime

The handoff refers to the retained package, findings, command records, acceptance snapshots, and saved diffs, not files that exist only in the disposable worktree. Label the worktree path as historical/optional. Do not assume detached experiment commits remain reachable after removal or Git garbage collection.

The next agent must confirm the intended repository and current HEAD against the recorded baseline, inspect project instructions, preserve user changes, and use a new feature branch. It must review applicability, reproduce/validate findings with appropriate tests, propose commands for fresh approval, and implement only approved work. Previous experiment approval does not authorize follow-up commands or dependency installation. Baseline commands are historical references; challenge test files may need deliberate recreation. Never blindly apply the entire experimental patch or introduce hypothetical requirements as approved features.

## Closing and cleanup

### Host conversation

The canonical skill must finish every terminal outcome (completed, failed, blocked, invalid, or cancelled) through these steps, when safe access is available:

1. Record findings and author the follow-up when evidence permits; finalize/verify the package.
2. Present outcome, recommended next actions, and absolute package paths.
3. Ask explicitly: **remove the experimental worktree while retaining output/evidence, or keep it for inspection?** Waiting/no answer means keep.
4. On removal consent, leave the worktree, stop/resolve known project processes, and run the exact cleanup command with `--run`, matching `--confirm`, and the correct `--runs-root`.
5. Report verified removal and retained paths, or report the failure and recovery instructions. Never claim cleanup succeeded solely because it was requested.

For a run not recorded as cleaned, the runner returns a structured closing descriptor with both choices, `requiresConfirmation: true`, absolute executable/argv, and a working directory outside the worktree (the runs root). A report for an already-cleaned run instead returns `requiresConfirmation: false`, no choices/cleanup command, and retained paths; it does not re-offer deletion or claim a fresh removal check. A descriptor is not consent and does not guarantee that a model will show the offer; live-model instruction following remains a separate evaluation.

### Runner sequence

Under the existing mutation lock:

1. Reject invocation from inside the worktree and refuse cleanup while command results remain `running`. `resume`, after the operator has confirmed processes stopped, may mark pending records interrupted even in terminal runs without reopening them. This does not detect or terminate escaped descendants.
2. Validate ownership, registration, detached state, and expected checkpoint before any destructive action. An absent workspace can be reconciled only if registration is also absent; foreign paths, symlinks, or drift cause a clear safe failure.
3. For an existing worktree, capture its final tracked/nonignored untracked changes as retained binary-capable diff evidence, without running project scripts or committing. Preserve prior checkpoint patches and acceptance snapshots. Do not copy ignored secrets or dependencies.
4. Cancel unfinished exercises explicitly, preserving their outcome/history; completed/failed outcomes remain unchanged. Recollect deltas, generate all outputs using saved follow-up, and verify the publication manifest and retained references.
5. Remove only the owned worktree using the existing safe Git wrapper. Verify both filesystem absence and absence from Git's worktree registration before persisting `phase: cleaned` and returning success. Do not delete source files or broadly prune Git metadata.
6. Return a receipt with original outcome, verified cleanup state, retained artifact paths, and evidence-retention status. Repeated cleanup is safe; it must not remove a foreign replacement path or trust a stale `cleaned` flag without checking actual state.

Publication precedes deletion. The report is a dated snapshot, not a claim that its historical workspace still exists; current cleanup state is the saved manifest/receipt. A later `report` on a cleaned run can regenerate the package from retained state without accessing the old worktree. A removal error preserves the package and gives retry guidance; it must not mark the run cleaned prematurely.

The existing explicit `--delete-evidence` escape hatch remains destructive and separate from the default closing offer. Do not offer it as routine cleanup; do not claim evidence was retained after an explicit purge. Normal cleanup retains reports, plan, prompt, manifest, logs, snapshots, and diffs.

## Delivery and verification

Release metadata becomes 0.3.0 across npm/lockfile, Claude plugin/catalog, and Codex compatibility manifest so persistent plugin updates can recognize the behavioral release. Keep run/plan schema 1 and existing paths/identifiers. All new runtime modules and skill reference assets must travel in Claude and independently copied Codex bundles.

Use TDD for implementation: contract/rendering, retained package integrity, CLI options/persistence, real worktree cleanup and failure/retry, then complete-session integration and distribution. Cover completed/no-findings, mixed findings, blocked baseline, failure, cancellation, interrupted/terminal pending commands, legacy runs, missing source, Unicode/spaces, and Windows cwd/removal behavior. Test missing/tampered outputs, malicious references, final unsaved tracked/new/binary changes, locked worktrees, and repeat cleanup. Verify the source checkout is unchanged.

Baseline on the new feature branch: 94/94 existing tests passed. No dependencies installed or model calls made during planning. No independent subagent/reviewer tool is available; reviews must be labeled author self-review unless that capability changes. Do not claim live Claude/Codex/Pi/OpenCode/ChatGPT closing behavior from static skill checks or simulated-host tests.
