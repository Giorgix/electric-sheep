# Electric Sheep

**Make AI-generated code survive the next reasonable changes.**

Electric Sheep is a portable local coding-agent skill, with a Claude Code plugin, a native Pi package, and manual installation recipes for Codex, ChatGPT desktop, and OpenCode. Instead of only reviewing the initial solution, your coding agent implements three realistic successive challenges in a disposable Git worktree. A small runner records checks, frozen acceptance tests, checkpoints, and evidence-backed reports.

It targets happy-path assumptions, missed edge cases, brittle designs, spaghetti code, and unjustified complexity. It does not treat file length as a verdict or manufacture an arbitrary quality score.

## Requirements

- Node.js **22+** and Git.
- A committed, clean target Git checkout, including no untracked files.
- Your coding host's usual model, permissions, and authentication. No separate API key or server.

No production npm dependencies or `npm install` are needed to run the tool. Development tooling is separate if present.

## Choose your coding tool

Install for the **application you run**, not the model you select. For example, Claude or GPT inside Pi still uses the Pi installation and `/skill:` command—not Claude Code's `/plugin` commands.

| Coding tool | Installation | Explicit invocation | Verification status |
| --- | --- | --- | --- |
| [Claude Code](#claude-code-persistent-github-installation) | GitHub marketplace; user scope | `/electric-sheep:evolution-stress-test TARGET` | Isolated local marketplace install checked |
| [Codex CLI / IDE](#codex-local-standalone-skill-preview) | Complete standalone skill in `~/.agents/skills/` | `$evolution-stress-test TARGET` | Packaged runner checked; live host unverified |
| [ChatGPT desktop](#chatgpt-desktop-experimental-local-plugin) | Experimental personal marketplace | Type `@` and select the installed skill | Documentation-based recipe; live host unverified |
| [Pi](#pi-native-package) | Native Git package; user scope | `/skill:evolution-stress-test TARGET` | Native local discovery and runner checked on Pi 1.5.2 |
| [OpenCode](#opencode-native-agent-skill) | Complete standalone skill in `~/.config/opencode/skills/` | `@evolution-stress-test TARGET` on current versions | Documentation-based recipe; live host unverified |
| [Other Agent Skills clients](#other-agent-skills-clients) | Manual complete-skill installation | Client-specific | Not individually verified |

Replace `TARGET` with a feature or module, such as `the checkout module`. After installation, start your coding tool **in the clean target project**, then [invoke the skill with a plain-language request](#how-to-use-it-three-examples). The agent must propose three challenges and concrete commands for your approval before executing project code. Installing a skill does not authorize a run.

**These are preview integrations, not equivalent support claims.** GitHub installation transport and real model-driven exercises have not been verified for every client. See [verification](docs/verification.md) for the evidence and limits.

## How to use it: three examples

After installing, open your coding tool in the repository you want to test and send the skill invocation **as a chat message**, not a terminal command.

**What goes after the skill command?** A plain-language description of what to test, optionally followed by concerns or constraints:

```text
<your tool's skill invocation> [feature, module, or path to test] [optional concerns and constraints]
```

The brackets above explain the shape; do not type them literally. There is **no required `--scope` flag, special argument format, or JSON plan for you to write**. The agent turns your request into a bounded scope and a proposed exercise. A scope can be a module name, a repository-relative path, or a reference to work already discussed. You do not need extra instructions beyond a clear target; the skill already defines the workflow.

### 1. Simple request in Pi

```text
/skill:evolution-stress-test the checkout module
```

That's enough to start. The agent reads the relevant code and requirements, then proposes three cumulative changes and the exact commands it wants to run. It must wait for approval before executing project code.

### 2. Specific path, concerns, and constraints in Claude Code

```text
/electric-sheep:evolution-stress-test src/imports. Focus on malformed CSV rows and partial failures. Keep the public API compatible and do not add dependencies. Propose the exercise and commands first; wait for my approval before executing project code.
```

Replace `src/imports` with a real path in your repository. Everything after the skill name is ordinary prompt text: the first part identifies the target, and the rest gives optional guidance. You can also send those constraints in a follow-up message before approving the exercise.

### 3. Use the existing conversation context in Codex

After discussing or implementing a feature in the same chat (commit any intended source changes first; the target checkout must be clean):

```text
$evolution-stress-test the retry logic we just added. Focus on duplicate requests and exhausted retries. Propose the exercise only for now.
```

You do **not** have to repeat a directory if the conversation already identifies the target. Invoking the skill without any extra text is also possible when the target is unambiguous; otherwise, the agent should ask what to test rather than guess. For OpenCode or ChatGPT desktop, use that client's invocation from the table above with the same kind of plain-language request.

### What happens next?

1. **Proposal:** the agent identifies the target and proposes exactly three cumulative challenges, acceptance checks, and concrete commands. Read the proposal; narrow the scope or change constraints in chat if needed.
2. **Your approval:** when satisfied, reply with something like: `I approve the three challenges and the exact commands you listed. Run the exercise in the disposable worktree. Do not install dependencies or apply experimental changes back to my source checkout.` This approves the listed exercise, not arbitrary future commands. Dependency installation needs separate explicit approval.
3. **Execution and output:** the agent uses the runner to establish the baseline, implement and check the challenges in the disposable worktree, and publish a verified report, recommended next actions, implementation plan, and agent handoff prompt. It then explicitly offers to **keep or remove the experimental worktree**. Removal needs your confirmation and preserves the output/evidence; nothing is automatically merged back.

You do not need to invoke the skill again for each challenge. A **proposal-only** request stops before project execution; you can review it and approve the listed exercise later in the same conversation. These examples describe the intended workflow, not additional live-model validation.

## Output, next actions, and cleanup

At the end of a completed **or stopped** exercise, the agent shows the outcome and the absolute paths to a retained package, normally under `~/.electric-sheep/runs/<run-id>/`:

| File | What you use it for |
| --- | --- |
| `report.md` / `report.json` | Read the diagnosis, recorded checks, findings, and limitations |
| `next-actions.md` | Review prioritized actions, rationale, provenance, and evidence |
| `implementation-plan.md` | Review ordered tasks, dependencies, target paths, steps, and acceptance criteria |
| `agent-prompt.md` | Give another coding agent the retained context and safe implementation procedure |
| `outputs.json` | Verify hashes and completeness of the package and its referenced evidence |

Priorities are agent judgments, not a quality score. Hypotheses need validation; experimental failures are not automatically bugs in your original code. The plan requires applicability and approval checks before adopting changes. If no findings justify implementation, the output says so instead of inventing work. Legacy/partial reports without agent-authored input use an explicitly labeled template draft.

### Focus a handoff or export it (0.4.0)

Optional CLI operations can focus the **action view**, without rerunning the exercise:

```bash
node /absolute/path/to/electric-sheep/bin/electric-sheep.mjs report --run ID --runs-root /absolute/path/to/runs --priority high --priority medium
node /absolute/path/to/electric-sheep/bin/electric-sheep.mjs export --run ID --runs-root /absolute/path/to/runs --out /physical/export/parent/fresh-archive --priority high
```

Repeated priorities form a deduplicated union (`high`, `medium`, `low`, `untriaged`). All transitive prerequisites are included, even at other priorities, and explained in the plan/prompt. Omitting `--priority` restores the full view; saved authored actions are never deleted. An empty view does not mean there were no findings. Fallback drafts remain untriaged, not newly certified defects.

**Selection is not redaction.** Exports retain complete findings and all referenced package evidence, including evidence for unselected actions. Review reports/logs for secrets before sharing; nothing is uploaded automatically. The absent destination must have an existing physical/canonical parent outside the source repository and runs root; resolve aliases first. Existing files/directories and symlink/junction parents are refused.

A successful export returns `portable: true`, `verified: true`, its directory and file paths. Move the entire archive together: operational links remain relative, while original repository/command metadata is historical. The archive is data, **not an owned run** that the cleanup command can adopt. Original-run cleanup remains a separate confirmation. Evidence is buffered in memory; large-package limits and interrupted writes are unmeasured. A later write failure can leave a partial archive; inspect it and choose a fresh destination rather than treating it as verified. See [selection, export and relocation verification](docs/usage.md#priority-selected-views-and-portable-export).

### Example session ending

```text
Agent: The exercise stopped after challenge 2. The report and follow-up package
       are saved at <absolute-run-directory>. Review next-actions.md for the
       recommended investigations and implementation-plan.md for the steps.
       Remove the experimental worktree while retaining outputs and evidence,
       or keep it for inspection?
You:   Remove the experimental worktree, but keep the output and evidence.
Agent: [Runs confirmed cleanup from outside the worktree.]
       Cleanup verified: worktree and Git registration removed. Original outcome:
       failed. Reports, plan, prompt, logs and diffs remain at <absolute-run-directory>.
```

Choosing **keep**, or not answering, leaves the worktree alone. A cleanup failure must be reported as a failure with recovery guidance—not as successful removal. Ignored files are not copied into evidence; stop concurrent editing/testing before closing. A worktree remains **not a security sandbox**.

To continue in a new AI-agent session, attach or ask the agent to read the actual `agent-prompt.md` file. For example:

```text
Read /absolute/path/to/runs/<run-id>/agent-prompt.md and its referenced package.
Review the plan and applicability first. Propose your implementation commands
for my approval; do not apply the experimental patches automatically.
```

Replace the example path with the path returned for your run. You do not have to write the plan or JSON yourself; the testing agent prepares it. Follow-up implementation is a separate approved task, not an automatic fourth challenge. The package remains readable after normal cleanup. Uninstalling a plugin does not delete it. See [CLI details](docs/usage.md#findings-and-reports) for manual generation, verification, retry, and the separate destructive evidence-deletion option.

## Claude Code: persistent GitHub installation

Inside an interactive Claude Code session, register this repository's marketplace and install the plugin:

```text
/plugin marketplace add Giorgix/electric-sheep
/plugin install electric-sheep@electric-sheep
```

This is our self-hosted catalog, not an Anthropic official marketplace listing. Installation defaults to **user scope**, so the plugin is available across your projects without `--plugin-dir`.

Alternatively, current Claude Code versions support this single shell command:

```bash
claude plugin install electric-sheep --marketplace Giorgix/electric-sheep
```

Start a **fresh Claude session in the project you want to test**, then invoke explicitly:

```text
/electric-sheep:evolution-stress-test the checkout module
```

The agent proposes the three challenges and commands before running project code. There is no automatic bootstrap hook or expensive after-every-edit exercise. Normal coding-model usage still applies; the runner itself does not call a model.

### Verify, update, or uninstall

Run these in a shell:

```bash
claude plugin list

# Refresh the catalog, then update the plugin; restart Claude afterward.
claude plugin marketplace update electric-sheep
claude plugin update electric-sheep@electric-sheep

# Remove the plugin from user scope.
claude plugin uninstall electric-sheep@electric-sheep
```

Uninstalling the plugin does not clean up its experimental worktrees or runner evidence. Use the runner's explicit cleanup workflow first when appropriate; run records live separately under `~/.electric-sheep/runs`. Earlier preview runs can still be accessed by supplying their existing directory through `--runs-root`; see [existing runs](docs/usage.md#existing-runs-after-a-rename).

### Local development fallback and noninteractive sessions

For development, clone this repository and launch from your target project with its absolute path:

```bash
claude --plugin-dir /absolute/path/to/electric-sheep
```

Launch interactive Claude in a **real terminal**, not through an agent command tool with captured output. Without a terminal Claude may enter print mode and report that input is missing. For a noninteractive, proposal-only response from an already installed plugin, provide a prompt explicitly:

```bash
claude --print "/electric-sheep:evolution-stress-test the checkout module. Propose the exercise only; do not execute project code."
```

Print mode exits after the response and is not an interactive approval loop. Use it only in a trusted project; prefer interactive chat for the complete exercise.

## Build a standalone bundle

**Needed only for the manual Codex, ChatGPT desktop, OpenCode, and other-client recipes below.** Claude Code and Pi have their own GitHub installation commands; skip this step for them.

From a shell, clone outside the project you want to test and generate a complete bundle. These two commands work in Bash/Git Bash and PowerShell:

```bash
git clone https://github.com/Giorgix/electric-sheep.git "$HOME/electric-sheep"
node "$HOME/electric-sheep/scripts/package-local.mjs" --host codex --out "$HOME/electric-sheep-skill-bundle"
```

Use **unused directories**; do not overwrite an existing checkout or installation. If you already have a source clone, run its `scripts/package-local.mjs` with a new output path outside that clone. No `npm install` is needed.

Despite the `--host codex` flag, the generated `skills/evolution-stress-test/` is a portable, self-contained skill with an embedded runner. Copy **that entire generated folder**, including `scripts/runner/`, references, and metadata. Copying only `SKILL.md` or the source repository's skill folder breaks the standalone installation.

## Codex: local standalone skill preview

1. [Build the standalone bundle](#build-a-standalone-bundle).
2. Install its complete skill folder in your **user-level** Agent Skills directory using one shell below. The destination must not already exist.

<details>
<summary>Bash / Git Bash</summary>

```bash
dest="$HOME/.agents/skills/evolution-stress-test"
if [ -e "$dest" ] || [ -L "$dest" ]; then
  printf 'Destination already exists; inspect it before replacing: %s\n' "$dest"
else
  mkdir -p "$HOME/.agents/skills"
  cp -R "$HOME/electric-sheep-skill-bundle/skills/evolution-stress-test" "$dest"
fi
```

</details>

<details>
<summary>PowerShell</summary>

```powershell
$dest = "$HOME/.agents/skills/evolution-stress-test"
if (Test-Path -LiteralPath $dest) { throw "Destination already exists; inspect it before replacing: $dest" }
New-Item -ItemType Directory -Force -Path "$HOME/.agents/skills" | Out-Null
Copy-Item -Recurse -LiteralPath "$HOME/electric-sheep-skill-bundle/skills/evolution-stress-test" -Destination $dest
```

</details>

3. Start Codex in your target project. Use `/skills` to check discovery; restart if it does not appear. Invoke explicitly:

```text
$evolution-stress-test the checkout module
```

To check the installed runner without calling a model:

```bash
node "$HOME/.agents/skills/evolution-stress-test/scripts/run.mjs" --help
```

This uses [Codex's local skill discovery](https://developers.openai.com/codex/skills/), not an official OpenAI marketplace listing. The bundle also includes a `.codex-plugin/plugin.json` compatibility manifest. Actual Codex discovery and instruction-following remain unverified here.

## ChatGPT desktop: experimental local plugin

**This is an unverified local-preview recipe, not a public ChatGPT plugin listing or a claim of web/mobile execution support.** Current OpenAI documentation supports [personal local marketplaces in the ChatGPT desktop app](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually). Availability depends on your app version, account, and workspace policy.

1. [Build the standalone bundle](#build-a-standalone-bundle). Keep the **whole bundle** at `$HOME/electric-sheep-skill-bundle`, not just its skill folder; it includes the compatibility plugin manifest.
2. Create `~/.agents/plugins/marketplace.json` with the following content **only if that file does not exist**. If you already have a personal marketplace, add only the new plugin entry to its `plugins` array; preserve its name, settings, and other entries.

```json
{
  "name": "electric-sheep-local",
  "interface": {
    "displayName": "Electric Sheep Local Preview"
  },
  "plugins": [
    {
      "name": "electric-sheep",
      "source": {
        "source": "local",
        "path": "./electric-sheep-skill-bundle"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

For a personal marketplace, `source.path` is relative to your home directory (the marketplace root), **not** the `.agents/plugins` directory. Adjust it if you chose a different bundle location.

3. Restart the ChatGPT desktop app. Open **Plugins**, select your personal/local marketplace, and install **Electric Sheep**. If your app does not expose local marketplaces, use the Codex CLI recipe instead; do not assume the Claude marketplace commands work in ChatGPT.
4. Start a new local coding session, type `@`, and select Electric Sheep's **Evolution Stress Test** skill. Ask it to stress-test your target module and propose the exercise first.

The execution environment must actually have **Node 22+, Git, shell/file tools, and access to the committed target checkout**. Prefer local Codex in the desktop app; an ordinary Chat/Work conversation without those capabilities cannot run this workflow. Installing plugin metadata or uploading `SKILL.md` does not provide the runner environment. This release does not deploy a remote service for ChatGPT web or mobile.

For updates, refresh your source clone, rebuild the complete bundle, update the local source referenced by the marketplace, and restart/refresh the app. To remove it, uninstall through the Plugins UI, then remove **only its entry** from your personal marketplace if no longer wanted. ChatGPT installation, discovery, and model-driven behavior have not been tested here.

## Pi: native package

Run these in your normal terminal, not as Claude Code chat commands:

```bash
pi install git:github.com/Giorgix/electric-sheep
pi list
```

The default is **user scope**, available across projects through `~/.pi/agent/settings.json`. No extension, marketplace registration, copied skill, or extra `pi` manifest is needed: Pi discovers this repository's `skills/` directory as a native package.

Start Pi in the target project, or run `/reload` in an existing Pi session, then invoke:

```text
/skill:evolution-stress-test the checkout module
```

The skill is explicit-only; it does not automatically run because you edited code. This works independently of whether Pi is using Claude, an OpenAI model, or another provider.

Update or remove the user-level package from a shell:

```bash
pi update git:github.com/Giorgix/electric-sheep
pi remove git:github.com/Giorgix/electric-sheep
```

Restart or `/reload` after updating/removing. If you deliberately want project-only installation, use `pi install -l git:github.com/Giorgix/electric-sheep` and the matching `pi remove -l ...`; project settings require Pi's project trust approval. Do not use plain `pi update` to update this package: on current Pi it updates Pi itself.

For a local development clone, you can instead start Pi from your target project with `pi -e /absolute/path/to/electric-sheep`, without saving a package declaration. Native local package discovery and runner execution were checked on Pi 1.5.2; GitHub package installation and a model-driven exercise remain unverified. See Pi's [package](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md) and [skill](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md) documentation for your version.

## OpenCode: native Agent Skill

This uses [OpenCode's native skill discovery](https://opencode.ai/docs/skills/), **not a JavaScript OpenCode plugin**. Do not add `electric-sheep` to OpenCode's `plugin`/`plugins` configuration as though it shipped such a plugin.

1. [Build the standalone bundle](#build-a-standalone-bundle).
2. Copy its complete skill folder to your **global** OpenCode skills directory using one shell below. The destination must not already exist.

<details>
<summary>Bash / Git Bash</summary>

```bash
dest="$HOME/.config/opencode/skills/evolution-stress-test"
if [ -e "$dest" ] || [ -L "$dest" ]; then
  printf 'Destination already exists; inspect it before replacing: %s\n' "$dest"
else
  mkdir -p "$HOME/.config/opencode/skills"
  cp -R "$HOME/electric-sheep-skill-bundle/skills/evolution-stress-test" "$dest"
fi
```

</details>

<details>
<summary>PowerShell</summary>

```powershell
$dest = "$HOME/.config/opencode/skills/evolution-stress-test"
if (Test-Path -LiteralPath $dest) { throw "Destination already exists; inspect it before replacing: $dest" }
New-Item -ItemType Directory -Force -Path "$HOME/.config/opencode/skills" | Out-Null
Copy-Item -Recurse -LiteralPath "$HOME/electric-sheep-skill-bundle/skills/evolution-stress-test" -Destination $dest
```

</details>

3. Restart OpenCode in the target project. On current versions, mention the skill explicitly:

```text
@evolution-stress-test the checkout module
```

If your version does not support that mention syntax, ask: `Use your native skill tool to load evolution-stress-test, then propose an exercise for the checkout module. Do not execute project code yet.`

To check the copied runner without calling a model:

```bash
node "$HOME/.config/opencode/skills/evolution-stress-test/scripts/run.mjs" --help
```

OpenCode can also discover `~/.agents/skills/`; if you already installed the Codex standalone skill there, you can reuse it instead of creating a second copy. Check for duplicate skill IDs and your agent's skill permissions if discovery is unexpected. OpenCode host discovery and model-driven execution remain unverified here.

## Other Agent Skills clients

For another **local coding agent** that supports `SKILL.md`, [build the standalone bundle](#build-a-standalone-bundle) and install the entire generated `skills/evolution-stress-test/` folder in that client's documented skills directory. Follow its explicit invocation syntax. Do not assume Claude's `/plugin`, Pi's `/skill:`, or OpenAI's `$` syntax is universal.

The client must be able to read the skill's references, run the included Node script, edit files, and access Git in the target environment. Ask it to load the skill explicitly and **propose only** first. If it does not honor explicit-only metadata, avoid enabling automatic invocation and verify the approval behavior before using it on a real project.

Editor chat alone, a model API, a Custom GPT, or an MCP client without local execution tools is not automatically a compatible host. There is no Electric Sheep MCP server or universal one-click installer. Other clients are not individually tested or claimed supported.

## Updating or removing manual installations

Copied standalone skills do **not** update when the source clone changes. Review source updates with `git -C "$HOME/electric-sheep" pull --ff-only`, generate a fresh bundle in a **new unused output directory**, then replace only the installed Electric Sheep folder you own with the entire freshly generated skill. Restart/reload the host afterward. The bundler intentionally rejects overwriting a nonempty output directory.

To uninstall a copied Codex/OpenCode/other-client skill, remove only its `evolution-stress-test` folder from the install location you selected. Avoid duplicate installations: Codex, Pi, and OpenCode may all discover `~/.agents/skills/`, so removing or replacing that shared copy can affect more than one client.

**Uninstalling a host integration does not remove run records or experimental worktrees.** Use the runner's explicit cleanup workflow for worktrees when appropriate; evidence remains under `~/.electric-sheep/runs` unless you deliberately manage it separately.

## How an exercise works

1. Select a feature or module and approve three realistic cumulative requirements and concrete commands.
2. Establish a passing baseline inside an isolated worktree.
3. Freeze acceptance checks, implement the next requirement, then run new and earlier checks.
4. Allow one repair attempt per challenge; stop rather than silently weakening tests.
5. Publish the report and actionable follow-up package; explicitly offer keep/remove, and verify confirmed cleanup while retaining evidence. Useful fixes are separate approved work; nothing is merged automatically.

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
