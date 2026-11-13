import { validatePlan, nonempty } from './contracts.mjs';
import { hash, saveRun } from './store.mjs';
import { runGit } from './git.mjs';
import { validateWorkspace, checkpoint, captureDiff } from './workspace.mjs';
import { executeApproved, interruptPending } from './commands.mjs';
import { snapshotArtifacts, verifyArtifacts } from './artifacts.mjs';

const terminal = new Set(['completed', 'blocked', 'failed', 'invalid', 'cancelled', 'cleaned']);
function requirePhase(run, ...phases) {
  if (!phases.includes(run.phase))
    throw new Error(`Invalid phase ${run.phase}; expected ${phases.join(', ')}`);
  if (hash(JSON.stringify(run.plan)) !== run.approvals.at(-1)?.planHash)
    throw new Error('Plan does not match approved plan');
}
async function stop(run, phase, message) {
  run.phase = phase;
  run.outcome = phase;
  run.events.push({ type: phase, at: new Date().toISOString(), message });
  if (phase === 'invalid' && run.rounds[run.currentIndex]?.status === 'frozen')
    run.rounds[run.currentIndex].status = 'invalid';
  await saveRun(run);
  return run;
}
async function checkIntegrity(run) {
  try {
    await validateWorkspace(run);
    if ((await runGit(run.workspace, ['rev-parse', 'HEAD'])) !== run.checkpoint)
      throw new Error('Workspace checkpoint drift');
    await verifyArtifacts(run);
    return true;
  } catch (error) {
    await stop(run, 'invalid', error.message);
    return false;
  }
}
async function checks(run, ids, stage) {
  const results = [];
  for (const id of [...new Set(ids)]) {
    const result = await executeApproved(run, id, stage);
    results.push(result);
    if (result.status === 'interrupted') break;
  }
  return results;
}
async function snapshotAllApplicable(run) {
  const selected = [...run.plan.baselineProtectedPaths];
  for (let i = 0; i <= run.currentIndex; i++) {
    if (run.rounds[i]?.status !== 'not-run')
      selected.push(...run.plan.challenges[i].protectedPaths);
  }
  run.protectedArtifacts = await snapshotArtifacts(run, selected);
}
export async function runBaseline(run) {
  requirePhase(run, 'prepared', 'baseline');
  if (!(await checkIntegrity(run))) return run;
  run.phase = 'baseline';
  await saveRun(run);
  for (const id of run.plan.setupCommandIds) {
    const previous = run.commandResults
      .filter((r) => r.commandId === id && r.stage === 'setup')
      .at(-1);
    if (previous?.status === 'passed') continue;
    if (previous)
      return stop(
        run,
        'blocked',
        'Interrupted or failed setup requires review; create a new run rather than silently rerunning setup',
      );
    const result = await executeApproved(run, id, 'setup');
    if (result.status !== 'passed')
      return stop(
        run,
        result.status === 'interrupted' ? 'cancelled' : 'blocked',
        'Setup did not complete',
      );
  }
  try {
    if (!run.protectedArtifacts.length)
      run.protectedArtifacts = await snapshotArtifacts(run, run.plan.baselineProtectedPaths);
  } catch (error) {
    return stop(run, 'blocked', error.message);
  }
  const results = await checks(run, run.plan.baselineCommandIds, 'baseline');
  if (!(await checkIntegrity(run))) return run;
  if (results.some((r) => r.status !== 'passed'))
    return stop(
      run,
      results.some((r) => r.status === 'interrupted') ? 'cancelled' : 'blocked',
      'Baseline checks did not pass',
    );
  run.phase = 'ready';
  run.events.push({
    type: 'baseline-passed',
    resultIds: results.map((r) => r.id),
    coverage: run.plan.coverage,
  });
  await saveRun(run);
  return run;
}
export async function freezeChallenge(run) {
  requirePhase(run, 'ready');
  if (!(await checkIntegrity(run))) return run;
  const challenge = run.plan.challenges[run.currentIndex];
  const round = run.rounds[run.currentIndex];
  let artifacts;
  try {
    artifacts = await snapshotArtifacts(run, challenge.protectedPaths);
  } catch (error) {
    return stop(run, 'invalid', error.message);
  }
  const byPath = new Map(run.protectedArtifacts.map((a) => [a.path, a]));
  for (const artifact of artifacts) byPath.set(artifact.path, artifact);
  run.protectedArtifacts = [...byPath.values()];
  round.protectedArtifacts = artifacts;
  round.status = 'frozen';
  round.beforeCheckpoint = run.checkpoint;
  run.phase = 'challenge';
  await saveRun(run);
  const results = await checks(run, challenge.commandIds, `pre-implementation:${challenge.id}`);
  round.resultIds.push(...results.map((r) => r.id));
  if (!(await checkIntegrity(run))) return run;
  if (results.some((r) => r.status === 'interrupted'))
    return stop(run, 'cancelled', 'Pre-implementation checks interrupted');
  if (results.some((r) => ['spawn-error', 'timed-out'].includes(r.status)))
    return stop(
      run,
      'blocked',
      'Pre-implementation infrastructure did not complete; not an expected red check',
    );
  run.events.push({
    type: 'acceptance-frozen',
    challengeId: challenge.id,
    alreadySatisfied: results.every((r) => r.status === 'passed'),
  });
  await saveRun(run);
  return run;
}
export async function evaluateChallenge(run) {
  requirePhase(run, 'challenge');
  if (run.attempts >= 2) return stop(run, 'failed', 'Evaluation limit reached');
  if (!(await checkIntegrity(run))) return run;
  const challenge = run.plan.challenges[run.currentIndex];
  const round = run.rounds[run.currentIndex];
  run.attempts++;
  round.attempts = run.attempts;
  await saveRun(run);
  const ids = [
    ...run.plan.baselineCommandIds,
    ...run.plan.challenges.slice(0, run.currentIndex + 1).flatMap((c) => c.commandIds),
  ];
  const results = await checks(run, ids, `evaluate:${challenge.id}:${run.attempts}`);
  round.resultIds.push(...results.map((r) => r.id));
  if (!(await checkIntegrity(run))) return run;
  if (results.some((r) => r.status === 'interrupted'))
    return stop(run, 'cancelled', 'Evaluation interrupted');
  if (results.every((r) => r.status === 'passed')) {
    const result = await checkpoint(run, `Electric Sheep: ${challenge.id}`);
    round.status = 'passed';
    round.afterCheckpoint = result.commit;
    run.currentIndex++;
    run.attempts = 0;
    run.phase = run.currentIndex === 3 ? 'completed' : 'ready';
    if (run.phase === 'completed') run.outcome = 'completed';
  } else {
    await captureDiff(run, `Failed evaluation: ${challenge.id}:${run.attempts}`);
    if (run.attempts >= 2) {
      round.status = 'failed';
      return stop(run, 'failed', 'Challenge failed after one repair opportunity');
    }
  }
  await saveRun(run);
  return run;
}
export async function amendPlan(run, input, approvalNote) {
  requirePhase(run, 'ready', 'challenge');
  nonempty(approvalNote, 'approval note');
  const plan = validatePlan(input);
  if (
    JSON.stringify(plan.scope) !== JSON.stringify(run.plan.scope) ||
    JSON.stringify(plan.setupCommandIds) !== JSON.stringify(run.plan.setupCommandIds)
  )
    throw new Error('Scope or setup changes require a new run');
  for (let i = 0; i < run.currentIndex; i++)
    if (JSON.stringify(plan.challenges[i]) !== JSON.stringify(run.plan.challenges[i]))
      throw new Error('Passed requirements cannot be replaced; create a new run');
  run.events.push({
    type: 'plan-amended',
    previousPlan: run.plan,
    previousArtifacts: run.protectedArtifacts,
    note: approvalNote,
  });
  run.plan = plan;
  run.approvals.push({
    at: new Date().toISOString(),
    note: approvalNote,
    planHash: hash(JSON.stringify(plan)),
  });
  try {
    await snapshotAllApplicable(run);
  } catch (error) {
    return stop(run, 'invalid', error.message);
  }
  await saveRun(run);
  const results = await checks(run, plan.baselineCommandIds, 'amended-baseline');
  if (!(await checkIntegrity(run))) return run;
  if (results.some((r) => r.status !== 'passed'))
    return stop(run, 'blocked', 'Amended baseline did not pass');
  run.phase = 'ready';
  await saveRun(run);
  return run;
}
export async function cancelRun(run, note) {
  nonempty(note, 'cancellation note');
  if (terminal.has(run.phase)) throw new Error('Cannot cancel a terminal phase');
  return stop(run, 'cancelled', note);
}
export async function validateResume(run) {
  if (terminal.has(run.phase)) return run;
  await interruptPending(run);
  if (!(await checkIntegrity(run))) return run;
  if (run.phase === 'challenge' && run.attempts >= 2) {
    run.rounds[run.currentIndex].status = 'failed';
    return stop(run, 'failed', 'Interrupted final evaluation cannot be assumed passed');
  }
  run.events.push({ type: 'resumed', at: new Date().toISOString() });
  await saveRun(run);
  return run;
}
