# Verification record

This is a local preview, not a claim of universal reliability or production readiness.

## Environment inspected

- Windows / Git Bash; Node v22.23.4; Git 2.56.0.windows.3.
- Claude Code 2.1.302 is available. CLI help confirms `--plugin-dir` and `plugin validate --strict --json`.
- Codex is not on PATH.

## Electric Sheep 0.3.0 follow-up and closing verification (2026-11-13)

- Final complete implementation/review suite: **156/156** passing on the inspected Windows/Node 22 environment. New tests exercise authored follow-up validation, stable dependency order, priority/provenance and hypothesis/applicability gates; saved input reuse; five deliverables plus hash manifest; missing/tampered/symlinked output/evidence; and legacy/partial/cleaned reporting.
- Real temporary Git worktrees exercise output-before-deletion, final tracked/new/binary diff replay, ignored-secret exclusion, explicit consent, outside-worktree cwd, pending command recovery, locked removal/retry, original outcome preservation, missing source/registration, foreign replacement paths, repeat cleanup, and explicit full-evidence deletion. Source checkout snapshots remain unchanged.
- Reproduced a real Windows Git behavior: `worktree remove --force` can unregister a worktree but leave a junction entry/directory behind. Previous cleanup silently marked it cleaned. The regression now checks both workspace absence and unchanged source; only the previously validated owned residue is removed without following junction targets.
- Author review reproduced four cleanup failures: changed historical evidence, changed/missing deliverables, and a missing prior publication manifest were silently re-hashed/regenerated before removal. Cleanup now verifies the previous package first; four RED-to-GREEN regressions prove refusal without deletion. An additional test preserves legacy report-only upgrades. A separate real locked-worktree purge test exposed an unconditional retention promise; destructive-purge errors now warn that removal may be partial instead. No partial-filesystem-purge failure was induced.
- Simulated-host CLI scenarios cover three-round success with mixed authored findings, terminal failure, and a blocked baseline. They verify a usable package/cleanup choice before deletion and persisted follow-up after report regeneration. These are deterministic host edits, **not model-driven sessions**.
- Both host bundles import the complete runner. The generated Codex skill is copied away from its bundle, the original bundle is removed, then its own runner consumes the bundled follow-up example, publishes reports, and executes verified cleanup from unrelated spaced/Unicode fixture paths. This is portable-runtime delivery, not a live Codex host test.
- `npm run check`, `npm run format:check`, `npm pack --dry-run`, `git diff --check`, and strict Claude marketplace/plugin manifest validation passed (zero validation errors, warnings, notes, or advice). Release identities are aligned to **0.3.0**; run/plan schema remains **1**. Existing evidence directories are not migrated or deleted.
- No dependency installation, model calls, changes to real client settings, or cleanup of user run data was performed. Local tests are not claims of current-release Linux/macOS/Node 24 success; consult the feature PR's actual CI checks.
- Canonical closing instructions changed, but no fresh-context model tool was available for pressure/no-guidance-control scenarios. CLI consent/output/postconditions and executable reference data are tested; whether Claude/Codex/Pi/OpenCode/ChatGPT reliably presents and follows the closing conversation remains **unverified**. Hashes record artifact completeness/integrity, not the truth of agent judgments or security confinement.
- Review is author self-review, not independent assurance. Persistent GitHub installation and future-version client upgrade behavior were not re-tested for this release.

## Multi-client README verification (2026-11-13)

This documentation-only follow-up adds installation recipes, not new runtime integrations or universal support guarantees.

- Inspected current official OpenAI skill/plugin and OpenCode skill documentation, plus the installed Pi 1.5.2 package, skill, and CLI documentation. OpenAI currently documents ChatGPT desktop personal marketplaces and the `.codex-plugin/plugin.json` compatibility fallback; the README labels that recipe experimental rather than implying a public listing or verified ChatGPT behavior.
- Executed the README's literal standalone clone/build commands against **public GitHub `main`**, separately in temporary homes for Bash/Git Bash and Windows PowerShell. No dependency installation was needed. The production runner/bundler is unchanged from that source.
- Executed both shells' documented Codex and OpenCode copy commands. Each installed folder matched the complete generated skill byte-for-byte. A second execution preserved the existing installation without nesting or overwriting it. Both documented installed-runner `--help` commands worked from an unrelated working directory.
- Parsed the ChatGPT example marketplace JSON, resolved its home-relative source path to the complete bundle, checked the matching compatibility-manifest identity and skill path, and executed that bundle's runner. **This is a catalog/package smoke check, not a ChatGPT installation, UI, discovery, or execution test.**
- Used Pi 1.5.2's real `DefaultResourceLoader` with an in-memory local package declaration, an isolated temporary agent/home, offline mode, telemetry disabled, and extensions/context/prompts/themes disabled. It discovered exactly one skill, `evolution-stress-test`, with no diagnostics and `disableModelInvocation: true`. Its discovered runner executed from an unrelated directory. **This verifies native local package discovery, not `pi install` from GitHub, interactive command routing, or model instruction following.**
- Checked README internal navigation anchors and successful HTTP responses for the referenced current Pi package/skill guides. The full automated suite passed **94/94**, as did `npm run check`, `npm run format:check`, `npm pack --dry-run`, and `git diff --check`.
- Whole-diff author self-review only; no independent reviewer tool was available. No runtime, manifest, dependency, or schema changes were made.
- Only owned temporary clone/bundle/home directories were removed. Real client settings, existing installations, and run evidence were not changed. No model calls or dependency installation were performed.
- Codex, ChatGPT, and OpenCode live host behavior remains unverified. No new Claude installation check was performed in this follow-up; prior isolated local-marketplace evidence is below. Public Git clones do not establish either Claude's or Pi's native GitHub install transport, and no future-version upgrade was tested.

## Electric Sheep 0.2.0 installation verification (2026-11-13)

- Code commit `abfc736`: complete automated suite **94/94** passes locally, including actual new-default storage, explicit-root schema-1 access, renamed CLI/report/checkpoint identity, catalog delivery, both bundles, and the independently copied Codex runner.
- `npm run check`, `npm run format:check`, `npm pack --dry-run`, and `git diff --check` pass. Strict validation of both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` passes with zero errors, warnings, or advice on Claude Code 2.1.302.
- **Actual persistent local marketplace installation passed**, using a fresh Git clone of the committed feature branch, an unrelated working directory, and a newly created temporary `CLAUDE_CONFIG_DIR`, `HOME`, and `USERPROFILE`. Initial installed-plugin and marketplace lists were empty.
- Marketplace add and `install electric-sheep@electric-sheep --scope user --json` succeeded. Claude listed the plugin as enabled, user-scoped, version `0.2.0`; its cached `skills/evolution-stress-test/scripts/run.mjs --help` executed successfully without an npm installation.
- A second isolated check also successfully installed the bare name `electric-sheep` using `--marketplace` with the clean clone's path, automatically registering the catalog. This verifies the shortcut mechanics, not the future GitHub/main source.
- Marketplace refresh, plugin update, uninstall, and marketplace removal succeeded. The update exercised the **already-up-to-date** path at `0.2.0`, not a download of a later release. Final plugin/marketplace lists were empty; only the owned temporary clone/profile/home were removed. The real Claude configuration was not used or changed. No model calls were made.
- The GitHub `main` installation path awaits this change's merge; the verified installation source was a clean local clone, not a claimed public-main install. Current-release cross-platform results are recorded in its PR checks; the original-release CI links below are historical evidence, not substitutes for current checks.
- Whole-branch author self-review found no critical/important issues; no independent reviewer tool was available. The pre-existing packaged-README behavioral-scenarios link remains a deferred minor.
- Canonical skill instructions and its explicit trigger are unchanged. Model-driven Claude/Codex exercise behavior, independent review, and skill pressure scenarios remain unverified. Installation success is not proof of instruction-following reliability.

## Original release evidence

- Runner automated tests: `npm test` passed **89/89** locally on Windows after the final review fix pass, including a three-round sample success and an omitted-edge-case failure, plus **2/2** sample baseline tests (`node --test examples/checkout/checkout.test.mjs`).
- `npm run check`, `npm run format:check`, `npm pack --dry-run`, and `git diff --check` passed locally.
- Both host bundles and the copied standalone Codex skill runner are exercised from unrelated working directories by packaging tests.
- Original-release Claude manifest validation: `claude plugin validate --strict --json .` passed with **zero manifest errors/warnings** on 2.1.302. At that time the repository had no marketplace catalog, so its non-gating marketplace-install advice was deferred. Version 0.2.0 adds the self-hosted catalog and validates both manifests above. Static validation is not model-driven discovery proof.
- Claude model-driven discovery and full exercise: **unverified**, no paid/inference call performed.
- Codex local skill and plugin live behavior: **unverified**. Generated standalone skill runner is tested independently of its original installation directory.
- Skill pressure scenarios/control comparisons: **unverified**; no independent agent tool available. Source tests cannot prove instruction following.
- Cross-platform CI **executed and passed** on code commit `1e13e9c`: Node 22 and 24 on `ubuntu-latest`, `windows-latest`, and `macos-latest` (all six matrix combinations). Each job ran dependency installation with scripts disabled, formatting/syntax checks, the 89-test suite including packaging/e2e regressions, and npm dry-run packaging. Evidence: [PR workflow run](https://github.com/Giorgix/electric-sheep/actions/runs/43279737926) and [push workflow run](https://github.com/Giorgix/electric-sheep/actions/runs/43279737506). Linux/macOS and Node 24 remain CI verification, not local-machine or live-model verification.
- Windows command tree timeout: exercised with a Node child spawning another Node process, PID-specific `taskkill /T /F`; graceful SIGINT handler exercised through the actual CLI. An orphan retaining inherited pipes also reproduces the wait-limit behavior: after best-effort termination, the runner stops waiting after a two-second grace and labels output incomplete. Escaped descendants may remain; no general confinement guarantee.

## Original release whole-branch review

Author self-review only (no independent reviewer tool). Nine new regressions were observed failing, then passing, covering source-index environment routing, experimental and initial Git filters, Windows argv limits with 500 filenames, applicable checkpoint patches, blocked infrastructure prechecks, protected baseline resume, reproducible command inventories, and orphan-held output pipes. The final complete suite passed 89/89.

Minor deferred: the packaged README's behavioral-scenarios link targets a source-only test document; this file still states the live-validation limitation. No independent/model-driven validation is inferred from these regressions.

## References inspected (2026-11-12)

- https://code.claude.com/docs/en/plugins-reference.md
- https://developers.openai.com/codex/skills.md
- https://developers.openai.com/codex/plugins.md
- https://developers.openai.com/plugins/build/plugins.md

Current OpenAI docs support `.codex-plugin/plugin.json` as a compatibility fallback and `.agents/skills` for local standalone skills. This project uses those small existing mechanisms, not a portal submission or an asserted official listing. No ChatGPT web/mobile or cloud execution support is claimed: a local Git/Node environment is required.
