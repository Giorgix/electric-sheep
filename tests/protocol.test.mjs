import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { protocolFixture, addAcceptance, implement } from './helpers/protocol.mjs';
import {
  runBaseline,
  freezeChallenge,
  evaluateChallenge,
  amendPlan,
  cancelRun,
  validateResume,
} from '../src/protocol.mjs';
import { runGit } from '../src/git.mjs';
test('failed baseline blocks all challenges', async (t) => {
  const { run } = await protocolFixture(t, { files: { 'value.mjs': 'export const value=-1;' } });
  await runBaseline(run);
  assert.equal(run.phase, 'blocked');
  await assert.rejects(freezeChallenge(run), /phase|baseline/i);
});
test('three cumulative rounds require actual passing evidence', async (t) => {
  const { run, repo } = await protocolFixture(t);
  const before = await repo.snapshot();
  await runBaseline(run);
  for (let n = 1; n <= 3; n++) {
    await addAcceptance(run, n);
    await freezeChallenge(run);
    assert.equal(run.attempts, 0);
    assert.equal(run.commandResults.at(-1).status, 'failed');
    await implement(run, n);
    await evaluateChallenge(run);
  }
  assert.equal(run.phase, 'completed');
  assert.equal(run.rounds.filter((r) => r.status === 'passed').length, 3);
  assert.ok(run.commandResults.filter((r) => r.stage === 'evaluate:round3:1').length >= 4);
  assert.deepEqual(await repo.snapshot(), before);
});
test('two failed evaluations stop without skipping ahead', async (t) => {
  const { run } = await protocolFixture(t);
  await runBaseline(run);
  await addAcceptance(run, 1);
  await freezeChallenge(run);
  await evaluateChallenge(run);
  assert.equal(run.attempts, 1);
  await evaluateChallenge(run);
  assert.equal(run.phase, 'failed');
  assert.equal(run.rounds[1].status, 'not-run');
  await assert.rejects(evaluateChallenge(run), /phase/i);
});
for (const action of ['edit', 'delete'])
  test(`${action} of protected test invalidates round`, async (t) => {
    const { run } = await protocolFixture(t);
    await runBaseline(run);
    await addAcceptance(run, 1);
    await freezeChallenge(run);
    const path = join(run.workspace, 'base.test.mjs');
    if (action === 'edit') await writeFile(path, '// weakened');
    else await unlink(path);
    await evaluateChallenge(run);
    assert.equal(run.phase, 'invalid');
  });
test('new acceptance passing cannot hide earlier regression', async (t) => {
  const { run } = await protocolFixture(t);
  await runBaseline(run);
  await addAcceptance(run, 1);
  await freezeChallenge(run);
  await implement(run, 1);
  await evaluateChallenge(run);
  await addAcceptance(run, 2);
  await freezeChallenge(run);
  await implement(run, 2, false);
  await evaluateChallenge(run);
  assert.equal(run.phase, 'challenge');
  assert.equal(run.attempts, 1);
  assert.equal(run.rounds[1].status, 'frozen');
});
test('empty protected directory cannot establish baseline coverage', async (t) => {
  const { run } = await protocolFixture(t);
  await mkdir(join(run.workspace, 'empty'));
  run.plan.baselineProtectedPaths = ['empty'];
  await assert.rejects(runBaseline(run), /approved|empty|artifact/i);
});
test('approved amendment preserves old evidence and spent attempts', async (t) => {
  const { run } = await protocolFixture(t);
  await runBaseline(run);
  await addAcceptance(run, 1);
  await freezeChallenge(run);
  await evaluateChallenge(run);
  const oldHash = run.protectedArtifacts[0].sha256;
  await writeFile(
    join(run.workspace, 'base.test.mjs'),
    "import assert from 'node:assert/strict';import {value} from './value.mjs';assert.ok(value>=0); // clarified\n",
  );
  await amendPlan(run, run.plan, 'Approved clarification without weakening');
  assert.equal(run.phase, 'ready');
  assert.equal(run.attempts, 1);
  assert.equal(run.approvals.length, 2);
  assert.notEqual(run.protectedArtifacts[0].sha256, oldHash);
  await freezeChallenge(run);
  await implement(run, 1);
  await evaluateChallenge(run);
  assert.equal(run.rounds[0].attempts, 2);
});
test('resume records interruption without passing incomplete checks', async (t) => {
  const { run } = await protocolFixture(t);
  await runBaseline(run);
  run.commandResults.push({
    id: 'pending',
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  await validateResume(run);
  assert.equal(run.commandResults.at(-1).status, 'interrupted');
  assert.equal(run.phase, 'ready');
});
test('checkpoint drift invalidates resume', async (t) => {
  const { run } = await protocolFixture(t);
  await runBaseline(run);
  await runGit(run.workspace, [
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '--allow-empty',
    '-m',
    'unexpected',
  ]);
  await validateResume(run);
  assert.equal(run.phase, 'invalid');
});
test('cancellation is terminal', async (t) => {
  const { run } = await protocolFixture(t);
  await cancelRun(run, 'User cancelled');
  assert.equal(run.outcome, 'cancelled');
  await assert.rejects(runBaseline(run), /phase/i);
});
