# Verification record

This is a local preview, not a claim of universal reliability or production readiness.

## Environment inspected

- Windows / Git Bash; Node v22.23.4; Git 2.56.0.windows.3.
- Claude Code 2.1.302 is available. CLI help confirms `--plugin-dir` and `plugin validate --strict --json`.
- Codex is not on PATH.

## Evidence status

- Runner automated tests: tasks are verified as implemented; final release count recorded after the complete suite.
- Claude manifest/skill static validation: pending final packaging check.
- Claude model-driven discovery and full exercise: **unverified**, no paid/inference call performed.
- Codex local skill and plugin live behavior: **unverified**. Generated standalone skill runner is tested independently of its original installation directory.
- Skill pressure scenarios/control comparisons: **unverified**; no independent agent tool available. Source tests cannot prove instruction following.
- Linux/macOS and CI: workflow planned; not yet executed in this local environment.
- Windows command tree timeout: exercised with a Node child spawning another Node process, PID-specific `taskkill /T /F`; graceful SIGINT handler exercised through the actual CLI. No general descendant-confinement guarantee.

## References inspected (2026-11-12)

- https://code.claude.com/docs/en/plugins-reference.md
- https://developers.openai.com/codex/skills.md
- https://developers.openai.com/codex/plugins.md
- https://developers.openai.com/plugins/build/plugins.md

Current OpenAI docs support `.codex-plugin/plugin.json` as a compatibility fallback and `.agents/skills` for local standalone skills. This project uses those small existing mechanisms, not a portal submission or an asserted official listing. No ChatGPT web/mobile or cloud execution support is claimed: a local Git/Node environment is required.
