# Electric Sheep GitHub Installation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistently install Electric Sheep from its public GitHub repository and consistently use the new name.

**Architecture:** Add a one-plugin Claude marketplace catalog pointing at the existing repository root, following Superpowers' own catalog. Mechanically rename existing distribution identifiers and text without changing the evolution protocol or schema. Validate real installed artifacts with an isolated Claude configuration.

**Tech Stack:** Node.js 22+, Git, dependency-free ESM runtime, built-in Node tests, pinned existing dev-only Prettier, installed Claude CLI (manual validation only).

**Spec:** `docs/superpowers/specs/2026-11-13-electric-sheep-github-install-design.md`

## Global Constraints

- Display name: **Electric Sheep**; technical identifier: **`electric-sheep`**.
- Catalog name and plugin name: `electric-sheep`; source: `./`; owner: `Giorgix`.
- Release version: `0.2.0`; keep run and plan schema version `1`.
- New default run root: `~/.electric-sheep/runs`; preserve existing data and explicit `--runs-root` access.
- Preserve canonical skill identifier `evolution-stress-test`, explicit invocation, runtime dependency limits, and safety restrictions.
- No model calls, user-config installation, automatic data migration, legacy command aliases, checkout-directory rename, or Git history rewrite.
- Feature branch `feat/github-install-electric-sheep`; PR against `main`; never push directly to or merge `main`.
- Native execution is the established method; no subagent tool is available. Final review must be labeled self-review unless an independent reviewer becomes available.

## Review Focus

1. A native marketplace install must contain a working runner, not only a visible skill; execute the cached skill runner from an unrelated cwd (Task 2).
2. A copied standalone Codex skill must still locate its embedded runtime after the binary rename (Task 1).
3. New default storage must actually use the new directory without touching existing explicit-root schema-1 runs (Task 1).
4. Bundle catalogs must resolve their plugin source inside the bundle and agree with all release metadata (Task 2).
5. Noninteractive launch errors must not be described as plugin failures; installation docs distinguish interactive chat from prompt-bearing CLI use (Task 2).

## Task 1: Rename the complete existing distribution

**Files:** Rename CLI entry to `bin/electric-sheep.mjs`; modify `package.json`, `package-lock.json`, both host plugin manifests, `src/{cli,workspace,protocol,report}.mjs`, `scripts/package-local.mjs`, skill runner diagnostics/UI metadata, tracked docs, and affected tests/helpers. Create `tests/distribution.test.mjs`.

**Interfaces:** Preserve `main(argv, {stdout, stderr})`, `packageLocal({host, out})`, and all store/protocol APIs. Expose the renamed npm binary `electric-sheep` at `bin/electric-sheep.mjs`. New default storage is `join(homedir(), '.electric-sheep/runs')`; explicit roots retain current semantics.

- [x] **Step 1: Write naming/default-storage regressions.** Assert package/lockfile/Claude/Codex names equal `electric-sheep`, all versions equal `0.2.0`, and npm bin equals `{'electric-sheep': 'bin/electric-sheep.mjs'}`. Execute the registered binary and assert `Electric Sheep` and the new default root in help. Start a real fixture through the CLI with fresh child-process `HOME` and `USERPROFILE`, no `--runs-root`, and assert returned run storage is inside `.electric-sheep/runs`. Inspect the bin directory and assert its only entrypoint is `electric-sheep.mjs`.
- [x] **Step 2: Observe RED.** Run `node --test tests/distribution.test.mjs`; verify failures identify old metadata/storage/binary rather than fixture mistakes. Update existing packaging/skill/report assertions to the requested branding and observe their expected failures too.
- [x] **Step 3: Perform the mechanical rename.** Update the declared files, all tracked branding references and temporary prefixes, and both npm lockfile package records/bin metadata. Set release versions to `0.2.0`, keep schema/store logic unchanged, and update human-readable Codex UI branding. Rename the entry file; do not retain an old-name shim. Document explicit-root access to previous run data without moving it. Leave external checkout paths and original user files untouched.
- [x] **Step 4: Verify GREEN and compatibility.** Run the new tests plus CLI/store/report/packaging/skill suites, then `npm test`. Existing explicit-root workflow tests must still pass, including status/report after source moves. Both host bundles and the independently copied Codex skill must run from an unrelated cwd. Audit tracked filenames/content for obsolete branding, including the original plan/spec. Run formatting/syntax checks and `git diff --check`.
- [x] **Step 5: Commit.** `git add` only the intended rename, metadata, tests, and docs; commit `refactor: rename distribution to electric sheep`.

## Task 2: Add and verify persistent marketplace delivery

**Files:** Create `.claude-plugin/marketplace.json`; modify `scripts/package-local.mjs`, `tests/distribution.test.mjs`, `tests/packaging.test.mjs`, `README.md`, `docs/usage.md`, and `docs/verification.md`.

**Interfaces:** The new catalog contains one `plugins` entry whose `name` and `version` match `.claude-plugin/plugin.json`, whose `source` is `./`, and whose `strict` is `true`. `packageLocal({host:'claude', out})` includes the catalog; Codex bundling and embedded-runtime behavior remain unchanged.

- [x] **Step 1: Write catalog delivery regressions.** Read/parse the source catalog and assert its name is `electric-sheep`, owner is `Giorgix`, and its sole plugin matches release metadata with `source: './'` and `strict: true`. Resolve that source to the root manifest and real skill runner. Build a Claude bundle, assert it contains an equivalent catalog, and execute the catalog-resolved skill runner from an unrelated cwd. Assert Codex still bundles its own manifest and complete standalone skill.
- [x] **Step 2: Observe RED.** Run `node --test tests/distribution.test.mjs tests/packaging.test.mjs`; confirm the new catalog assertions fail because the catalog is missing, with naming tests still green.
- [x] **Step 3: Add the minimal catalog and packaging entry.** Follow Superpowers' same-repository `./` catalog pattern, using the exact spec names/owner/version. Include the catalog in the Claude allowlist; retain npm's existing `.claude-plugin/` inclusion. No hooks, model backend, bootstrap script, or production dependency is added.
- [x] **Step 4: Document the complete user workflow.** Lead README with persistent GitHub marketplace add/install and the verified CLI shortcut; explain fresh-session activation and `/electric-sheep:evolution-stress-test TARGET`. Document update/uninstall, the clone fallback, explicit-root access to existing runs, and interactive-terminal versus noninteractive prompt requirements. Verify command syntax with `claude plugin --help` and relevant subcommand help before documenting it. Keep Claude/Codex compatibility and model-validation claims accurate.
- [x] **Step 5: Verify GREEN, actual installation, and review.** Run `npm test`, `npm run check`, `npm run format:check`, `npm pack --dry-run`, `git diff --check`, and strict Claude validation of the catalog and plugin manifest. Commit the intended code, then use a fresh temporary `CLAUDE_CONFIG_DIR` to add the committed local marketplace and install the plugin at user scope. Locate its cached skill and execute its runner from an unrelated cwd; exercise update/uninstall and remove only the owned temporary config. Never invoke a model or alter the real Claude config. Record exact results, self-review the complete diff, and disclose that GitHub/main installation awaits merge.
- [ ] **Step 6: Commit and deliver.** Commit the verification record, push only `feat/github-install-electric-sheep`, create a PR targeting `main`, and observe the actual CI matrix. Preserve the development worktree for review; do not merge. Report final identifiers, install commands, results, limits, and any rulings.

## Review and handoff

- Self-review: spec requirements map to Tasks 1–2; all five review-focus conditions have an owning verification step. No new production API or runtime dependency is required.
- Baseline: merged `origin/main` at `a80c84d`; `npm test` passed 89/89 locally on Windows, Node `v22.23.4`, before implementation.
- [x] User review confirms this plan captures persistent GitHub installation and the requested complete rename.
- [x] Execute natively after that review, following `executing-plans` (execution in progress).
