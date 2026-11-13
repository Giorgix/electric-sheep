import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, access, mkdir, rename, rm } from 'node:fs/promises';
import { addFinding } from '../src/report.mjs';
import { findingInput, followUpInput } from './helpers/follow-up.mjs';
import { verifyOutputBundle } from '../src/outputs.mjs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { cli } from './helpers/cli.mjs';
import { protocolFixture, addAcceptance, implement } from './helpers/protocol.mjs';
import { loadRun, withRunLock } from '../src/store.mjs';
test('help and unknown options have predictable exit codes', async () => {
  assert.equal((await cli(['--help'])).exitCode, 0);
  assert.equal((await cli(['inspect', '--unknown'])).exitCode, 2);
});
test('start requires approval and valid JSON before any project execution', async (t) => {
  const { root, repo, run } = await protocolFixture(t);
  const file = join(root, 'plan.json');
  await writeFile(file, JSON.stringify(run.plan));
  assert.equal(
    (await cli(['start', '--repo', repo.root, '--plan', file, '--runs-root', root])).exitCode,
    2,
  );
  await writeFile(file, '{"truncated":');
  assert.equal(
    (
      await cli([
        'start',
        '--repo',
        repo.root,
        '--plan',
        file,
        '--approval-note',
        'yes',
        '--runs-root',
        root,
      ])
    ).exitCode,
    2,
  );
});
test('full CLI workflow preserves source and cleans idempotently', async (t) => {
  const { root, repo, run: prepared } = await protocolFixture(t);
  const original = await repo.snapshot();
  const file = join(root, 'plan.json');
  await writeFile(file, JSON.stringify(prepared.plan));
  const started = await cli([
    'start',
    '--repo',
    repo.root,
    '--plan',
    file,
    '--approval-note',
    'Approved',
    '--runs-root',
    root,
  ]);
  assert.equal(started.exitCode, 0, started.stderr);
  const { id } = JSON.parse(started.stdout);
  const invoke = (verb, ...rest) => cli([verb, '--run', id, '--runs-root', root, ...rest]);
  assert.equal((await invoke('baseline')).exitCode, 0);
  for (let n = 1; n <= 3; n++) {
    const run = await loadRun(root, id);
    await addAcceptance(run, n);
    assert.equal((await invoke('freeze')).exitCode, 0);
    await implement(run, n);
    const evaluated = await invoke('evaluate');
    assert.equal(evaluated.exitCode, 0, evaluated.stderr);
  }
  assert.equal(JSON.parse((await invoke('status')).stdout).outcome, 'completed');
  assert.equal((await invoke('cleanup', '--confirm', 'wrong')).exitCode, 2);
  assert.equal((await invoke('cleanup', '--confirm', id)).exitCode, 0);
  assert.equal((await invoke('cleanup', '--confirm', id)).exitCode, 0);
  const report = JSON.parse((await invoke('report')).stdout);
  assert.ok(report.markdownPath);
  assert.deepEqual(await repo.snapshot(), original);
});
test('report authors handoff without deleting and its exact closing command cleans safely', async (t) => {
  const { root, run } = await protocolFixture(t);
  await addFinding(run, findingInput());
  const input = join(root, 'follow-up.json');
  await writeFile(input, JSON.stringify(followUpInput()));
  const report = await cli(['report', '--run', run.id, '--runs-root', root, '--follow-up', input]);
  assert.equal(report.exitCode, 0, report.stderr);
  const paths = JSON.parse(report.stdout);
  await access(run.workspace);
  assert.equal(paths.closing.requiresConfirmation, true);
  assert.equal(paths.closing.cleanup.cwd, root);
  await access(paths.agentPromptPath);
  await access(paths.implementationPlanPath);
  const result = await promisify(execFile)(
    paths.closing.cleanup.executable,
    paths.closing.cleanup.args,
    { cwd: paths.closing.cleanup.cwd },
  );
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.verified, true);
  assert.equal(receipt.retainedPaths.length, 6);
  await assert.rejects(access(run.workspace));
  const saved = await loadRun(root, run.id);
  assert.equal(saved.followUp.actions[0].id, 'boundary');
  await verifyOutputBundle(saved);
  const regenerated = await cli(['report', '--run', run.id, '--runs-root', root]);
  assert.equal(regenerated.exitCode, 0, regenerated.stderr);
  assert.equal(JSON.parse(regenerated.stdout).closing.requiresConfirmation, false);
});
for (const kind of ['invalid JSON', 'missing file', 'invalid contract'])
  test(`report rejects ${kind} without changing run state`, async (t) => {
    const { root, run } = await protocolFixture(t);
    const path = join(root, 'follow-up.json');
    if (kind !== 'missing file')
      await writeFile(
        path,
        kind === 'invalid JSON' ? '{broken' : JSON.stringify(followUpInput('missing')),
      );
    const before = await readFile(join(run.directory, 'manifest.json'), 'utf8');
    const result = await cli(['report', '--run', run.id, '--runs-root', root, '--follow-up', path]);
    assert.equal(result.exitCode, 2, result.stderr);
    assert.equal(await readFile(join(run.directory, 'manifest.json'), 'utf8'), before);
    await access(run.workspace);
  });
test('CLI cleanup rejects worktree cwd and preserves workspace on publication error', async (t) => {
  const { root, run } = await protocolFixture(t);
  const args = ['cleanup', '--run', run.id, '--confirm', run.id, '--runs-root', root];
  const inside = await cli(args, { cwd: run.workspace });
  assert.equal(inside.exitCode, 1);
  assert.match(inside.stderr, /outside/i);
  assert.equal((await loadRun(root, run.id)).phase, 'prepared');
  await mkdir(join(run.directory, 'agent-prompt.md'));
  assert.equal((await cli(args)).exitCode, 1);
  await access(run.workspace);
  assert.equal((await cli([...args, '--follow-up', 'no'])).exitCode, 2);
});

test('mutation reports lock contention without modifying active run', async (t) => {
  const { root, run } = await protocolFixture(t);
  await withRunLock(root, run.id, async () => {
    const result = await cli(['baseline', '--run', run.id, '--runs-root', root]);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /locked/i);
  });
});
test('status and reports remain accessible if source moves', async (t) => {
  const { root, repo, run } = await protocolFixture(t);
  const moved = repo.root + '-moved';
  await rename(repo.root, moved);
  t.after(() => rm(moved, { recursive: true, force: true }));
  assert.equal((await cli(['status', '--run', run.id, '--runs-root', root])).exitCode, 0);
  assert.equal((await cli(['report', '--run', run.id, '--runs-root', root])).exitCode, 0);
});
test('graceful SIGINT persists interrupted command rather than success', async (t) => {
  const { root, run } = await protocolFixture(t);
  run.plan.commands[0].args = ['-e', 'setInterval(()=>{},1000)'];
  const { hash, saveRun } = await import('../src/store.mjs');
  run.approvals[0].planHash = hash(JSON.stringify(run.plan));
  await saveRun(run);
  const url = pathToFileURL(join(import.meta.dirname, '../src/cli.mjs')).href;
  const script = `import {main} from ${JSON.stringify(url)};const timer=setInterval(()=>{if(process.listenerCount('SIGINT')){clearInterval(timer);process.emit('SIGINT');}},25);process.exitCode=await main(${JSON.stringify(['baseline', '--run', run.id, '--runs-root', root])},{stdout:process.stdout,stderr:process.stderr});clearInterval(timer);`;
  const result = await promisify(execFile)(
    process.execPath,
    ['--input-type=module', '-e', script],
    { timeout: 15000 },
  ).catch((e) => e);
  assert.equal(result.code, 1);
  const resumed = await loadRun(root, run.id);
  assert.equal(resumed.outcome, 'cancelled');
  assert.equal(resumed.commandResults.at(-1).status, 'interrupted');
});
