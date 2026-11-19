# Add the MIT License — implementation plan

> Execute inline with `executing-plans` after user review. No additional model/reviewer session.

Design: `docs/superpowers/specs/2026-11-18-mit-license-design.md`.
Worktree: `D:/CODING/electronic-sheeps/.worktrees/mit-license`.
Branch: `docs/add-mit-license`; base: `2764e4704009d0d37aa23375f2a3a80aec4f8095`.

## File map

- Create `LICENSE`: standard MIT License, `Copyright (c) 2026 Giorgix`.
- Modify `package.json`: add top-level `"license": "MIT"` next to version.
- Modify `package-lock.json`: add `"license": "MIT"` to `packages[""]` only.
- Modify `README.md`: append `## License` with `MIT — see [LICENSE](LICENSE).`.
- Retain this plan and its short design in the branch.

## Task 1: License, metadata and documentation

Interfaces: repository-root MIT notice; npm SPDX metadata; README relative link.
No runtime API, schema, version, dependencies or bundle-copy behavior changes.

- [ ] Run the full existing test suite as a clean baseline; stop on unexpected failures.
- [ ] Write the standard MIT terms without custom restrictions; add the two metadata fields and README section above.
- [ ] Read the full license back; verify title, approved notice, grant, notice-retention condition and complete warranty/liability disclaimer. Parse both JSON files and assert `package.license === lock.packages[""].license === "MIT"`; verify the README target exists. Preserve version 0.4.1 and the Prettier resolution/integrity.
- [ ] Run targeted tests, full tests, syntax check and offline npm dry-run below. Assert the dry-run file list includes root `LICENSE`. Run `git diff --check` and review the entire diff; verify original checkout HEAD/status and older worktree state remain unchanged.
- [ ] Commit only the six scoped files with `docs: add MIT license`. Report actual results and retain the worktree. Await separate publication approval before pushing/opening a PR against `main`; never merge automatically.

Documentation/metadata-only: no runtime implementation or new behavioral test is needed. Existing tests plus direct license/metadata/archive checks provide the relevant evidence; do not manufacture a RED test for unchanged code.

## Project command inventory

All commands use executable `C:/Users/jorge/AppData/Local/pi-node/current/node.exe`, the worktree cwd above, and timeout 300000 ms. No dependency installation is proposed.

- Full tests, before and after: `C:/Users/jorge/AppData/Local/pi-node/current/node_modules/npm/bin/npm-cli.js --offline test`.
- Targeted: `--test tests/distribution.test.mjs tests/packaging.test.mjs`.
- Syntax: `scripts/check.mjs`.
- Packaging: `C:/Users/jorge/AppData/Local/pi-node/current/node_modules/npm/bin/npm-cli.js pack --dry-run --json --offline --ignore-scripts`.

Expected: no failed tests, successful syntax/whitespace checks, valid matching SPDX metadata, and the license included in the npm dry-run. Existing platform-specific skips must remain explicitly reported.

## Review focus

Check exact holder/year and unmodified terms; root-versus-dependency lock metadata; no incidental version/dependency changes; a working relative README link; inclusion despite npm's explicit `files` list. Standalone generated skills/bundles do not yet inherit the new root license: preserve their current behavior in this GitHub-repository-only task and disclose that separate distribution follow-up.

Self-review: each requested file/change and each review-focus item has a corresponding verification above. No new functions, dependencies, model calls, remote writes, installation updates or cleanup are authorized by this plan.
