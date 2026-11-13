# Small checkout evolution exercise

This is a dependency-free toy baseline, not production payment software. `total(item)` initially supports a valid single item. Missing future features are not automatically bugs in that original contract.

## Try it

Copy this directory into a new temporary directory **outside** the Electronic Sheeps checkout, initialize it as a Git repository, add/commit these sample files, and run:

```bash
node --test checkout.test.mjs
```

No installation, payment service, network, or credentials are needed. Then use the installed skill to stress-test this sample, or inspect the runner manually:

```bash
node /absolute/path/to/electronic-sheeps/bin/electronic-sheeps.mjs inspect --repo /absolute/path/to/sample --scope checkout.mjs
node /absolute/path/to/electronic-sheeps/bin/electronic-sheeps.mjs start --repo /absolute/path/to/sample --plan /absolute/path/to/sample/exercise.json --approval-note "I reviewed and approve the local sample commands and requirements"
```

Retain the returned run ID and worktree path. Run `baseline --run ID`. Only in that worktree, write `round1.test.mjs` from the first agreed requirement, then `freeze --run ID`, implement it, and `evaluate --run ID`. Repeat for rounds 2 and 3, preserving earlier checks. `report --run ID` writes evidence-backed Markdown/JSON. `cleanup --run ID --confirm ID` removes the experiment and retains reports.

The checked-in plan is already part of the committed sample; do not rewrite it in the clean source checkout. Any modified plan should be saved outside source and explicitly approved. The runner does not create acceptance tests or implement features on its own: your coding host does that.

## Requirements introduced in order

1. Preserve `total(item)`; introduce `totalItems(items)`, reject empty carts and negative/non-finite prices.
2. Round the cart total once to two decimals using nonnegative half-up rounding, including `1.005 -> 1.01`, `0.105 + 0.105 -> 0.21`, and `0 -> 0`. Preserve validation and legacy callers. This is a small floating-point exercise, not a production monetary representation recommendation.
3. Add an in-memory `createOrderStore().place(id, items)`: repeated identical requests return the same original order; conflicting repeated IDs fail without replacing it. Preserve all prior requirements.

The automated e2e test simulates host edits through both a failing and successful exercise. It demonstrates runner mechanics, not an AI's coding ability. See `tests/e2e.test.mjs` in the source repository for the exact acceptance cases and simulated implementations.
