# Electric Sheep 0.4.0: priority selection and portable export

Status: short adoption design approved by the user ("ys"); this document records that scope. Implementation-plan review remains required before runtime changes.
Date: 2026-11-13.
Base: merged `main`, `e451b5110d8878da60a181122db087a5ae455606`.

## Intent and approved approach

Promote all three successful self-exercise changes into opt-in product features: priority-selected follow-up views, dependency-aware selection, and a portable handoff archive. Preserve the experiment's 25 acceptance tests and existing behavior; update usage/distribution documentation and release metadata to 0.4.0. Open a feature PR against main and leave it unmerged.

Approaches considered: (A) reviewed replay of the retained patches and tests, recommended and approved; (B) rewrite or speculative hardening, not selected because it discards tested behavior or silently expands scope. Review and reproduce integration defects before fixing them. No automatic streaming implementation, new size limit, permissive alias policy, or new host-driven export workflow is approved.

The retained run is `d9a3b3f6-2d82-475d-a441-7839e0c86ce9`. Its baseline `1e5f1d2` has the same file tree as current main. The three incremental checkpoint patches add five runtime files/changes and three test files; all 182 tests passed in the Windows/Node 22 exercise with zero repairs. This is provenance, not current-branch verification or proof of production correctness.

## Global constraints

- Node.js 22+, Git, zero production npm dependencies.
- Run/plan schema 1; existing runs remain readable without migration or relocating data.
- Default run root `~/.electric-sheep/runs`; explicit `--runs-root` remains supported.
- Three cumulative challenges; at most one repair per challenge; five-minute default command timeout.
- Preserve canonical `evolution-stress-test` skill and `electric-sheep` package/CLI identities.
- Release 0.4.0 across package/lock root versions, Claude plugin/catalog and Codex compatibility manifest.
- No automatic source stash/reset/commit, merge-back, telemetry, model backend, numerical quality scores, uploads or dependency installation.
- No local dependency installation without separate approval; reuse existing pinned development Prettier 3.6.2. Remote CI retains the repository's existing `npm ci --ignore-scripts` workflow and pinned development dependency.
- Feature branches and PRs against `main`; no direct pushes to `main` or merge without user approval.
- Preserve the original checkout's untracked documents, installed runner, and retained exercise evidence.
- A worktree is not a security sandbox; inherited host access, escaped processes and concurrent external edits remain relevant.

## Selection contract

`report --run ID [--follow-up FILE] [--priority VALUE ...] [--runs-root ROOT]` accepts repeatable priorities `high|medium|low|untriaged`; duplicate options are deduplicated. Invalid values are usage errors (2), without saving authored input or changing prior output. Omission preserves the full legacy view.

Validate the complete authored dependency graph before selection. Selected actions include every transitive prerequisite, regardless of priority, once and in existing stable dependency order. Keep complete report findings, legacy nextActions strings, saved run.followUp and approved exercise plan intact. Selection is per invocation; it is not a persistent deletion/edit of authored actions.

A selected FollowUp adds `selection: { priorities, dependencyIds }` and explanatory notes. Render selection and prerequisite reasons in plan/prompt; an empty view says no actions matched, not that no findings exist. Preserve derived evidence, provenance, uncertainty and fresh-approval gates. Templates/no-findings remain honest.

## Portable export contract

`export --run ID --out DIRECTORY [--priority VALUE ...] [--runs-root ROOT]` operates under the existing mutation lock but does not modify the source run manifest or original publication. Require an already valid source publication; do not re-hash corrupt evidence to make it pass.

The archive contains `report.json`, `report.md`, `next-actions.md`, `implementation-plan.md`, `agent-prompt.md`, `outputs.json`, and required `evidence/` files. Preserve the complete report/findings and copy all evidence referenced by the complete retained package, not merely selected actions. Do not copy the whole worktree, ignored files or unrelated evidence. **Selection is not redaction**: reports/logs may contain sensitive information and require review before sharing. No automatic upload/sharing.

Operational package/plan/evidence links are relative and remain usable after relocation, fixture-worktree cleanup and loss of the original fixture run directory. Keep source repository/baseline/command metadata as explicitly historical context. An archive is data, not an owned runnable run: no owner marker, new cleanup offer, or automatic experiment replay.

Destination policy deliberately matches the tested experiment:
- Require an absent destination and an existing physical/canonical parent; compare case-insensitively on Windows.
- Refuse existing files, empty/nonempty directories, destination aliases/escaping parents, and locations inside the source repository or runs root.
- Create the destination exclusively, write evidence/deliverables exclusively, publish outputs.json last, then read back and verify.
- Reject missing/changed source evidence and escaping references. On later I/O failure return an error and retain the partial directory for inspection; do not claim success, silently overwrite it, or automatically remove arbitrary paths.

The existing owned verifier keeps ownership checks. A separate `verifyPortableBundle(directory, expectedRunId?)` verifies fixed files, manifest identity when supplied, evidence containment and hashes without requiring the old owner/location. Hashes establish consistency, not authenticity or correctness of findings.

## Runtime boundaries

- `src/follow-up.mjs`: validatePriorities and pure selection/dependency closure.
- `src/report.mjs`: optional priorities in buildReport/writeReports; shared evidenceReferences and reportContents.
- `src/outputs.mjs`: preserve owned write/verify facade; expose portable verification and validated evidence reads.
- New `src/export.mjs`: destination policy, verified source reads, archive publication and receipt.
- `src/cli.mjs`: optional repeatable priority option, report/export dispatch, usage errors.
- Preserve execution/protocol/workspace/store mechanics; no new backend or production dependency.

## Documentation, distribution and verification

Describe the new CLI options and opt-in usage without changing the canonical three-round/consent/closing workflow. Publish reference documentation with both bundles. Keep default retention, historical-worktree warnings, fresh follow-up approval and the separate destructive purge distinction.

Replay tests before implementation to observe RED on current main, then restore source patches in order and verify GREEN. Add focused compatibility tests for fallback/empty selection, owned-vs-portable verifier boundaries and incomplete/foreign archives. Exercise the actual independently copied skill's priority/export operation from an unrelated spaced/Unicode cwd after its original bundle is removed, including verification after fixture cleanup.

Run full tests, syntax, formatting, package contents, strict Claude catalog/plugin validation and actual Ubuntu/Windows/macOS × Node 22/24 CI. Reproduced failures get regressions; preserve existing checks. No independent reviewer tool is available: author review must be labeled as such; copied-runtime tests do not establish live host instruction-following.

## Explicitly unproven/deferred

The experiment only exercised canonical Windows paths and deliberate junction refusal. Document that normal alias-based parent paths, including some macOS temporary-directory spellings, must first be resolved to their physical path. Do not silently relax the policy. Evidence is buffered in memory; large-package memory limits and mid-write/interruption recovery have not been measured. Document those limits rather than claiming an operating envelope or adding speculative infrastructure.
