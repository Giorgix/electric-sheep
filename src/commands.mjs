import {spawn, execFile} from 'node:child_process';
import {open, realpath} from 'node:fs/promises';
import {finished} from 'node:stream/promises';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {contained} from './repository.mjs';
import {saveRun, hash} from './store.mjs';
import {validateWorkspace} from './workspace.mjs';

function terminateTree(child, force = false) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], () => {});
  } else {
    try { process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') child.kill('SIGKILL'); }
  }
}
export async function executeApproved(run, commandId, stage) {
  if (hash(JSON.stringify(run.plan)) !== run.approvals.at(-1)?.planHash) throw new Error('Plan differs from approved commands');
  const spec = run.plan.commands.find(c => c.id === commandId);
  if (!spec) throw new Error(`Command is not approved: ${commandId}`);
  await validateWorkspace(run);
  const cwd = await realpath(resolve(run.workspace, spec.cwd)).catch(() => { throw new Error('Unavailable command cwd'); });
  if (!contained(await realpath(run.workspace), cwd)) throw new Error('Command cwd escapes workspace');
  const id = randomUUID();
  const result = {id, commandId, stage, status: 'running', exitCode: null, signal: null, startedAt: new Date().toISOString(), finishedAt: null, durationMs: null, stdoutPath: `evidence/${id}.stdout`, stderrPath: `evidence/${id}.stderr`};
  run.commandResults.push(result);
  await saveRun(run);
  const outHandle = await open(join(run.directory, result.stdoutPath), 'wx', 0o600);
  let errHandle;
  try { errHandle = await open(join(run.directory, result.stderrPath), 'wx', 0o600); }
  catch (error) { await outHandle.close(); throw error; }
  const stdout = outHandle.createWriteStream();
  const stderr = errHandle.createWriteStream();
  const start = performance.now();
  const child = spawn(spec.executable, spec.args, {cwd, shell: false, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe']});
  let timedOut = false, interrupted = false, spawnError, logError, escalation;
  const stop = () => {
    terminateTree(child);
    escalation ??= setTimeout(() => terminateTree(child, true), 1000);
  };
  const onSignal = () => { interrupted = true; stop(); };
  process.on('SIGINT', onSignal); process.on('SIGTERM', onSignal);
  const timer = setTimeout(() => { timedOut = true; stop(); }, spec.timeoutMs);
  const outputDone = Promise.all([finished(stdout), finished(stderr)]).catch(error => { logError = error; stop(); });
  child.stdout.pipe(stdout); child.stderr.pipe(stderr);
  child.once('error', error => { spawnError = error; });
  try {
    const {code, signal} = await new Promise(resolveClose => child.once('close', (code, signal) => resolveClose({code, signal})));
    await outputDone;
    result.exitCode = code; result.signal = signal;
    result.status = interrupted ? 'interrupted' : timedOut ? 'timed-out' : spawnError || logError ? 'spawn-error' : code === 0 ? 'passed' : 'failed';
    if (spawnError || logError) result.errorMessage = (spawnError || logError).message;
    result.finishedAt = new Date().toISOString(); result.durationMs = Math.round(performance.now() - start);
    await saveRun(run);
    return result;
  } finally {
    clearTimeout(timer); clearTimeout(escalation);
    process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal);
  }
}
export async function interruptPending(run) {
  for (const result of run.commandResults) {
    if (result.status === 'running') {
      result.status = 'interrupted'; result.finishedAt = new Date().toISOString();
      result.durationMs = null;
    }
  }
  await saveRun(run);
}
