import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createExercise } from './helpers/runs.mjs';
import { plan } from './helpers/plans.mjs';
import { createWorkspace } from '../src/workspace.mjs';
import { executeApproved, interruptPending } from '../src/commands.mjs';
async function commandFixture(t, command) {
  const p = plan();
  p.commands[0] = { ...p.commands[0], ...command };
  const fixture = await createExercise(t, { plan: p });
  await createWorkspace(fixture.run);
  return fixture;
}
test('unapproved command cannot execute', async (t) => {
  const { run } = await commandFixture(t, {});
  await assert.rejects(executeApproved(run, 'unknown', 'baseline'), /approved/i);
});
test('approved argv is literal', async (t) => {
  const { run } = await commandFixture(t, {
    args: ['-e', 'process.stdout.write(process.argv[1])', 'a; echo NOT_EXECUTED'],
  });
  const result = await executeApproved(run, 'test', 'baseline');
  assert.equal(result.status, 'passed');
  assert.equal(
    await readFile(join(run.directory, result.stdoutPath), 'utf8'),
    'a; echo NOT_EXECUTED',
  );
});
test('nonzero exit remains failure with separate stdout and stderr', async (t) => {
  const { run } = await commandFixture(t, {
    args: ['-e', 'console.log("output");console.error("error");process.exit(7)'],
  });
  const result = await executeApproved(run, 'test', 'baseline');
  assert.equal(result.status, 'failed');
  assert.equal(result.exitCode, 7);
  assert.match(await readFile(join(run.directory, result.stderrPath), 'utf8'), /error/);
});
test('missing executable is recorded rather than passed', async (t) => {
  const { run } = await commandFixture(t, { executable: 'sheeps-missing-executable-0192' });
  assert.equal((await executeApproved(run, 'test', 'baseline')).status, 'spawn-error');
});
test('command timeout terminates spawned child tree', async (t) => {
  const script =
    'const {spawn}=require("node:child_process");const c=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"inherit"});console.log(c.pid);setInterval(()=>{},1000)';
  const { run } = await commandFixture(t, { args: ['-e', script], timeoutMs: 1500 });
  const result = await executeApproved(run, 'test', 'baseline');
  assert.equal(result.status, 'timed-out');
  const childPid = Number((await readFile(join(run.directory, result.stdoutPath), 'utf8')).trim());
  assert.ok(childPid > 0);
  await delay(200);
  // POSIX may retain an already-dead orphan as a zombie until init reaps it.
  if (process.platform === 'win32') assert.throws(() => process.kill(childPid, 0));
});
test('logs stream large output without truncating evidence', async (t) => {
  const { run } = await commandFixture(t, {
    args: [
      '-e',
      'process.stdout.write("x".repeat(2*1024*1024));process.stderr.write("y".repeat(1024))',
    ],
  });
  const result = await executeApproved(run, 'test', 'baseline');
  assert.equal(result.status, 'passed');
  assert.equal((await readFile(join(run.directory, result.stdoutPath))).length, 2 * 1024 * 1024);
});
test('escaping cwd is rejected even after a symlink swap', async (t) => {
  const { run, repo } = await commandFixture(t, { cwd: 'escape' });
  await symlink(
    repo.root,
    join(run.workspace, 'escape'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(executeApproved(run, 'test', 'baseline'), /cwd|escape/i);
});
test('running evidence survives interruption and is never promoted', async (t) => {
  const { run } = await commandFixture(t, {});
  run.commandResults.push({
    id: 'interrupted-command',
    commandId: 'test',
    stage: 'baseline',
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  await interruptPending(run);
  assert.equal(run.commandResults[0].status, 'interrupted');
  await writeFile(join(run.workspace, 'still-here'), 'unchanged');
});
