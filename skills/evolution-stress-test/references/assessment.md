# Assessing an evolution exercise

A report answers what happened, what supports the conclusion, and what remains unknown. Runner-recorded outcomes and agent interpretation are different things.

## Finding contract

Use `finding --run ID --file FILE` with a JSON object containing `id`, `category`, `origin`, `impact`, `summary`, `evidenceRefs`, and `recommendation`. Evidence references are run-relative files under `evidence/`, available from command results, frozen artifacts, and diff/checkpoint events. Never invent a path, command result, execution time, or token cost.

| Category | Required basis |
|---|---|
| `defect` | Reproducible failing acceptance/input evidence linked to a failed command; explain the violated requirement |
| `evolution-friction` | The actual change needed disproportionate spread, duplication, or coupling; link a diff and explain why |
| `maintainability-concern` | Specific code/diff suggests a risk; label the judgment rather than claiming demonstrated failure |
| `hypothesis` | A plausible untested risk; explicitly unproven, evidence may be absent |

Set `origin` to `baseline`, `experimental`, or `uncertain`. A newly introduced requirement failing before implementation is often expected, not a defect in the original product. A bug in the agent's experiment does not automatically exist in source. A blocked baseline is not a discovery from this exercise.

## Calibrated interpretation

Compare actual checkpoints, not imagined architectures. Use file/line references, command stdout/stderr, preserved test artifacts, and diff links. Report the observation, contextual impact, uncertainty, and smallest useful next action.

Large files, diff size, and dependency growth are signals. Generated code is excluded. Size alone cannot establish spaghetti code; abstractions alone cannot establish overengineering. Explain the unjustified complexity or the concrete next change it obstructed. Do not reward defensive checks or infrastructure unrelated to accepted requirements.

No universal numerical quality score or ship/no-ship verdict. Passing three challenges proves only those observed checks in that environment. Distinguish a separate-agent assessment from a single model judging its own changes; do not claim independent review without it.

The runner generates six report sections: scope/baseline/limits; per-challenge evidence; regression results and structural deltas; attributed findings; next actions; resume/cleanup. Include missing tests, incomplete rounds, safety constraints, and unverified hypotheses. Logs stay local but may contain sensitive data; the coding host's existing provider/privacy settings still apply.
