# Electric Sheep

**Make AI-generated code survive the next reasonable changes.**

Electric Sheep is a local skill/plugin preview for Claude Code and Codex. Instead of only reviewing the initial solution, your coding agent implements three realistic successive challenges in a disposable Git worktree. A small runner records checks, frozen acceptance tests, checkpoints, and evidence-backed reports.

It targets happy-path assumptions, missed edge cases, brittle designs, spaghetti code, and unjustified complexity. It does not treat file length as a verdict or manufacture an arbitrary quality score.

## Requirements

- Node.js **22+** and Git.
- A committed, clean target Git checkout, including no untracked files.
- Your coding host's usual model, permissions, and authentication. No separate API key or server.

No production npm dependencies or `npm install` are needed to run the tool. Development tooling is separate if present.

## Claude Code: local preview

Clone/download this repository, then launch Claude Code in your project with the plugin's absolute path:

```bash
claude --plugin-dir /absolute/path/to/electric-sheep
```

Invoke explicitly:

```text
/electric-sheep:evolution-stress-test the checkout module
```

The agent proposes the three challenges and commands before running project code. There is no automatic bootstrap hook or expensive after-every-edit exercise.

## Codex: local standalone skill preview

Build a complete local bundle outside this repository:

```bash
node scripts/package-local.mjs --host codex --out ../electric-sheep-codex
```

Copy **the entire generated** `skills/evolution-stress-test` folder into an unused `$HOME/.agents/skills/evolution-stress-test` directory. That generated folder includes its runner: copying only `SKILL.md` or the source skill folder is insufficient. Restart Codex if needed, then invoke:

```text
$evolution-stress-test the checkout module
```

The bundle also includes a `.codex-plugin/plugin.json` compatibility manifest for local plugin authoring. It is not an official marketplace listing. Codex live installation/instruction-following remains unverified here.

## How an exercise works

1. Select a feature or module and approve three realistic cumulative requirements and concrete commands.
2. Establish a passing baseline inside an isolated worktree.
3. Freeze acceptance checks, implement the next requirement, then run new and earlier checks.
4. Allow one repair attempt per challenge; stop rather than silently weakening tests.
5. Produce local Markdown and JSON reports. Useful fixes are offered separately; nothing is merged automatically.

Example pressures: a second business rule, duplicate requests, empty inputs, monetary boundaries, or partial failure. Requirements are proportional to your project, not an excuse to add enterprise infrastructure.

## Important limits

**A Git worktree is not a security sandbox.** Project commands can access inherited credentials, network, and host resources under your coding tool's permissions. Use a suitable sandbox for untrusted code. No production secrets, unapproved dependency installation, or live-system exercises by default.

Acceptance hashes are audit evidence, not tamper-proof controls against an agent with filesystem access. Reports distinguish recorded outcomes from agent judgment and baseline defects from experimental defects. Single-agent evaluation is not independent review. Logs remain local but can contain secrets; the coding model still uses its provider's privacy settings.

The runner has automated local tests. **Real model-driven behavior is not yet validated.** See [verification](docs/verification.md) for exact host/OS status and [behavioral scenarios](tests/skill-scenarios.md) for outstanding evaluations.

## More

- [CLI usage and plan schema](docs/usage.md)
- [Sample checkout exercise](examples/checkout/README.md)
- [Approved design (source repository)](https://github.com/Giorgix/electric-sheep/blob/main/docs/superpowers/specs/2026-11-12-evolution-stress-test-design.md)

For development: `npm test` and `npm run check`. Optional formatting uses the pinned development-only Prettier dependency: `npm ci --ignore-scripts`, then `npm run format` or `npm run format:check`. The runner itself still needs no install. Development uses feature branches and PRs against `main`; never push directly to `main`.
