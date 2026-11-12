# Verification record

This is a local preview, not a claim of universal reliability or production readiness.

## Environment inspected

- Windows / Git Bash; Node v22.23.4; Git 2.56.0.windows.3.
- Claude Code 2.1.302 is available. CLI help confirms `--plugin-dir` and `plugin validate --strict --json`.
- Codex is not on PATH.

## Evidence status

- Runner automated tests: `npm test` passed **89/89** locally on Windows after the final review fix pass, including a three-round sample success and an omitted-edge-case failure, plus **2/2** sample baseline tests (`node --test examples/checkout/checkout.test.mjs`).
- `npm run check`, `npm run format:check`, `npm pack --dry-run`, and `git diff --check` passed locally.
- Both host bundles and the copied standalone Codex skill runner are exercised from unrelated working directories by packaging tests.
- Claude manifest validation: `claude plugin validate --strict --json .` passed with **zero manifest errors/warnings** on 2.1.302. Its non-gating marketplace-install advice is intentionally not followed: this preview is not published in a marketplace. This is static validation, not model-driven discovery proof.
- Claude model-driven discovery and full exercise: **unverified**, no paid/inference call performed.
- Codex local skill and plugin live behavior: **unverified**. Generated standalone skill runner is tested independently of its original installation directory.
- Skill pressure scenarios/control comparisons: **unverified**; no independent agent tool available. Source tests cannot prove instruction following.
- Cross-platform CI **executed and passed** on code commit `1e13e9c`: Node 22 and 24 on `ubuntu-latest`, `windows-latest`, and `macos-latest` (all six matrix combinations). Each job ran dependency installation with scripts disabled, formatting/syntax checks, the 89-test suite including packaging/e2e regressions, and npm dry-run packaging. Evidence: [PR workflow run](https://github.com/Giorgix/electric-sheep/actions/runs/43279737926) and [push workflow run](https://github.com/Giorgix/electric-sheep/actions/runs/43279737506). Linux/macOS and Node 24 remain CI verification, not local-machine or live-model verification.
- Windows command tree timeout: exercised with a Node child spawning another Node process, PID-specific `taskkill /T /F`; graceful SIGINT handler exercised through the actual CLI. An orphan retaining inherited pipes also reproduces the wait-limit behavior: after best-effort termination, the runner stops waiting after a two-second grace and labels output incomplete. Escaped descendants may remain; no general confinement guarantee.

## Whole-branch review

Author self-review only (no independent reviewer tool). Nine new regressions were observed failing, then passing, covering source-index environment routing, experimental and initial Git filters, Windows argv limits with 500 filenames, applicable checkpoint patches, blocked infrastructure prechecks, protected baseline resume, reproducible command inventories, and orphan-held output pipes. The final complete suite passed 89/89.

Minor deferred: the packaged README's behavioral-scenarios link targets a source-only test document; this file still states the live-validation limitation. No independent/model-driven validation is inferred from these regressions.

## References inspected (2026-11-12)

- https://code.claude.com/docs/en/plugins-reference.md
- https://developers.openai.com/codex/skills.md
- https://developers.openai.com/codex/plugins.md
- https://developers.openai.com/plugins/build/plugins.md

Current OpenAI docs support `.codex-plugin/plugin.json` as a compatibility fallback and `.agents/skills` for local standalone skills. This project uses those small existing mechanisms, not a portal submission or an asserted official listing. No ChatGPT web/mobile or cloud execution support is claimed: a local Git/Node environment is required.
