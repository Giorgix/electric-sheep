# Electronic Sheeps: evolution stress testing

Status: approved by the user in this conversation.
Date: 2026-11-12

## Intent

Electronic Sheeps is an installable skill/plugin pack for coding agents. It challenges software through realistic successive changes, exposing solutions that work initially but become brittle, tangled, unnecessarily complex, or incorrect outside the happy path.

The user wants something as easy to use across projects as Superpowers, initially for Claude Code and OpenAI Codex. This is not a new editor, hosted service, or model provider.

The central question is: **does this implementation remain correct and understandable when the next reasonable requirement arrives?**

## Decisions and provenance

The user selected:
- Evolution stress testing rather than a standalone code reviewer or fixed coding benchmark.
- An installable integration usable inside existing projects.
- Isolated exercises by default.
- Shared skills plus a small local runner rather than skills alone or a full harness.

The following are proposed design calls, not previously stated user requirements:
- An explicitly invoked, bounded exercise, not an automatic background process.
- Claude Code and Codex as the initial supported hosts.
- Node.js 22+ and Git as runtime requirements; no production npm dependencies initially.
- A clean Git checkout as the initial supported input.
- Three cumulative challenges by default, approved together before execution.
- Evidence and contextual findings rather than a universal numerical quality score.
- No automatic merge, repair of the original project, model API calls, or external reporting.

## Goals

- Reveal missed edge cases, weak failure handling, excessive coupling, oversized responsibilities, duplication, and speculative abstractions through actual change exercises.
- Use project-specific requirements rather than arbitrary enterprise requirements.
- Preserve the original checkout while experiments change a disposable worktree.
- Record enough evidence to distinguish a demonstrated defect from a maintainability concern or an untested hypothesis.
- Reuse the coding host's existing model, authentication, tools, and permissions.
- Keep installation and normal use small enough for individual developers.

## Non-goals and anti-goals

- No multi-model leaderboard, autonomous fleet, dashboard, hosted backend, or general agent SDK in v1.
- No claim that a worktree is a security sandbox.
- No mandatory Docker dependency, production fault injection, load testing against live systems, or production credentials.
- No universal proof of correctness, language-independent semantic complexity analyzer, or inference of malicious intent.
- No rewards for adding layers, defensive checks, dependencies, or tests unrelated to the agreed requirements.
- No automatic changes to the user's working branch.
- No treating a long file or a large diff alone as proof of bad design.

The user's mention of dark patterns is initially interpreted as undesirable engineering practices. Manipulative product behavior can be challenged when explicit product requirements make it assessable, but is not a separate automatic UX ethics detector in v1.

## Approaches considered

### 1. Skills only

The host agent creates workspaces, runs commands, and produces reports from instructions. This minimizes installation requirements, but isolation bookkeeping, checkpoints, and evidence integrity depend too much on instruction following.

### 2. Shared skills plus a small runner — selected

Skills supply project understanding, realistic challenges, implementation instructions, and contextual judgment. A local runner owns workspace bookkeeping, approved command execution, evidence records, state transitions, and report assembly. This is a small amount of infrastructure for repeatable mechanics without building another AI platform.

### 3. Standalone harness

A separate application launches model sessions and coordinates campaigns. It offers stronger orchestration and comparisons but introduces provider integrations, costs, and much more maintenance. Deferred unless real usage requires it.

The underlying exercise was also selected over two alternatives: a static adversarial reviewer is less able to demonstrate evolution cost, while a fixed obstacle-course benchmark is less directly useful on the user's own project.

## User experience

The user invokes the evolution-testing skill in natural language or through the host's native skill invocation, naming a feature, directory, or recent committed change. Exact slash-command spelling is platform-specific and is not promised by this design.

Example request:

> Stress-test the evolution of the checkout module. Keep everything isolated.

The workflow is:

    Select scope -> inspect project -> approve commands and challenges
                 -> baseline -> challenge 1 -> challenge 2 -> challenge 3
                 -> evidence-backed report -> keep or clean up experiment

The agent infers scope from the request and repository. It asks only when ambiguity would materially change the exercise. It shows the proposed challenges, commands, worktree policy, and limits together for approval before executing project code. It never silently installs dependencies.

### Challenge example

For a checkout module, plausible challenges might be introducing a second discount rule, making a repeated request idempotent, and handling a failed payment without recording a successful order. These are examples, not mandatory challenges: a local formatting library needs very different pressures.

Each challenge states:
- The realistic requirement and why it belongs in this project.
- Its acceptance checks, compatibility constraints, and permitted scope.
- What kind of weakness it could expose.
- A stop condition and what evidence would support a finding.

Challenges must be feasible without external accounts, production data, or new infrastructure unless separately approved. Previously satisfied requirements remain applicable throughout the sequence.

## Architecture

### Shared skills

A small skill set covers the main evolution workflow, challenge design, and evidence-based assessment. Exact skill boundaries are left to implementation; avoid unnecessary fragmentation.

Skills tell the host agent to:
1. Read relevant repository instructions and understand the target.
2. Identify the project's existing test/build commands and requirements.
3. Propose a bounded, relevant challenge sequence.
4. Perform all experimental edits inside the run worktree.
5. Implement each challenge with acceptance tests and execute the approved checks.
6. Examine changes and report findings with evidence and uncertainty.

No own model SDK or API key is needed. Where the host supports separate agents, challenger and implementer roles may be separated. This is optional, not a requirement for v1. A single-agent run must be labeled as such; it is not an independent evaluation.

### Local runner

Use a small Node.js CLI with the standard library. The existing environment has Node 22 and Git; consumers need those prerequisites too. It is project-language agnostic and calls the repository's tools rather than shipping a new test framework.

Responsibilities:
- Validate prerequisites, source cleanliness, scope, and run configuration.
- Create a uniquely owned run directory and detached Git worktree at a recorded commit.
- Execute explicitly approved commands in that worktree, collecting exit status, duration, stdout, stderr, and timeout information.
- Persist challenges, command approvals, checkpoints, diffs, acceptance-artifact hashes, observations, and run state.
- Reject out-of-order stage transitions and record incomplete or invalid exercises honestly.
- Assemble Markdown and machine-readable JSON reports from recorded evidence and separately attributed agent findings.
- Resume an interrupted run after validating its workspace, or explicitly clean up its owned worktree.

Persist state through atomic writes and allow only one state-changing runner operation per run at a time. On resume, verify worktree ownership, expected checkpoints, and recorded acceptance artifacts; unexplained drift needs explicit review before continuing. Keep incomplete command records after interruption instead of inferring success.

Approval records document the user's consent conveyed through the host; they are not an authenticated security boundary against that host. The runner does not launch or police the host model. The host calls it as a tool and edits the disposable worktree. Actual OS-level confinement requires a separate sandbox and is outside v1.

### Platform integrations

Maintain one canonical skills directory and thin host-specific packaging for Claude Code and Codex. Inspect the current host packaging requirements during implementation; local Superpowers manifests provide examples, not a guarantee of compatibility.

Provide documented local installation for both hosts. Marketplace publication, publisher accounts, and approval are outside v1. A local install must work without an official marketplace listing.

Do not require Superpowers itself or override a project's existing development workflow. The integration is explicit-use only; no global bootstrap hook that automatically starts costly exercises.

## Isolation and safety contract

### Supported project input

V1 requires a Git repository with an initial commit and a clean checkout, including no untracked files. Ignored files are not copied into the experiment. If the checkout is dirty, stop and explain what needs committing or excluding; do not stash, commit, reset, or discard the user's work automatically. Non-Git projects and snapshots of uncommitted work are deferred.

The baseline is the recorded commit, not an implied snapshot of the user's editor. Submodules and Git LFS-dependent targets are unsupported initially unless all required content can be verified as available; report the limitation rather than silently testing incomplete source.

### Workspace ownership

Store runs outside the source checkout, under a user-local Electronic Sheeps directory. Every run has an opaque unique ID, an ownership marker, a manifest, an evidence directory, and its own worktree. Use restrictive filesystem permissions where supported and warn that logs can contain sensitive data.

All generated requirements, tests, and code changes stay in the worktree. Runner-owned Git operations do not invoke repository hooks. Checkpoints are local detached commits in the disposable worktree, never commits on the user's branch. Do not push or change remotes. Git worktrees share repository metadata and object storage; this is source-change isolation, not full repository or host isolation.

Cleanup is explicit and limited to verified run-owned paths and worktree registrations. Never run broad clean/prune operations or remove the original checkout. Preserve the final report and evidence when deleting the experimental worktree unless the user explicitly requests full run deletion.

### Execution permissions

Project code, build scripts, and dependencies may execute arbitrary actions. Before running them, obtain approval for the concrete setup/test/build command list and identify external-service or secret requirements. Added commands need approval. Execute commands as explicit executable-plus-arguments records rather than concatenating untrusted text into a shell command; a shell invocation is itself an explicitly approved command when unavoidable.

Do not copy ignored credentials, load production secrets, run dependency installation, access external services, or perform destructive operations by default. Existing host permissions remain authoritative. The runner does not strip every possible inherited credential or enforce network denial, and must not claim it does. If safe offline execution is not practical, stop or ask the user to provide an appropriate sandbox/test environment.

Runner-owned commands have a default five-minute timeout, adjustable at approval. Termination behavior must be tested on supported platforms and limitations concerning child processes documented. Check cancellation between stages. These limits do not impose a hard time or token ceiling on the host agent; host-native limits must be used where available.

## Exercise protocol

### 1. Discover and approve

Inspect the requested scope, repository instructions, existing tests, and relevant requirements. Prefer existing tools. Record an ordered three-challenge plan, approved commands, timeout settings, and exclusions. Approval covers the batch; material changes require renewed approval.

### 2. Establish the baseline

Create the isolated worktree and run the approved baseline checks. Record the source commit and all outcomes. A failing baseline stops the exercise as baseline-blocked; it is not an Electronic Sheeps discovery. Missing tooling or unavailable dependencies produces a blocked result with instructions, not a pass.

If there are no useful existing tests, propose a minimal baseline smoke/contract check for approval before proceeding. Label the resulting regression coverage as limited. An empty test run is not a meaningful baseline pass.

### 3. Apply cumulative challenges

For each challenge:
- Record and freeze the requirement, acceptance checks, and relevant preserved baseline tests before implementation.
- For changed behavior, establish that the new acceptance check distinguishes the pre-change behavior when practical; record when it cannot.
- Let the host agent implement the requirement in the worktree.
- Run the acceptance checks and relevant prior regression checks through the runner.
- Record the diff, checkpoint, test outcomes, and observed implementation effort.
- Check acceptance-artifact hashes and prior test changes. Unapproved weakening of checks invalidates the round rather than yielding a pass.

Acceptance hashes and diffs are audit controls, not tamper-proof protection against an agent with filesystem access. Legitimate test changes require an explicit recorded amendment and rerun. Do not silently relax requirements to make a round pass.

Use one implementation attempt and at most one repair cycle per challenge by default. If it remains unsuccessful, stop the cumulative sequence and report remaining challenges as not run. Stop after three challenges, user cancellation, invalidated evidence, permission issues, or any safety concern. Additional rounds or expanded scope require approval.

### 4. Assess and report

Compare baseline and successive checkpoints. Distinguish:
- **Demonstrated defect:** a requirement fails with reproducible command/input and output.
- **Demonstrated evolution friction:** the actual change exposed coupling, duplication, or disproportionate modification, supported by a concrete diff and explanation.
- **Maintainability concern:** a contextual judgment grounded in specific code, not a proven failure.
- **Untested hypothesis:** a plausible risk without executed evidence.

Attribute findings to baseline code, experimental changes, or uncertain origin. An experimental bug is not automatically a bug in the user's original feature.

## Evaluation policy

Behavioral evidence comes first: regression results, boundary checks, failure-path checks, and preserved compatibility.

Structural evidence may include changed lines, touched files, file/function growth, introduced dependencies, duplicated decision logic, and unnecessary indirection. Generic Git and text statistics are available across projects; richer metrics use existing approved project tools when available.

These measurements are signals, not verdicts. Generated files are excluded. A large cohesive file can be appropriate; a tiny diff can still be wrong. Overengineering means complexity without a justified requirement or demonstrated benefit, not merely the presence of an abstraction.

Do not report unsupported metrics, invent execution results, or claim that passing three challenges proves production readiness. No universal quality score or automatic ship/no-ship verdict. Any recommendations must remain proportional to the project's scale.

## Evidence and report contract

Each run records schema version, run ID, source repository and commit, target scope, host and role separation if known, runtime versions, approvals, ordered challenges, commands and results, checkpoints, file hashes, state transitions, and findings.

The report includes:
1. Scope, baseline, environment, and limitations.
2. Per-challenge requirement, outcome, and evidence references.
3. Regression outcomes and structural deltas.
4. Findings with category, contextual impact, origin, and file/line or artifact references.
5. Recommended next actions, including useful tests or minimal repairs.
6. Cleanup/resume instructions and remaining untested questions.

Runner-recorded observations and agent-written interpretations are separate fields. Markdown is for people; JSON is for later tooling. Both describe the same persisted run. Agent conclusions are not runner-certified facts.

Logs remain local; the runner has no telemetry or upload feature. The host model may already transmit project context under its own provider settings. Secret-free logs cannot be guaranteed, so reports are not automatically published.

## Testing and delivery acceptance

Use Node's built-in test runner for the runner and fixtures built as temporary Git repositories. Cover:
- Dirty and non-Git input rejection; preservation of the user's files and branch.
- Owned worktree creation, detached checkpoints, spaces in paths, and safe cleanup.
- Baseline blocking, command approval, timeout/failure recording, and cancellation.
- Stage validation, cumulative regressions, acceptance-check changes, and incomplete runs.
- Evidence persistence, resume validation, and Markdown/JSON report agreement.
- A small sample project where a realistic evolution challenge exposes a known defect or brittle design.

Validate skills against representative scenarios: unsupported complexity accusations, irrelevant challenges, dirty checkouts, blocked tests, and a single-agent host. Host packaging gets structural tests plus documented installation smoke checks; only claim real Claude Code/Codex compatibility after testing those hosts. If either host is unavailable, mark that integration as unverified.

Support Windows, macOS, and Linux in the design. Test the available Windows environment locally and use CI for other operating systems where feasible; do not claim unexecuted platform verification.

V1 is usable when a developer can install locally, invoke one bounded exercise in a suitable Git project, approve its plan, obtain an evidence-backed report, and remove the experiment without changing their working checkout.

## Deferred work

Dirty-worktree snapshots, container execution, provider/session orchestration, stronger challenger/implementer separation, model comparisons, CI campaign automation, richer language analyzers, non-Git projects, and marketplace publication are deferred rather than prerequisites.

## Design review and approval tracking

- [x] Inspect project state and comparable plugin packaging.
- [x] Understand intent and select an approach with the user.
- [x] Write the proposed design and identify assistant-made calls.
- [x] Perform builder-readiness review and resolve material gaps (self-review; no subagent tool available).
  - Clarified limited-test baselines, interrupted-run state, resume validation, and the limits of approval records.
- [x] Obtain user approval of this document.
- [x] Invoke writing-plans and produce an implementation plan: `docs/superpowers/plans/2026-11-12-evolution-stress-test.md` (awaiting user review and execution selection).

At design time this project directory was empty and not yet a Git repository. The user subsequently initialized Git and pushed the initial `main` commit. The approved design and implementation were committed only on `feat/evolution-stress-test`, with PRs targeting `main` and no direct pushes to `main`.
