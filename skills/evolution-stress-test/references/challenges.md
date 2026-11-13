# Designing useful evolution challenges

Start with the actual requirement, inputs, outputs, existing behavior, and expected users. A challenge is a plausible next change, not a list of every theoretical failure. Write requirement, rationale, compatibility constraints, acceptance checks, permitted scope, and stop condition before implementation.

| Pressure | Relevant example | Bad substitute |
|---|---|---|
| Boundary | Empty collection, duplicate input, rounding rule, malformed record | Arbitrary fuzz inputs with no specified handling |
| Failure | A write fails halfway; prior state must remain consistent | Requiring production infrastructure for a pure function |
| Extension | A second business rule with existing behavior preserved | Introducing an abstraction solely to satisfy a style preference |
| Compatibility | Existing callers keep working when an option is added | Silently redefining public behavior to make tests pass |

Prefer one boundary/failure pressure and one extension pressure across the three cumulative rounds. Choose ordering that reveals coupling: requirement 2 builds on requirement 1; requirement 3 must preserve both. Requirements can be known in advance; this is not a hidden benchmark.

For a small checkout, the example plan introduces multiple items with an empty-cart rule, then explicit nonnegative monetary rounding, then duplicate-order idempotency. Tests should use an in-memory fake at the external boundary if necessary, not a live payment provider. A parser or local CLI needs different challenges.

Before requesting approval check:
- Is the requirement justified by this project's domain and scale?
- Can it run locally without production credentials or unexpected installation?
- Is expected boundary/failure behavior explicit rather than guessed?
- Does the acceptance check distinguish missing behavior, and do regressions remain meaningful?
- Could an intentionally simple solution satisfy it without layers of speculative architecture?

Use explicit test files per round. Select baseline test files, configuration, and fixtures that prevent silent weakening, and declare generated-path exclusions as literal relative paths/prefixes (not glob patterns). Hashes are audit evidence, not tamper-proof security. If the project has no baseline tests, propose an approved minimal behavioral check and label coverage limited.
