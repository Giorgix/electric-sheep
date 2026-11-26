# Designing useful evolution challenges

Start with the actual requirement, inputs, outputs, existing behavior, and expected users. A challenge is a plausible next change, not a list of every theoretical failure. Write requirement, rationale, compatibility constraints, acceptance checks, permitted scope, and stop condition before implementation.

| Pressure | Relevant example | Bad substitute |
|---|---|---|
| Boundary | Empty collection, duplicate input, rounding rule, malformed record | Arbitrary fuzz inputs with no specified handling |
| Failure | A write fails halfway; prior state must remain consistent | Requiring production infrastructure for a pure function |
| Extension | A second business rule with existing behavior preserved | Introducing an abstraction solely to satisfy a style preference |
| Compatibility | Existing callers keep working when an option is added | Silently redefining public behavior to make tests pass |

Prefer one boundary/failure pressure and one extension pressure across the three cumulative rounds. Choose ordering that reveals coupling: requirement 2 builds on requirement 1; requirement 3 must preserve both. Requirements can be known in advance; this is not a hidden benchmark.

Use in-memory fakes at external boundaries where needed, not live providers. Adapt challenges to this project's domain; the checkout example is not a universal test suite.

Before requesting approval check:
- Is the requirement justified by this project's domain and scale?
- Can it run locally without production credentials or unexpected installation?
- Is expected boundary/failure behavior explicit rather than guessed?
- Does the acceptance check distinguish missing behavior, and do regressions remain meaningful?
- Could an intentionally simple solution satisfy it without layers of speculative architecture?

Use explicit test files per round. Protect baseline tests, configuration and fixtures against silent weakening. Declare generated-path exclusions as literal relative paths/prefixes, not globs. Hashes are audit evidence, not tamper-proof security. Without baseline tests, propose an approved minimal behavioral check and label coverage limited.

## Pre-freeze coverage

Before each `freeze`, save a coverage matrix alongside the approved plan, outside source. This is host-authored review material, not a new schema-1 plan field. Each promised behavior and distinct branch needs a row with four slots:

| Requirement/branch | Expected result | Test file + test/check name | Approved command ID |
|---|---|---|---|
| Pure preview / ready | Correct ready result; no store, queue, adapter or file effects | `round1.test.mjs` / `ready preview has no effects` | `preview` |
| Pure preview / blocked | Controlled refusal; the same effect boundaries remain untouched | `round1.test.mjs` / `blocked preview has no effects` | `preview` |

These names are illustrative; replace them with actual checks and approved command IDs. Inspect the tests: output assertions alone do not establish effect coverage. For each row, confirm the check exists, asserts the promised result/effects and is reached by that command. Resolve missing coverage before freezing; a scope revision needs user approval first. Test counts and hashes do not certify adequacy.

A pre-implementation failure caused by an asserted missing capability can be expected. Setup, import, dependency or plugin failures are not meaningful behavioral REDs; diagnose the blocker rather than implementing against a broken oracle. Later-discovered omissions belong in the assessment as coverage limits; they do not authorize silent frozen-test changes or extra attempts.
