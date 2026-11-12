# Verification record

This is a local preview, not a claim of universal reliability or production readiness.

## Environment inspected

- Windows / Git Bash; Node v22.23.4; Git 2.56.0.windows.3.
- Claude Code 2.1.302 is available. CLI help confirms `--plugin-dir` and `plugin validate --strict --json`.
- Codex is not on PATH.

## Evidence status

- Runner automated tests: `npm test` passed **80/80** locally on Windows, including a three-round sample success and an omitted-edge-case failure, plus **2/2** sample baseline tests (`node --test examples/checkout/checkout.test.mjs`).
- `npm run check`, `npm run format:check`, `npm pack --dry-run`, and `git diff --check` passed locally.
- Both host bundles and the copied standalone Codex skill runner are exercised from unrelated working directories by packaging tests.
- Claude manifest validation: `claude plugin validate --strict --json .` passed with **zero manifest errors/warnings** on 2.1.302. Its non-gating marketplace-install advice is intentionally not followed: this preview is not published in a marketplace. This is static validation, not model-driven discovery proof.
- Claude model-driven discovery and full exercise: **unverified**, no paid/inference call performed.
- Codex local skill and plugin live behavior: **unverified**. Generated standalone skill runner is tested independently of its original installation directory.
- Skill pressure scenarios/control comparisons: **unverified**; no independent agent tool available. Source tests cannot prove instruction following.
- Linux/macOS and Node 24: **unverified locally**. CI matrix is authored for Node 22/24 on Ubuntu, Windows, and macOS; an authored workflow is not an executed pass.
- Windows command tree timeout: exercised with a Node child spawning another Node process, PID-specific `taskkill /T /F`; graceful SIGINT handler exercised through the actual CLI. No general descendant-confinement guarantee.

## References inspected (2026-11-12)

- https://code.claude.com/docs/en/plugins-reference.md
- https://developers.openai.com/codex/skills.md
- https://developers.openai.com/codex/plugins.md
- https://developers.openai.com/plugins/build/plugins.md

Current OpenAI docs support `.codex-plugin/plugin.json` as a compatibility fallback and `.agents/skills` for local standalone skills. This project uses those small existing mechanisms, not a portal submission or an asserted official listing. No ChatGPT web/mobile or cloud execution support is claimed: a local Git/Node environment is required.
