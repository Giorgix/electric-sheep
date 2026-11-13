# Follow-up package and session closing

The host supplies project understanding; the runner validates and publishes it without calling a model. Apply this closing procedure to completed, failed, blocked, invalid, and cancelled exercises. If safe inspection is impossible, explain the blocker and retain the worktree; do not manufacture evidence or force deletion.

## Author the follow-up

After recording findings, read `report --run ID` output if necessary, then adapt [the example](follow-up.example.json). Its `boundary-risk` finding ID is illustrative: replace it with actual recorded IDs. Save your input outside the source checkout, such as in the owned run directory, and invoke:

```text
node "<absolute-skill-directory>/scripts/run.mjs" report --run ID --follow-up "<absolute-input-file>" --runs-root "<runs-root>"
```

Fields: `schemaVersion: 1`, `actions` array; each action has unique `id`, `title`, existing `findingIds`, `priority` (`high`, `medium`, `low`, `untriaged`), `rationale`, `targetPaths` (repository-relative, empty if unknown), nonempty `steps` and `acceptanceCriteria`, and `dependsOn` action IDs. Dependencies must be acyclic. Priority is your judgment, not a numerical quality score or certified severity. The runner derives finding categories, origins, evidence, and mandatory gates; input text cannot suppress those gates.

Use concrete, proportional steps and checkable acceptance criteria. Separate reproduced defects from structural judgments and hypotheses. An experimental defect is not automatically a source defect. Require applicability/product approval before proposing to ship hypothetical requirements; investigate hypotheses before recommending fixes. Do not invent filenames, line numbers, failures, or confidence.

An empty `actions` array is appropriate when no implementation is justified. Explain coverage/recovery limits instead. Plain `report --run ID` produces a labeled runner-template draft for legacy/partial runs; disclose that it is not a project-specific agent-authored implementation plan. Previously authored input is saved and reused during later reports and cleanup.

## Verify and present

A successful report returns absolute paths to `report.md`, `report.json`, `next-actions.md`, `implementation-plan.md`, `agent-prompt.md`, and `outputs.json`. The last file records hashes of all deliverables and retained referenced evidence. Publication and read-back verification happen before success; a failure means the package is incomplete and must be repaired/regenerated, not described as delivered.

Show the outcome, highest-priority applicable actions, uncertainty, and the absolute package paths. The next agent can use `agent-prompt.md` in a new conversation; the prompt points at retained evidence rather than relying on the worktree or unreachable detached commits. Never claim that an AI-host pressure test happened merely because file checks passed.

## Required cleanup decision

After showing the verified output, ask:

> Remove the experimental worktree while keeping the reports, plan, prompt, logs and diffs, or keep it for inspection?

If the user chooses keep or gives no answer, retain it and say where it is. Report generation and the returned `closing` descriptor are not consent to delete. Never silently choose removal or routinely offer `--delete-evidence`.

On explicit removal consent:

1. Leave the worktree; use the descriptor's `cleanup.cwd` (the runs root). Confirm known test/build processes have stopped. The runner cannot detect/terminate all escaped descendants. If records remain `running`, inspect status and use `resume` only after confirming processes stopped; terminal resume marks unknown outcomes interrupted without reopening the exercise.
2. Execute the descriptor's literal `cleanup.executable` plus `cleanup.args`. They include `--run ID --confirm ID --runs-root ROOT`; do not omit `--run`, guess the default root, or pass paths from another run. Through a shell, quote paths according to that shell.
3. The runner first verifies any existing published package; changed/missing outputs or evidence block removal, not silently acquire new hashes. Inspect mismatches and restore/reconstruct evidence before explicitly regenerating. It then snapshots final tracked/nonignored new changes, regenerates/verifies the package, removes only the owned worktree and verifies filesystem/Git-registration absence. On failure, preserve what remains and show the diagnostic; no broad clean/prune, manual source reset, or automatic repeated force removal.
4. Require `verified: true` in the successful receipt; show original outcome, cleanup result and retained paths. Report artifacts remain a historical snapshot; current cleanup state is in saved status/the receipt. An already-cleaned report has no new cleanup choice and is not a fresh deletion check.

The receipt verifies the runner's removal/postconditions, not host confinement or project correctness. Ignored files are not copied into evidence; stop concurrent editing/testing while closing. Default cleanup retains the run. Explicit full-evidence deletion is a separate destructive request and leaves no package for another agent.
