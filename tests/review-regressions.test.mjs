import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createRepo } from './helpers/repos.mjs';
import { createExercise } from './helpers/runs.mjs';
import { protocolFixture, addAcceptance } from './helpers/protocol.mjs';
import { inspectRepository } from '../src/repository.mjs';
import { createWorkspace, checkpoint } from '../src/workspace.mjs';
import { runBaseline, freezeChallenge, amendPlan } from '../src/protocol.mjs';
import { snapshotArtifacts } from '../src/artifacts.mjs';
import { executeApproved } from '../src/commands.mjs';
import { buildReport, writeReports } from '../src/report.mjs';

test('checkpoint ignores ambient source index routing', async (t) => {
  const { repo, run } = await createExercise(t);
  await createWorkspace(run);
  const before = await repo.snapshot();
  await writeFile(join(run.workspace, 'experiment.txt'), 'experiment');
  const previous = process.env.GIT_INDEX_FILE;
  process.env.GIT_INDEX_FILE = join(repo.root, '.git/index');
  try {
    await checkpoint(run, 'isolated checkpoint');
  } finally {
    if (previous === undefined) delete process.env.GIT_INDEX_FILE;
    else process.env.GIT_INDEX_FILE = previous;
  }
  assert.deepEqual(await repo.snapshot(), before);
});
test('experimental Git attributes cannot invoke unapproved filters', async (t) => {
  const { repo, run } = await createExercise(t);
  await createWorkspace(run);
  await writeFile(
    join(run.workspace, 'filter.cjs'),
    "require('node:fs').writeFileSync('FILTER_RAN','ran');process.stdin.pipe(process.stdout);",
  );
  await repo.git('config', 'filter.sentinel.clean', 'node filter.cjs');
  await writeFile(join(run.workspace, '.gitattributes'), 'target.txt filter=sentinel\n');
  await writeFile(join(run.workspace, 'target.txt'), 'test');
  await assert.rejects(checkpoint(run, 'unsafe attributes'), /unsupported.*filter/i);
  await assert.rejects(access(join(run.workspace, 'FILTER_RAN')));
});
test('inspection rejects filters before status can execute a clean transform', async (t) => {
  const repo = await createRepo({
    files: {
      '.gitattributes': 'source.txt filter=sentinel\n',
      'source.txt': 'old',
      'filter.cjs':
        "require('node:fs').writeFileSync('FILTER_RAN','ran');process.stdin.pipe(process.stdout);",
    },
  });
  t.after(repo.dispose);
  await repo.git('config', 'filter.sentinel.clean', 'node filter.cjs');
  await repo.write('source.txt', 'changed');
  await assert.rejects(
    inspectRepository({ repo: repo.root, scope: ['.'] }),
    /unsupported.*filter/i,
  );
  await assert.rejects(access(join(repo.root, 'FILTER_RAN')));
});
test('inspection handles more paths than a Windows argv can contain', async (t) => {
  const files = {};
  for (let i = 0; i < 500; i++)
    files[`${String(i).padStart(4, '0')}-${'x'.repeat(90)}.txt`] = 'source\n';
  const repo = await createRepo({ files });
  t.after(repo.dispose);
  const info = await inspectRepository({ repo: repo.root, scope: ['.'] });
  assert.equal(info.branch, 'main');
});
test('saved checkpoint diff remains an applicable patch', async (t) => {
  const { repo, run } = await createExercise(t);
  await createWorkspace(run);
  await writeFile(join(run.workspace, 'new.txt'), 'new content\n');
  const { diffPath } = await checkpoint(run, 'patch fidelity');
  await repo.git('apply', '--check', join(run.directory, diffPath));
  assert.ok((await readFile(join(run.directory, diffPath), 'utf8')).endsWith('\n'));
});
test('freeze blocks infrastructure failure instead of treating it as expected red', async (t) => {
  const { run } = await protocolFixture(t);
  await runBaseline(run);
  const plan = structuredClone(run.plan);
  plan.commands.find((c) => c.id === 'check1').executable = 'sheeps-nonexistent-check';
  await amendPlan(run, plan, 'Approved command change');
  await addAcceptance(run, 1);
  await freezeChallenge(run);
  assert.equal(run.phase, 'blocked');
  assert.equal(run.attempts, 0);
});
test('baseline resume cannot silently re-freeze weakened acceptance', async (t) => {
  const { run } = await protocolFixture(t);
  run.phase = 'baseline';
  run.protectedArtifacts = await snapshotArtifacts(run, run.plan.baselineProtectedPaths);
  await writeFile(
    join(run.workspace, 'base.test.mjs'),
    '// removed assertions after interruption\n',
  );
  await runBaseline(run);
  assert.equal(run.phase, 'invalid');
});
test('standalone report preserves executable argv cwd and timeout', async (t) => {
  const { run } = await protocolFixture(t);
  const report = await buildReport(run);
  assert.deepEqual(report.approvedPlan.commands, run.plan.commands);
  const { markdownPath } = await writeReports(run);
  assert.ok((await readFile(markdownPath, 'utf8')).includes('base.test.mjs'));
});
test('timeout stops waiting when an orphan retains inherited pipes', async (t) => {
  const { run } = await protocolFixture(t);
  const plan = structuredClone(run.plan);
  // Parent exits, escaped grandchild keeps stdout/stderr open. It is intentionally
  // cleaned up below: the runner cannot promise to kill escaped descendants.
  const script = `const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setTimeout(()=>{},8000)'],{detached:true,stdio:['ignore',process.stdout,process.stderr]});console.log(child.pid);child.unref();`;
  plan.commands[0].args = ['-e', script];
  plan.commands[0].timeoutMs = 750;
  const { hash, saveRun } = await import('../src/store.mjs');
  run.plan = plan;
  run.approvals[0].planHash = hash(JSON.stringify(plan));
  await saveRun(run);
  const result = await executeApproved(run, 'test', 'baseline');
  const pid = Number((await readFile(join(run.directory, result.stdoutPath), 'utf8')).trim());
  if (pid > 0)
    try {
      process.kill(pid, 'SIGKILL');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  assert.equal(result.status, 'timed-out');
  assert.ok(result.durationMs < 5000, `waited ${result.durationMs}ms despite timeout`);
  assert.equal(result.outputTruncated, true);
});
