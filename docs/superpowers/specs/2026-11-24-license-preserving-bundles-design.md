# License-preserving bundles — proposed 0.4.2 design

Status: proposed technical design; user approved the workstream, not yet this document or execution commands.

## Intent

Preserve the repository's existing MIT notice in the distributions documented for
Claude Code and copied standalone skills. Do not add new license terms or alter
runner behavior. This is the first of the three requested workstreams.

## Approach

Copy the existing root `LICENSE` byte-for-byte using the current `copyPlain` helper:

- Each generated Claude/Codex bundle: `LICENSE`.
- Each generated skill: `skills/evolution-stress-test/LICENSE`.
- The Codex embedded runner: `skills/evolution-stress-test/scripts/runner/LICENSE`.

Automatic copies are recommended over manual installation instructions, which can
leave notices behind. A bundle-root-only copy is insufficient because the documented
standalone recipe copies only the generated skill folder. Symlinks are not suitable
for portable independent copies and are already refused by the packaging helper.

## Release and constraints

Proposed builder call: bump package/lock, both plugin manifests and the marketplace
to 0.4.2 so normal client updaters can distinguish the changed artifacts. Preserve
MIT text, schema 1, canonical names, Node 22+, zero production dependencies, pinned
development tooling, existing output-path guards and atomic staging behavior.
No installed-cache patches, new CLI features, evaluation retries or cleanup changes.

## Verification

Observe intended failing assertions for absent notices before changing the packager.
Then prove byte equality for both host bundles and for the copied standalone skill
and embedded runner after the original bundle is removed. Preserve the existing
copied-runner CLI/report/export/cleanup checks. Verify synchronized release metadata,
full tests, syntax, formatting, whitespace and npm package contents.

## Remaining workstreams and approval boundaries

Installation audit found Claude Code registered at 0.4.0 and a clean Pi managed
checkout at merged 0.4.1. Use normal targeted client updaters, not manual cache edits;
verify package state and explain any required client restart/reload. Installation
execution is separately specified after this design; no model prompt is needed.

The fresh value-validation case needs a real forthcoming change selected with the
user, a stable pinned baseline, agreed success/effort measures, and approved exact
challenges/commands. Keep the prior failed comparison and unresolved Toast history
unchanged. Retain the existing subscription-only/no-fallback constraints; no new
model invocation is authorized by this document.

Keep separate feature-branch publication, user merge, installation execution and
experiment approvals. Do not remove the MIT worktree, other worktrees, branches or
evidence under the broad request to work on these three items.
