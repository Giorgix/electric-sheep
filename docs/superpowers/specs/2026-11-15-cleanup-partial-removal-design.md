# Bounded recovery after partial Git worktree removal

Status: approach A selected by the user; this written design awaits approval.
Date: 2026-11-15
Base: observed remote `main`, `e1155a64f14aacebe96622a536f1403487811da7`.

## Intent and evidence

Fix the observed Windows cleanup failure without broadening deletion authority. Git returned `Filename too long` after unregistering the comparison worktree and partially deleting it. The runner threw before reaching its existing residue fallback. Both cleanup modules on current main are byte-identical to the installed 0.4.0 modules involved in that incident; a new regression has not yet run.

Keep the retained incident evidence outside this repository. Commit only synthetic fixtures and descriptions, never project documents, dependency trees, private configuration or machine-specific evidence paths.

## Approaches

- **A — same-invocation recovery (selected):** retain the identity of a registered, validated workspace in memory across the attempted Git removal; use the existing Node removal fallback only after revalidation. Small scope; no new saved recovery authority.
- **B — persisted recovery journal (deferred):** supports interruption/restart recovery but adds state and validation complexity not needed for this fix.
- Merely enabling global Git long-path settings is not a fix for partial-removal handling and is excluded.

## Behavior

1. Preserve `finalizeCleanup`'s existing ownership, cwd, pending-command, checkpoint, final-diff and publication-integrity checks. Publication still precedes destructive cleanup; original exercise outcomes remain unchanged.
2. Immediately before Git removal, validate the registered detached workspace and retain its physical-directory identity. Use filesystem identity (device/inode and available creation identity), not just pathname equality. Missing/unreliable identity must not authorize a residue fallback.
3. Attempt Git removal once. Retain any error and inspect the actual filesystem/registration postconditions, including after a nonzero Git exit.
4. If registration remains, report failure; do not remove files with Node. A locked worktree remains locked and preserved.
5. If registration is absent and the path is absent, cleanup may complete after verification, even if Git reported an error.
6. If registration is absent but a directory remains, allow Node removal only when it is a real nonsymlink directory at the recorded physical path with the same retained identity. Reject replacements, aliases, non-directories and unknown identities. Nested symlinks/junctions must be unlinked, never traversed to their targets.
7. On verified recovery, record a concise audit event that a Git removal error was recovered; do not invent an application finding or silently reopen the exercise. Mark cleaned only after directory and registration absence are verified. If fallback fails, preserve the package and truthful failure.

The entry-time mismatch guards stay strict: an already-unregistered directory on a later invocation is **not** adopted. No journal, new recovery command, general retry policy, broad prune, global/repository Git configuration write or automatic cleanup consent is added. A process interruption or failed fallback can still require manual inspection. Filesystem identity checks reduce accidental replacement risk; they are not an atomic deletion primitive, protection against a malicious concurrent host, or a sandbox guarantee.

## Verification contract

TDD must establish the intended partial-removal failure before changing runtime code. Cover: nonzero Git exit after unregistration with the same directory; nonzero exit with both postconditions already absent; retained registration/lock; replacement directory and symlink/junction refusal; ignored deep dependency-like paths; preserved final diff, output hashes, original outcome and source checkout. Include a real Windows long-path fixture with synthetic ignored files and per-fixture configuration, plus portable deterministic guard/recovery tests where feasible. Do not weaken existing negative tests or claim Windows coverage from a non-Windows run.

Run targeted recovery/closing/workspace tests, then the complete test suite, syntax and formatting checks. Exact commands and implementation steps follow in the implementation plan after design approval. Setup/tests have not run on this branch; dependencies must not be installed before approval.

## Compatibility and delivery

Node 22+, Git, zero production dependencies, schema 1, canonical names/default roots and existing CLI approval semantics remain unchanged. Scope runtime changes to cleanup mechanics and any genuine shared identity helper needed by them; avoid test-only production hooks. Deliver as patch version 0.4.1 with aligned package/lock/plugin/catalog metadata and distribution assertions, without rewriting historical release evidence.

Use this fresh feature branch and a PR against main. Preserve the original checkout, older development worktree, installed cache, Toast workspace and retained runs. No merge/main push, extra model reviewer or cleanup of those resources is authorized. Review is inline/self-review unless separately authorized otherwise.
