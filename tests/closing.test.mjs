import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, access, rm, symlink, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { protocolFixture } from './helpers/protocol.mjs';
import { finalizeCleanup } from '../src/closing.mjs';
import { isWorkspaceRegistered, checkpoint } from '../src/workspace.mjs';
import { writeReports } from '../src/report.mjs';
import { verifyOutputBundle } from '../src/outputs.mjs';
import { validateResume } from '../src/protocol.mjs';
import { saveRun, loadRun } from '../src/store.mjs';
import { runGit } from '../src/git.mjs';

test('cleanup preserves final tracked new and binary changes as replayable evidence', async (t) => {
  const { run, repo, root } = await protocolFixture(t, { files: { '.gitignore': 'secret\n' } });
  const original = await repo.snapshot();
  await writeFile(join(run.workspace, 'value.mjs'), 'export const value=1;\n');
  await checkpoint(run, 'earlier checkpoint');
  await writeReports(run);
  const value = 'export const value=2;\n';
  const binary = Buffer.from([0, 1, 255, 2]);
  await writeFile(join(run.workspace, 'value.mjs'), value);
  await writeFile(join(run.workspace, 'new.txt'), 'retained new file\n');
  await writeFile(join(run.workspace, 'binary.bin'), binary);
  await writeFile(join(run.workspace, 'secret'), 'DO_NOT_COPY_SECRET');
  const receipt = await finalizeCleanup(run, { cwd: root });
  assert.equal(receipt.verified, true);
  assert.equal(receipt.outcome, 'cancelled');
  assert.equal(receipt.evidenceDeleted, false);
  assert.equal(receipt.retainedPaths.length, 6);
  assert.equal(await isWorkspaceRegistered(run), false);
  await assert.rejects(access(run.workspace));
  const evidence = await verifyOutputBundle(run);
  assert.ok(evidence.evidenceRefs.some((p) => p.endsWith('.diff')));
  const replay = join(root, 'replay');
  await repo.git('worktree', 'add', '--detach', replay, run.repository.commit);
  // Every capture is incremental from its checkpoint; replay checkpoints once, then the final capture.
  const patches = [
    ...run.events.filter((e) => e.type === 'checkpoint'),
    run.events.filter((e) => e.type === 'diff').at(-1),
  ];
  for (const event of patches) {
    const path = join(run.directory, event.diffPath);
    const patch = await readFile(path, 'utf8');
    assert.ok(!patch.includes('DO_NOT_COPY_SECRET'));
    await runGit(replay, ['apply', '--binary', path]);
  }
  assert.equal(await readFile(join(replay, 'value.mjs'), 'utf8'), value);
  assert.equal(await readFile(join(replay, 'new.txt'), 'utf8'), 'retained new file\n');
  assert.deepEqual(await readFile(join(replay, 'binary.bin')), binary);
  assert.deepEqual(await repo.snapshot(), original);
  await repo.git('worktree', 'remove', '--force', replay);
});
for (const reason of [
  'output failure',
  'inside cwd',
  'running command',
  'checkpoint drift',
  'foreign ownership',
])
  test(`cleanup refuses ${reason} without deleting workspace`, async (t) => {
    const { run, root, repo } = await protocolFixture(t);
    let options = { cwd: root };
    let candidate = run;
    if (reason === 'output failure') await mkdir(join(run.directory, 'agent-prompt.md'));
    if (reason === 'inside cwd') options.cwd = run.workspace;
    if (reason === 'running command') run.commandResults.push({ id: 'pending', status: 'running' });
    if (reason === 'checkpoint drift')
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
    if (reason === 'foreign ownership') candidate = { ...run, workspace: repo.root };
    await assert.rejects(finalizeCleanup(candidate, options));
    await access(run.workspace);
    assert.notEqual(run.phase, 'cleaned');
  });
test('locked worktree removal failure retains outputs and retry succeeds', async (t) => {
  const { run, root, repo } = await protocolFixture(t);
  run.phase = 'failed';
  run.outcome = 'failed';
  await saveRun(run);
  await repo.git('worktree', 'lock', '--reason', 'fixture lock', run.workspace);
  await assert.rejects(finalizeCleanup(run, { cwd: root }), /cleanup|retry|lock/i);
  assert.notEqual((await loadRun(root, run.id)).phase, 'cleaned');
  await access(run.workspace);
  await verifyOutputBundle(run);
  await repo.git('worktree', 'unlock', run.workspace);
  const receipt = await finalizeCleanup(run, { cwd: root });
  assert.equal(receipt.outcome, 'failed');
  assert.equal(receipt.verified, true);
  assert.equal((await finalizeCleanup(run, { cwd: root })).phase, 'cleaned');
});
test('terminal resume reconciles pending records without reopening the exercise', async (t) => {
  const { run, root } = await protocolFixture(t);
  run.phase = 'cancelled';
  run.outcome = 'cancelled';
  run.attempts = 2;
  run.commandResults.push({ id: 'pending', status: 'running' });
  await saveRun(run);
  await assert.rejects(finalizeCleanup(run, { cwd: root }), /running|process/i);
  await validateResume(run);
  assert.equal(run.commandResults[0].status, 'interrupted');
  assert.equal(run.phase, 'cancelled');
  assert.equal(run.attempts, 2);
  assert.equal((await finalizeCleanup(run, { cwd: root })).outcome, 'cancelled');
});
test('repeat cleanup refuses a foreign replacement path', async (t) => {
  const { run, root } = await protocolFixture(t);
  run.phase = 'completed';
  run.outcome = 'completed';
  assert.equal((await finalizeCleanup(run, { cwd: root })).outcome, 'completed');
  await mkdir(run.workspace);
  await writeFile(join(run.workspace, 'foreign'), 'keep me');
  await assert.rejects(finalizeCleanup(run, { cwd: root }), /workspace|foreign|clean/i);
  assert.equal(await readFile(join(run.workspace, 'foreign'), 'utf8'), 'keep me');
});
test('absent unregistered workspace can be reconciled but registered missing path is refused', async (t) => {
  const { run, root, repo } = await protocolFixture(t);
  await rm(run.workspace, { recursive: true, force: true });
  await assert.rejects(finalizeCleanup(run, { cwd: root }), /registration|workspace/i);
  // Remove the specific missing registration, not broad prune.
  await repo.git('worktree', 'remove', '--force', run.workspace);
  assert.equal((await finalizeCleanup(run, { cwd: root })).verified, true);
});
test('cleanup does not follow a replacement workspace symlink', async (t) => {
  const { run, root, repo } = await protocolFixture(t);
  await repo.git('worktree', 'remove', '--force', run.workspace);
  await symlink(repo.root, run.workspace, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(finalizeCleanup(run, { cwd: root }));
  assert.ok(await repo.snapshot());
});
test('missing source prevents cleanup without destroying retained files', async (t) => {
  const { run, root, repo } = await protocolFixture(t);
  await writeReports(run);
  const moved = repo.root + '-moved';
  await rename(repo.root, moved);
  t.after(() => rm(moved, { recursive: true, force: true }));
  await assert.rejects(finalizeCleanup(run, { cwd: root }));
  await access(run.workspace);
  await verifyOutputBundle(run);
});
test('explicit purge reports no retained evidence and verifies deletion', async (t) => {
  const { run, root } = await protocolFixture(t);
  const receipt = await finalizeCleanup(run, { cwd: root, deleteEvidence: true });
  assert.equal(receipt.evidenceDeleted, true);
  assert.deepEqual(receipt.retainedPaths, []);
  await assert.rejects(access(run.directory));
});
