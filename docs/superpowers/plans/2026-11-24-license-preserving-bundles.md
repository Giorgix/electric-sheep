# License-preserving bundles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline after plan/command approval. No extra model or independent reviewer is authorized or available.

**Goal:** Ship 0.4.2 bundles that retain the existing MIT notice after independent skill installation.
**Architecture:** Reuse `copyPlain` and the existing staged `packageLocal({ host, out })` pipeline. Copy one unchanged source license at each independent distribution boundary; retain all path guards and failure cleanup.
**Tech Stack:** Node.js 22+, Git, zero production dependencies; development Prettier 3.6.2.
**Spec:** `docs/superpowers/specs/2026-11-24-license-preserving-bundles-design.md`, approved in chat by `ys`; its proposal-status text is a historical preparation snapshot.

## Global Constraints

- Release package/lock, both plugin manifests and marketplace as 0.4.2; schema remains 1.
- Keep `electric-sheep`, `evolution-stress-test`, existing runtime APIs and storage behavior unchanged.
- Preserve MIT text byte-for-byte; Node 22+, zero production dependencies and pinned development tooling remain unchanged.
- Use `fix/license-preserving-bundles`, based on main merge `c7040af2e2e5317c292a2e43c011797e0d51c2a0`.
- No installed-cache patches, client updates, model calls, remote publication, merges or retained-resource cleanup in this local implementation stage.

## Review Focus

1. Bundle-root-only notices disappear when only the skill is copied: test both generated roots and the copied skill.
2. A copied embedded runner must retain its own notice and usable CLI/report/export/cleanup: keep executable copied-runtime checks.
3. A missing source license must fail before publication and leave no staging residue: exercise a real isolated source copy.
4. A symlinked license must be refused without changing its target: use a fixture, with a named skip only if creating the link is unsupported.
5. Package/lock/plugin/catalog and embedded metadata must agree on release/SPDX without dependency or canonical-skill changes: check parsed metadata and unchanged source bytes.

## File Map

- `scripts/package-local.mjs`: notice copies using the existing helper, no new public interface.
- `tests/packaging.test.mjs`: notice-retention assertions and isolated missing/symlink source cases; fixture helpers stay test-local.
- `tests/distribution.test.mjs`: 0.4.2 registration expectations and MIT root metadata consistency.
- `package.json`, `package-lock.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json`: synchronized versions only; retain existing MIT fields.
- `README.md`: state that complete generated skill copies include LICENSE.
- `docs/verification.md`: add observed 0.4.2 results after execution; preserve earlier sections.
- This plan and its spec: scoped development records. Root `LICENSE` and canonical `SKILL.md` are not modified.

## Preparation

- [ ] Recheck branch/head, clean nonignored status, approved spec hash, and preserved checkout/client metadata snapshots.
- [ ] Run `setup` once; expect the one locked development package, no lifecycle scripts.
- [ ] Run `full` as baseline; stop and report unexpected failures before editing tests.

### Task 1: Retain notices at every distribution boundary

**Files:** modify `tests/packaging.test.mjs` and `scripts/package-local.mjs`.
**Interfaces:** consume unchanged `packageLocal({ host: 'claude' | 'codex', out: string })`; produce unchanged `{ directory, host }` plus license files at bundle root, generated skill root, and Codex embedded-runner root.

- [ ] Add test-local `assertNotice(file, expectedBytes)` with these assertions, preserving unexpected filesystem errors:

```js
const info = await lstat(file).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
assert.ok(info?.isFile(), `Missing regular license: ${file}`);
assert.deepEqual(await readFile(file), expectedBytes);
```

  Use it in both existing host tests for `LICENSE` and `skills/evolution-stress-test/LICENSE`. In the existing copied-skill test, after removing the original bundle, use it for `LICENSE` and `scripts/runner/LICENSE` under the installed skill. Preserve all existing executable checks and assert embedded package SPDX is `MIT`.
- [ ] Add isolated-source fixture cases in the same test file: copy source to an owned temporary directory excluding `.git`, `.worktrees`, `.superpowers`, `node_modules` and the root LICENSE, then dynamically import that copy's packager. No production source mutation or injection hook. For the missing case, invoke this valid imported packager and assert rejection mentioning LICENSE, output absence and no `.electric-sheep-package-*` residue. For the symlink case, create the fixture's LICENSE as a link to an owned external fixture file, assert `/Cannot package symlink/`, target bytes unchanged, no output and no stage residue. Only skip actual unsupported/permission-denied link creation, recording the reason.
- [ ] Run `packaging-tests` before changing the packager. Expect missing-notice assertion failures and missing-rejection failures, not import/setup failures. Record actual REDs and any platform skip.
- [ ] Update only the existing copy pipeline: root LICENSE in shared paths, generated skill LICENSE for both hosts after copying the skill tree, and LICENSE in the Codex embedded copy list. Reuse `copyPlain`; preserve output validation, staging/final rename and finally cleanup.
- [ ] Run `packaging-tests`, `targeted`, and `full`; expect all executed tests to pass and original copied-runtime/refusal behavior retained.
- [ ] Commit `fix: retain MIT notices in generated bundles` with only the two task files.

### Task 2: Align 0.4.2 identity and publish truthful local guidance

**Files:** remaining implementation files from File Map.
**Interfaces:** consume Task 1's licensed artifacts; produce synchronized 0.4.2 metadata and factual documentation. No additional runtime interfaces.

- [ ] Change both existing distribution-version expectations to `0.4.2`; assert root package and root lock SPDX `MIT`. Run `distribution`; expect the intended `0.4.1` versus `0.4.2` assertion REDs.
- [ ] Align the five release metadata files to 0.4.2, including both lock version locations; preserve dependency resolution/integrity and all non-version fields. Add README guidance about retaining the complete generated skill including its LICENSE.
- [ ] Run `distribution` and `targeted`; expect all executed tests passing.
- [ ] Run `format-owned`, `syntax`, `formatting`, `full`, and `package`. Check the npm JSON includes root LICENSE, package and plugin identities match, no production dependencies were introduced, root LICENSE/SKILL bytes are unchanged, and existing checkout/client snapshots remain intact. Run `git diff --check` and inspect the complete diff.
- [ ] Add a 0.4.2 verification section containing only actual RED/GREEN counts, skips and local checks. Explicitly leave live-client upgrades, model instruction-following and current-release CI unclaimed until observed.
- [ ] Commit `chore: release licensed bundles as 0.4.2`; run the full suite on the committed tree for task completion.
- [ ] Perform a separate whole-branch author self-review, archive/retain plan scratch, and report scope, evidence and limitations. Request publication approval; do not push/merge or remove the worktree automatically.

## Exact Local Command Inventory

All entries run in the isolated `licensed-bundles` worktree using Node 22, with timeout **300000 ms**. Machine-resolved executable/argv/cwd bindings are in the external `proposed-commands.json` for approval. Normal test fixture cleanup is included; no retained user workspace cleanup is included.

| ID | Arguments after the Node executable |
| --- | --- |
| setup | npm CLI `ci --ignore-scripts --no-audit --no-fund` (once) |
| full | npm CLI `--offline test` |
| packaging-tests | `--test tests/packaging.test.mjs` |
| distribution | `--test tests/distribution.test.mjs` |
| targeted | `--test tests/packaging.test.mjs tests/distribution.test.mjs` |
| format-owned | `node_modules/prettier/bin/prettier.cjs --write scripts/package-local.mjs tests/packaging.test.mjs tests/distribution.test.mjs package.json` |
| syntax | `scripts/check.mjs` |
| formatting | npm CLI `--offline run format:check` |
| package | npm CLI `pack --dry-run --json --offline --ignore-scripts` |

## Separate Follow-up Queue

Installation verification follows the merged release through normal targeted Claude/Pi updaters, with no blanket command acceptance, cache patch or unrelated package/self update. Its concrete operations are proposed separately outside the repository; this plan does not execute them. The fresh real-change pilot still needs a user-selected target and exact challenge/command approval. Do not treat old comparison findings as a new run or invoke additional models during this plan.

Self-review: all five Review Focus conditions have checks in Task 1 or Task 2; no public function signatures change. Tasks share only the licensed-artifact contract above. Inline execution is recommended for this small, sequential change; no independent review capability is available.
