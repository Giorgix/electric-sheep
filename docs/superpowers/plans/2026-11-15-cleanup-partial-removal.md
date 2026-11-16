# Bounded Partial-Cleanup Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover safely when Git reports a removal failure after unregistering a validated worktree, and deliver patch release 0.4.1.

**Architecture:** Keep cleanup consent, publication and entry-time mismatch checks in the existing finalizer. Extract registration and post-removal filesystem checks into one internal module; retain directory identity only in memory across one Git attempt. Portable tests exercise real post-removal states, while a Windows integration regression exercises the actual Git failure through `finalizeCleanup`.

**Tech Stack:** Node.js 22+, built-in Node test runner/filesystem APIs, Git, development-only Prettier 3.6.2.

**Spec:** `docs/superpowers/specs/2026-11-15-cleanup-partial-removal-design.md` — approved by the user on 2026-11-15.

## Global Constraints

- Node 22+, Git, zero production dependencies, schema 1.
- Canonical names/default roots and existing CLI approval semantics remain unchanged.
- No journal, new recovery command, general retry policy, broad prune, global/repository Git configuration write or automatic cleanup consent is added. Test-only configuration is confined to disposable fixture repositories.
- Original exercise outcomes remain unchanged; publication still precedes destructive cleanup.
- Preserve existing refusal tests and entry-time mismatch guards; never adopt an already-unregistered directory on a later invocation.
- Keep incident evidence outside this repository; commit only synthetic fixtures and descriptions.
- Feature branch `fix/cleanup-partial-removal`; no merge/main push, extra model reviewer or changes to installed caches, existing worktrees or retained runs.
- Inline execution using `executing-plans`; self-review is not independent review. This plan awaits execution approval; no setup/tests have run.

## Review Focus

1. Git exits nonzero with both directory and registration already absent: verify actual postconditions rather than preserve a false failure (Task 1).
2. Filesystem identity is missing, malformed or changes while the pathname stays the same: refuse residue deletion (Task 1).
3. A nested junction points at the source: unlink the junction, preserve the target and source snapshot (Task 1).
4. Node fallback encounters a permission error: retain output and fail truthfully; do not mark cleaned (Task 1, conditional POSIX test).
5. A copied standalone bundle or catalog has stale/missing runtime metadata: retain executable packaging tests and check the new helper is packaged (Tasks 2–3).

## File Map

| File | Responsibility |
| --- | --- |
| Create `src/workspace-cleanup.mjs` | Registration query, in-memory directory identity and verified post-Git residue removal. Internal mechanics, not a new standalone cleanup API. |
| Modify `src/workspace.mjs` | Re-export registration query; capture identity after validation; attempt Git once; reconcile and save truthful cleaned state/audit event. |
| Create `tests/cleanup-recovery.test.mjs` | Real Windows regression, portable state/identity guards and fixture-only fault states. |
| Modify `tests/distribution.test.mjs` | Pin the approved 0.4.1 identities before bumping metadata. |
| Modify `package.json`, `package-lock.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json` | Align release version only; preserve dependency resolution, names and registration. |
| Modify `docs/usage.md`, `docs/verification.md` | Explain bounded recovery/manual limits and record actual verification, without rewriting historical evidence. |

Leave `src/closing.mjs`, canonical `SKILL.md`, CI configuration and unrelated tests unchanged unless a demonstrated blocker requires a separately reviewed plan amendment.

## Exact Local Command Inventory

Cwd for every row: `D:/CODING/electronic-sheeps/.worktrees/cleanup-recovery`.
Executable **N**: `C:/Users/jorge/AppData/Local/pi-node/current/node.exe`.
The `args` below are literal argv, not shell text. Every invocation has timeout **300000 ms**.

| ID | N args | Purpose / expected result |
| --- | --- | --- |
| setup | `["C:/Users/jorge/AppData/Local/pi-node/current/node_modules/npm/bin/npm-cli.js", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]` | Once; install locked development tooling only. Registry/cache access allowed here, no lifecycle scripts. |
| full | `["C:/Users/jorge/AppData/Local/pi-node/current/node_modules/npm/bin/npm-cli.js", "--offline", "test"]` | Baseline once, then task/final verification; baseline expected 195 passing tests, verify rather than assume. |
| recovery | `["--test", "tests/cleanup-recovery.test.mjs"]` | Intended RED, then GREEN and safety cases. |
| targeted | `["--test", "tests/cleanup-recovery.test.mjs", "tests/closing.test.mjs", "tests/workspace.test.mjs"]` | New mechanics plus unchanged ownership/publication guards. |
| distribution | `["--test", "tests/distribution.test.mjs"]` | Version RED/GREEN. |
| format-owned | `["node_modules/prettier/bin/prettier.cjs", "--write", "src/workspace-cleanup.mjs", "src/workspace.mjs", "tests/cleanup-recovery.test.mjs", "tests/distribution.test.mjs", "package.json"]` | Format only the listed implementation/release files. |
| syntax | `["scripts/check.mjs"]` | Syntax-check all shipped/test JavaScript; exit 0. |
| formatting | `["C:/Users/jorge/AppData/Local/pi-node/current/node_modules/npm/bin/npm-cli.js", "--offline", "run", "format:check"]` | Whole-project formatting check; exit 0. |
| package | `["C:/Users/jorge/AppData/Local/pi-node/current/node_modules/npm/bin/npm-cli.js", "pack", "--dry-run", "--json", "--offline", "--ignore-scripts"]` | Inspect file list, version and zero bundled production dependencies; no tarball/publication. |

Allow repeated check rows only for explicit TDD iterations and final verification; retain every result, not retry-until-green. Use sanitized Git inspection, `diff --check`, explicit-path staging and feature-branch commits. Fixture tests may create/remove their own temporary repositories/worktrees and configure only those repositories. No runtime network/model/backend calls, native install/update or comparison/Toast commands. Save receipts/logs outside the repository under the existing cleanup investigation directory. Stop on baseline/infrastructure failures or unexpected changes; do not treat them as intended RED.

## Task 1: Same-invocation cleanup recovery and safety

**Interfaces:** `src/workspace-cleanup.mjs` exports:
- `isWorkspaceRegistered(run) -> Promise<boolean>`: move the existing implementation unchanged; `workspace.mjs` retains its existing exported name by re-exporting it.
- `captureWorkspaceIdentity(workspace) -> Promise<Identity|null>`: `Identity = { path: string, dev: bigint, ino: bigint, birthtimeNs: bigint|null }`. Use `lstat(..., {bigint:true})` plus canonical `realpath`. Require a nonsymlink directory, nonnegative device and positive inode. Unsupported identity returns null; unexpected I/O errors propagate. Compare creation identity when available, without using mutable mtime/ctime. Never serialize this token.
- `finishWorkspaceRemoval(run, identity, gitError = null) -> Promise<{residueRemoved:boolean}>`: recheck ownership/path, registration and actual directory state; delete only matching residue; verify both postconditions. Retain the existing `rm(workspace,{recursive:true,force:true,maxRetries:3})` behavior, without following nested link targets or adding retries of Git removal. No phase/outcome persistence here. Retained registration rethrows `gitError` if supplied; later failures preserve it as an aggregate error member alongside the new failure.

- [ ] **1. Establish the approved baseline.** Verify branch/base and clean status, protect the original checkout/older worktree snapshots, then run `setup` and `full`. Stop if the baseline is not healthy.
- [ ] **2. Write the real Windows regression first, importing existing modules only.** Test name: `Windows cleanup recovers after Git unregisters but long-path deletion fails`. Use `protocolFixture(t, {files:{'.gitignore':'deep-cache/\n'}})`, set only that repository's `core.longpaths=false`, and create synthetic ignored nested files with a longest absolute path between 330 and 380 characters. Save failed outcome/attempts=2, an earlier checkpoint/publication, then final tracked/new/binary edits. Call `finalizeCleanup(run,{cwd:root})` expecting success, not `assert.rejects`. On the old-code error, assert `/filename too long/i`, absent registration and remaining real directory, then rethrow the original error so the test is RED. Do not import the not-yet-created helper or mistake setup/path failures for RED.

```js
assert.equal(receipt.verified, true);
assert.equal(receipt.phase, 'cleaned');
assert.equal(receipt.outcome, 'failed');
assert.equal(receipt.evidenceDeleted, false);
assert.equal(saved.attempts, 2);
assert.equal(await isWorkspaceRegistered(run), false);
await assert.rejects(access(run.workspace), {code:'ENOENT'});
```

- [ ] **3. Run `recovery`; retain the genuine Windows RED and post-failure observations.** On other platforms this case is explicitly skipped, not represented as reproduced. This execution environment is Windows; failure to induce the documented state is a blocker to investigate, not permission to relax the oracle.
- [ ] **4. Add portable helper tests before their implementations.** In this test file define `unregisterResidue(fixture,{restore=true}={}) -> {identity,parked}`: validate/capture the registered workspace, park its directory within the owned run, remove only its now-missing registration using real Git, then optionally restore the same directory. This fabricates the post-Git state without racing, globally replacing Git, experimental module mocks or test-only production hooks. Keep a parked original alive when testing a foreign replacement to prevent inode reuse. Minimal export stubs may resolve initial wiring failures, but capture assertion-based RED before implementing helper behavior; missing modules/exports are not regression proof.

| Test / state | Assertions after `finishWorkspaceRemoval` |
| --- | --- |
| Valid registered real directory capture | `assert.ok(identity)`; `assert.equal(typeof identity.ino,'bigint')`; `assert.ok(identity.ino>0n)`; recorded physical path matches. |
| Same directory, unregistered, synthetic Git error | `assert.equal(result.residueRemoved,true)`; path/registration absent; source snapshot unchanged. |
| Both absent, synthetic Git error | `assert.equal(result.residueRemoved,false)`; no new directory created. |
| Still registered, supplied error | `assert.rejects(call,e=>e===gitError)`; workspace intact. |
| Null/zero-inode/wrong-path/wrong-device/changed-creation identity | `assert.rejects(call,/residue|identity/i)`; original sentinel bytes unchanged. |
| Foreign replacement directory or workspace symlink/junction | Rejection; replacement/target sentinel and parked original preserved. |
| Same directory containing nested source-target link | Successful removal; `assert.deepEqual(await repo.snapshot(),before)` and target sentinel unchanged. |
| Permission-denied nested directory (non-root POSIX only) | Rejection containing both original Git and removal errors; bundle verifies, phase not cleaned; restore fixture permissions in `finally`. Windows/root skip is explicit. |

- [ ] **5. Implement the declared helper interfaces and wire `cleanupWorkspace`.** Keep entry-time guards. Validate registered workspace, capture identity, attempt Git removal once, retain its error, then call the finisher even after an error. A still-registered worktree is never passed to Node removal. On verified recovery append `{type:'cleanup-git-error-recovered', at:<ISO string>, gitExitCode:<integer|null>, residueRemoved:<boolean>}` before saving cleaned state. Do not persist raw Git stderr or identity fields. Preserve existing explicit evidence-purge behavior and error retention wording. If fallback fails, do not mark cleaned or emit a success event.
- [ ] **6. Run `recovery`, `targeted`, and `full` to GREEN.** Extend the Windows success assertions to verify exactly one recovery event with `residueRemoved:true` and a nonzero integer `gitExitCode`, original findings/outcome/attempts unchanged, prior evidence bytes unchanged, and all current output hashes valid. Replay checkpoint plus final binary-capable diff using the pattern in `tests/closing.test.mjs`; ignored deep-cache contents must not appear in patches. Existing mismatch, lock, publication-corruption, cwd/pending-process and explicit-purge tests must remain passing without weakened assertions.
- [ ] **7. Review and commit only** `src/workspace-cleanup.mjs`, `src/workspace.mjs`, `tests/cleanup-recovery.test.mjs`: `fix: recover verified residue after partial Git removal`.

## Task 2: Patch-release identity and user guidance

**Interfaces:** No CLI/schema additions. All existing package/plugin/catalog identity consumers receive `version: "0.4.1"`.

- [ ] **1. Change only the two pinned version expectations in `tests/distribution.test.mjs` to `0.4.1`.** Run `distribution`; expect the two metadata cases to fail with actual `0.4.0` versus expected `0.4.1`, not command/setup errors.
- [ ] **2. Update approved metadata.** Change package version, lock top-level and `packages[''].version`, both plugin manifest versions and `marketplace.plugins[0].version` to `0.4.1`. Preserve Prettier 3.6.2, its integrity/resolution and every existing identifier. Add the bounded same-invocation recovery/audit-event/manual-interruption limit to `docs/usage.md` beside its cleanup failure guidance; do not imply restart recovery or sandbox safety.
- [ ] **3. Run `distribution`, then `full`.** Existing copied-bundle cleanup must execute after the original bundle is removed, proving the new module travels with the runner. All release identities must agree; no new production dependency or canonical skill changes.
- [ ] **4. Commit explicit metadata/test/usage paths:** `chore: release Electric Sheep 0.4.1 cleanup hardening`.

## Task 3: Final evidence and ready-to-publish handoff

**Interfaces:** Existing output/CLI contracts only; no new runtime behavior.

- [ ] **1. Run `format-owned`, `formatting`, `syntax`, `full`, `package`, and sanitized `git diff --check`.** Check npm dry-run includes `src/workspace-cleanup.mjs` and aligned 0.4.1 metadata. Record exact pass/fail/skip counts, timeouts and all attempts. Linux/macOS/Node 24 are not locally verified; conditional test skips must be disclosed.
- [ ] **2. Self-review the whole diff against the approved design and all five Review Focus conditions.** Verify `src/closing.mjs`, `SKILL.md`, dependency resolution, original checkout, older worktree and retained evidence remain unchanged. No extra model session or independent-review claim. Stop for review on scope/security blockers rather than weakening acceptance.
- [ ] **3. Add a factual 0.4.1 section to `docs/verification.md`.** Distinguish the actual Windows regression from fabricated post-Git helper states, prior evidence consistency from report regeneration, and local checks from pending CI. Preserve all historical sections. Include the remaining interruption/concurrency limits and label self-review.
- [ ] **4. Recheck documentation whitespace, commit only any owned formatting changes and the verification record, and present the feature head/diff/test evidence plus a proposed PR description against `main`.** This local implementation approval does not authorize pushing/opening a PR; ask separately before publication. Existing CI should subsequently run Ubuntu/Windows/macOS × Node 22/24; report actual results only. Never merge or push main without separate authority.

## Plan Self-Review

The core regression precedes product behavior changes; portable helper wiring errors are explicitly not counted as RED. Tasks map identity/registration, replacement/link refusal, failure retention, audit/outcome preservation, replayable evidence and patch metadata to concrete checks. Genuine conditional platform gaps remain named rather than hidden. The new module is production cleanup logic, not an injection framework; the CLI/finalizer entry guards stay unchanged. Execution remains pending user review of this plan and command inventory.
