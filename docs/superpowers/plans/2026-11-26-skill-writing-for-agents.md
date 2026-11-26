# Electric Sheep Skill Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. No subagent tool is available; recommend inline execution with author self-review, explicitly not independent review.

**Goal:** Refactor the user-invoked Electric Sheep skill into concise, stage-specific instructions with observable completion gates and a pre-freeze acceptance-coverage check.

**Architecture:** Keep one skill and its existing reference files. The main file is the ordered workflow; challenge design, assessment and closing own their detailed rules. Compatibility tests exercise the real generated artifacts, not whether prose contains favored phrases.

**Tech Stack:** Markdown, Node 22+ built-in test runner, Git; existing pinned development Prettier 3.6.2 only.

**Spec:** `docs/superpowers/specs/2026-11-26-skill-writing-for-agents-design.md`.

## Global Constraints

- Keep package/version 0.4.2, schema 1, Node 22+, Git, canonical names, exact MIT notices and zero production dependencies. Preserve pinned development Prettier 3.6.2 and its lockfile resolution/integrity.
- Keep `name: evolution-stress-test` and `disable-model-invocation: true`. The description becomes a human-facing summary under the explicitly requested `writing-for-agents` guidance, not a model-trigger list.
- Change no runtime code, CLI behavior, schema, JSON examples, package/lock/plugin metadata, installed clients or other projects. The coverage matrix lives outside source during a future exercise; it adds no JSON field.
- Preserve three cumulative challenges, meaningful baseline, approval before project execution, separate installation consent, frozen-check history, one repair/re-evaluation maximum per challenge, calibrated findings, verified output and explicit cleanup consent/default keep.
- This is not a new Electric Sheep experiment: its three-round attempt limits do not apply to ordinary development verification, and no existing run is reopened or amended.
- No push, PR, merge, client update, extra model call, Amanda execution or cleanup is authorized by implementation approval.
- Fresh-agent baseline/with-skill pressure tests are unavailable. Before skill edits, obtain explicit approval to proceed as an unvalidated documentation preview with those tests deferred. Compatibility passes are not behavioral RED/GREEN or independent review.

## Review Focus

1. Success and refusal branches of a purity contract: pre-freeze review demands separate named effect checks for ready and blocked outcomes, not a total assertion count. Task 1 prepares the scenario; Task 2 implements the gate.
2. A missing branch discovered after freezing: preserve history/attempts, disclose the gap and seek explicit amendment approval if appropriate rather than retroactively certifying coverage. Tasks 1 and 2 cover this scenario.
3. A failed/blocked early terminal run: load assessment and closing without waiting for round three, retain truthful findings and default to keep. Tasks 1 and 2 cover the terminal-path scenario.
4. A standalone copied skill used from another cwd after deleting its parent bundle: reference assets and the existing runner remain usable, with exact MIT notices. Task 1 extends the actual packaging tests.
5. User-invoked discovery versus automatic invocation: retain the explicit-use flag while accepting a human-facing summary; no runtime/account/model fallback or extra approval is implied. Task 1 updates metadata validation and prepares a retrieval scenario; Task 2 preserves the gate.

## Workspace and command inventory

- Base: `703257c74053c2ec059e0601de08a39511c272e0`.
- Branch: `docs/skill-writing-for-agents`.
- **W (cwd for every command below):** `D:/CODING/electronic-sheeps/.worktrees/skill-writing-for-agents`.
- **R (evidence directory, outside Git):** `D:/CODING/electric-sheep-investigations/2026-11-26-skill-writing-for-agents`.
- **N (executable):** `C:/Users/jorge/AppData/Local/pi-node/current/node.exe`.
- **M (npm CLI argument):** `C:/Users/jorge/AppData/Local/pi-node/current/node_modules/npm/bin/npm-cli.js`.
- **G (executable):** `C:/Program Files/Git/cmd/git.exe`.

These are literal executable/argv calls; W/R/N/M are expanded to the absolute paths above, not passed as strings. Tests create and remove their own synthetic temporary repositories/bundles; they do not run external project suites or contact providers. Run with inherited Git locator/config-injection variables removed, pinned Node directory first on PATH, and no project-specific environment file loading. Keep stdout, stderr and exit status for each invocation under R. Re-run only for an explained development change/failure, never to hide a previous result.

| ID | Executable | argv | Timeout / purpose |
|---|---|---|---|
| baseline / full | N | `[M, "test", "--ignore-scripts"]` | 300000 ms; before edits and final full suite |
| targeted | N | `["--test", "tests/skills.test.mjs", "tests/packaging.test.mjs", "tests/distribution.test.mjs"]` | 300000 ms; compatibility before and after skill edits |
| syntax | N | `["scripts/check.mjs"]` | 300000 ms; repository syntax validation |
| formatter-setup | N | `[M, "ci", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"]` | 300000 ms; **separate explicit setup consent**, once only |
| format-changed | N | `["node_modules/prettier/bin/prettier.cjs", "--write", "tests/skills.test.mjs", "tests/packaging.test.mjs"]` | 300000 ms; only changed JavaScript tests |
| format-check | N | `[M, "run", "format:check", "--ignore-scripts"]` | 300000 ms; full existing formatting policy |
| whitespace | G | `["diff", "--check", "703257c74053c2ec059e0601de08a39511c272e0"]` | 30000 ms; all branch changes |
| preservation | G | `["diff", "--exit-code", "703257c74053c2ec059e0601de08a39511c272e0", "--", "src", "bin", "scripts", "examples", "package.json", "package-lock.json", "LICENSE", ".claude-plugin", ".codex-plugin"]` | 30000 ms; protected content unchanged |

Formatter setup installs only the locked development formatter, using npm's existing local cache. An offline cache miss stops setup; no online retry, `npx`, lifecycle script, dependency version change or alternate package source is authorized. If setup is declined, run dependency-free verification and explicitly leave formatting verification pending. Mechanical edits may be made with Edit rather than running a formatter. Existing repository scripts do not format Markdown; review Markdown and its links directly rather than introducing another formatter.

Read-only Git inspection, word counts, hashing/reading owned artifacts and local Git staging/commits of the allowlisted files support these tasks. Use command-local hooks/fsmonitor/signing/automatic-maintenance disabling for commits; do not change persistent Git config. Retain the original checkout at the base/clean status and preserve other worktree registrations. Record concurrent unrelated HEAD changes without resetting them.

## File map

| Path | Responsibility |
|---|---|
| `skills/evolution-stress-test/SKILL.md` | Human-facing description, prerequisites, staged workflow and completion gates |
| `skills/evolution-stress-test/references/challenges.md` | Challenge-design criteria and concrete acceptance-coverage matrix |
| `skills/evolution-stress-test/references/assessment.md` | Evidence attribution and limits, including uncovered branches |
| `skills/evolution-stress-test/references/follow-up.md` | Authoritative publication, optional export and cleanup procedure; change only if needed to remove duplication or clarify a pointer |
| `tests/skills.test.mjs` | Consumable metadata/assets and real example/entry-point compatibility |
| `tests/packaging.test.mjs` | Reference assets survive real Claude/Codex bundles and standalone skill copying |
| `tests/skill-scenarios.md` | Before-edit behavioral scenarios and honest not-run/deferred status |
| This plan and its spec | Approval, implementation checklist and validation boundaries |

## Task 1: Establish compatibility checks and before-edit scenarios

**Files:** Modify `tests/skills.test.mjs`, `tests/packaging.test.mjs`, `tests/skill-scenarios.md`. Do not edit the skill yet.

**Interfaces:** Consume actual source metadata, `packageLocal({ host, out })`, and existing generated-bundle fixtures. Produce compatibility checks that remain valid for a user-invoked description and additional real reference-copy assertions; produce behavioral scenarios, not fabricated agent outputs.

- [x] **1. Confirm execution approval**, including explicit permission for the documentation-preview/fresh-agent-testing exception. Record whether offline formatter installation was separately approved. Recheck W, original checkout, protected-file hashes and registered worktrees before any test or setup.
- [x] **2. Run `baseline` before changes.** Require zero failing tests and record actual passes/skips; the prior release's counts are historical, not this baseline. Stop and diagnose an unexpected failure before proceeding.
- [x] **3. Add before-edit behavioral scenarios.** Give each scenario the concrete input, pressure and observable expected action: missing ready-path effect test before freeze; gap discovered after freeze; early terminal state requiring handoff; stage-specific reference retrieval from another cwd; explicit-use skill with pressure to use an unapproved model. Keep baseline/with-skill cells `Not run` and distinguish historical Document X-Ray evidence from a fresh controlled test. Keep existing scenarios and their status.
- [x] **4. Update metadata compatibility assertions.** Replace only the brittle `description: Use when` prefix expectation with a nonempty single-line description check; preserve the existing name assertion and add the explicit-use flag check. Keep example validation and outside-cwd runner tests. Do not lock prose wording or word counts into tests.
- [x] **5. Extend actual artifact tests.** In both host bundles compare the five existing reference files (`challenges.md`, `assessment.md`, `follow-up.md`, `plan.example.json`, `follow-up.example.json`) byte-for-byte with source. In the standalone-copy test, verify those files remain after the parent bundle is deleted, alongside existing runner/license/report/export/cleanup assertions. This catches missing/stale distributed assets, not whether agents obey their content.
- [x] **6. Run `targeted`.** Compatibility should pass against the old skill too: these preserve existing artifact behavior. There is no expected behavioral RED and no manufactured failing prose test. An actual failure is investigated before skill edits.

## Task 2: Refactor the skill and verify the complete change

**Files:** Modify the four Markdown skill files in the file map only where needed; update scenario/checklist status without claiming a behavioral pass.

**Interfaces:** Consume the approved spec and Task 1 compatibility checks. Produce the same standalone skill name, explicit-use flag, reference paths and Node runner entry point; no changed machine-readable interface.

- [x] **1. Refactor the main file into stages.** Retain its local-preview/unverified-behavior disclosure. Give prerequisites, approval, baseline, each round, assessment/handoff and cleanup decision observable completion criteria. Point to references at their actual consumption stage; include terminal outcomes that end before all three rounds.
- [x] **2. Add the coverage matrix to challenge guidance.** Require four slots per row: requirement/branch, expected result, test file plus test/check name, approved command ID. Use one compact generic ready/blocked purity example. Before freeze every promised branch must have a real check, or the gap/scope decision must be resolved with approval. Keep the matrix outside source and outside schema-1 JSON. Explain that missing capability can be expected while infrastructure/import failures are not meaningful behavioral REDs.
- [x] **3. Co-locate interpretation and closing.** Assessment owns finding definitions and coverage limits; closing owns exact report/export/cleanup procedures. A later coverage omission stays visible and does not authorize weakening frozen checks, resetting attempts or extra evaluations. Keep mandatory safety decisions visible in the main workflow without repeating the full procedures.
- [x] **4. Measure and review the changed documents.** Record before/after main-file and total reference word counts, plus which files each stage requires. Aim for about 500 main-file words, not a brittle threshold. Check every Markdown pointer including any fragment against actual source and generated artifacts. Review every original instruction against its new authoritative location; account explicitly for safety-critical instructions. Preserve justified negations for hard guardrails rather than shortening them away.
- [x] **5. If separately approved, run `formatter-setup` once**, followed by `format-changed`. A cache miss is a reported blocker, not permission to fetch. Otherwise use targeted Edit changes and leave full formatting validation pending.
- [x] **6. Run `targeted`, `syntax`, `format-check` if available, `full`, `whitespace` and `preservation`.** Require no failing tests/diagnostics; name any skips or unavailable checks. Verify the original checkout and other registrations again. Keep receipts outside Git.
- [ ] **7. Perform author self-review of the entire branch diff.** Check each spec requirement and five Review Focus cases. Update plan/scenario checkboxes with actual evidence only. Record that no fresh-agent pressure tests or independent review occurred and that behavior remains unverified.
- [ ] **8. Commit only allowlisted changes on the feature branch**, with a message such as `docs: clarify Electric Sheep skill stages and coverage gates`. Report changed paths, measured size changes, actual test results/limits, retained worktree and the next authorization needed. Do not push, create a PR, update clients or start Amanda.

## Plan self-review and approval status

- [x] Approved design mapped to the two implementation tasks; no runtime/interface changes required.
- [x] Review Focus cases mapped to prepared behavioral scenarios or actual packaging/metadata checks; pressure scenarios explicitly remain unexecuted.
- [x] Artifact checks are not substituted for behavioral RED/GREEN; explicit preview exception required before skill edits.
- [x] Concrete executable/argv/cwd/timeouts, offline-only optional setup and protected paths specified.
- [x] Work sized as one cohesive documentation refactor; no new router, helper framework or model-evaluation infrastructure.
- [x] User reviewed/approved this implementation plan and inline execution.
- [x] User explicitly approved deferring fresh-agent pressure tests for this documentation preview.
- [x] User separately approved the optional once-only offline formatter installation.
