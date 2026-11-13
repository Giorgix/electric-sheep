# Electric Sheep: persistent GitHub installation and consistent naming

Status: user-approved design and implementation plan; implemented natively and prepared for human PR review. GitHub/main installation awaits merge.

## Intent and scope

Make the public `Giorgix/electric-sheep` repository directly installable as a persistent Claude Code plugin, following Superpowers' marketplace convention. Use **Electric Sheep** for human-readable branding and **`electric-sheep`** for machine identifiers throughout the tracked project. Preserve the existing evolution-testing behavior and safety restrictions.

## Approaches

- **Selected: catalog in this repository.** Superpowers' own `.claude-plugin/marketplace.json` advertises its root plugin with `source: "./"`. A one-plugin catalog here gives native install/update/uninstall without another repository.
- A separate marketplace repository, as used by `obra/superpowers-marketplace`, supports multiple independently maintained plugins but adds unnecessary maintenance for this project.
- Clone plus `--plugin-dir` remains a development fallback, not the persistent installation path.

## Installation contract

Create `.claude-plugin/marketplace.json` with catalog name `electric-sheep`, owner `Giorgix`, and one plugin named `electric-sheep`, sourced from `./`. Plugin, catalog entry, Codex manifest, and npm package versions must agree. Use `0.2.0` for the renamed release; keep run and plan schema version `1`.

Document these commands inside Claude Code:

```text
/plugin marketplace add Giorgix/electric-sheep
/plugin install electric-sheep@electric-sheep
```

Also document the current Claude CLI shortcut:

```sh
claude plugin install electric-sheep --marketplace Giorgix/electric-sheep
```

Installation defaults to user scope. Start a fresh Claude session in the target project after installation, then explicitly invoke `/electric-sheep:evolution-stress-test TARGET`. No launch flag is required. Document marketplace refresh, plugin update, and uninstall using verified CLI help. Explain that an interactive session needs a real terminal; tool-run/noninteractive invocation needs a prompt.

## Rename contract

- Rename the existing CLI entry point to `bin/electric-sheep.mjs`; update npm bin registration, lockfile metadata, CLI help, helper imports, host metadata, report headings, checkpoint identity/messages, bundle paths, and diagnostic text.
- Rebrand all tracked documentation, including original design/plan documents, and fixture/temp prefixes. Audit both tracked filenames and content for stale branding.
- New runs default to `~/.electric-sheep/runs`. Do not move, delete, or reinterpret existing run directories. Existing schema-1 runs remain accessible through their explicit `--runs-root` location.
- Preserve the descriptive canonical skill identifier `evolution-stress-test`; the Claude plugin namespace changes to `electric-sheep`. Update the Codex UI display name to include Electric Sheep without changing its explicit skill invocation.
- Do not add old-name command aliases, rename the user's checkout directories, edit untracked original documents in the main checkout, or rewrite Git history.

## Delivery and validation

Keep the dependency-free runtime, portable skill, complete standalone Codex bundle, approval gates, and worktree isolation warnings. Include the catalog in Claude local bundles; npm's existing `.claude-plugin/` allowlist includes it. Do not imply an official marketplace listing or native Codex GitHub installation support.

Use test-first changes for naming and catalog delivery. Exercise actual CLI output/default storage, old-run access through an explicit root, installed/bundled runners from an unrelated cwd, catalog-to-plugin/version agreement, and absence of the obsolete binary. Run the complete suite, formatting/syntax checks, npm dry-run packaging, and strict Claude plugin/catalog validation.

Test persistent add/install/update/uninstall against the committed local checkout using a fresh temporary `CLAUDE_CONFIG_DIR`. Locate the installed cached plugin and execute its runner; do not call a model or modify the user's real Claude settings. GitHub `main` installation cannot be claimed tested until this PR is merged; report that distinction explicitly.

## Git workflow and limits

Use `feat/github-install-electric-sheep` based on merged `origin/main`, in the existing isolated development worktree. Preserve the original main checkout and its untracked docs. Commit/push only the feature branch and open a PR against `main`; do not merge it. Independent agent/model behavior remains unverified; installation mechanics are not proof of skill compliance.
