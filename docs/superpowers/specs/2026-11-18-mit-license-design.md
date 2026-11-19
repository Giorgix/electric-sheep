# MIT license for Electric Sheep

Status: short design approved in chat by “yep MIT”; implementation awaits plan review.

## Intent and scope

Make the GitHub repository's reuse terms explicit using the standard MIT License,
with `Copyright (c) 2026 Giorgix`. Add a root `LICENSE`, declare SPDX identifier
`MIT` in `package.json` and the root package entry of `package-lock.json`, and
link the license from the README. Keep version 0.4.1 and dependency resolution unchanged.

## Approaches

The assistant proposed MIT with the holder above and matching metadata/documentation;
the user selected MIT. A custom license would add ambiguity and impede standard
GitHub recognition. Alternative licenses grant different rights and are not selected.
Use the unmodified standard MIT terms, including the warranty/liability disclaimer.

## Constraints and non-goals

Work on `docs/add-mit-license`, isolated from the original checkout and retained
worktrees. Do not change runtime behavior, dependency versions, plugin versions,
installed clients, or existing run evidence. Do not push, merge, or remove a worktree
under this local task's authority. Keep standalone bundle generation unchanged;
its existing explicit copy lists do not propagate a new root license automatically,
so notice propagation for those distributions remains a separate follow-up.

## Verification

Check canonical MIT terms and the approved notice; parse both JSON files and verify
matching SPDX metadata; check the README link; run existing distribution/packaging
and full tests; verify an offline, script-disabled npm dry-run includes `LICENSE`;
check syntax and whitespace. These checks are not legal advice or proof of GitHub's
post-merge detection. No new dependencies or model sessions are needed.
