# Development policy

- Work on feature branches, never directly on `main`.
- Open pull requests against `main`; never push directly to `main`.
- Do not merge a PR without the user's approval.
- Use test-driven development and verify changes before claiming success.
- Keep the runner dependency-free and the skill portable; consult the approved design and implementation plan in `docs/superpowers/`.
- Do not confuse Git worktree isolation with a security sandbox.
