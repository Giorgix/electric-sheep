import { lstat, realpath, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runGit } from './git.mjs';
import { ownedDirectory, saveRun } from './store.mjs';

async function checkOwnership(run) {
  const owner = await ownedDirectory(run.directory, run.id);
  if (
    owner.repository !== run.repository.root ||
    run.workspace !== join(run.directory, 'worktree')
  ) {
    throw new Error('Invalid workspace ownership');
  }
}
async function registered(run) {
  const listing = await runGit(run.repository.root, ['worktree', 'list', '--porcelain', '-z']);
  return listing
    .split('\0')
    .some(
      (field) =>
        field.startsWith('worktree ') && resolve(field.slice(9)) === resolve(run.workspace),
    );
}
export async function validateWorkspace(run) {
  await checkOwnership(run);
  const info = await lstat(run.workspace);
  if (info.isSymbolicLink() || !info.isDirectory() || !(await registered(run))) {
    throw new Error('Invalid workspace registration or ownership');
  }
  const sourceCommon = await realpath(
    await runGit(run.repository.root, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
  );
  const actualCommon = await realpath(
    await runGit(run.workspace, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
  );
  if (
    sourceCommon !== actualCommon ||
    (await runGit(run.workspace, ['branch', '--show-current']))
  ) {
    throw new Error('Workspace must remain detached in the recorded repository');
  }
}
export async function createWorkspace(run) {
  await checkOwnership(run);
  try {
    if (!(await registered(run))) {
      // An existing foreign path is never adopted or overwritten.
      const existing = await lstat(run.workspace).catch((e) => {
        if (e.code !== 'ENOENT') throw e;
        return null;
      });
      if (existing) throw new Error('Workspace path already exists without ownership registration');
      await runGit(run.repository.root, [
        'worktree',
        'add',
        '--detach',
        run.workspace,
        run.repository.commit,
      ]);
    }
    await validateWorkspace(run);
    await saveRun(run);
    return run;
  } catch (error) {
    run.phase = 'blocked';
    run.outcome = 'blocked';
    run.events.push({ type: 'workspace-error', message: error.message });
    await saveRun(run);
    throw error;
  }
}
export async function captureDiff(run, label) {
  await validateWorkspace(run);
  if ((await runGit(run.workspace, ['rev-parse', 'HEAD'])) !== run.checkpoint)
    throw new Error('Workspace checkpoint drift');
  await runGit(run.workspace, ['add', '-A', '--', '.']);
  const diff = await runGit(run.workspace, [
    'diff',
    '--cached',
    '--binary',
    '--no-ext-diff',
    '--no-textconv',
    run.checkpoint,
    '--',
  ]);
  const diffPath = `evidence/${randomUUID()}.diff`;
  await writeFile(join(run.directory, diffPath), diff, { flag: 'wx', mode: 0o600 });
  run.events.push({ type: 'diff', label, before: run.checkpoint, diffPath });
  await saveRun(run);
  return diffPath;
}
export async function checkpoint(run, label) {
  const before = run.checkpoint;
  const diffPath = await captureDiff(run, label);
  await runGit(run.workspace, [
    '-c',
    'user.name=Electronic Sheeps',
    '-c',
    'user.email=local@electronic-sheeps.invalid',
    'commit',
    '--allow-empty',
    '-m',
    label,
  ]);
  const commit = await runGit(run.workspace, ['rev-parse', 'HEAD']);
  run.checkpoint = commit;
  run.events.push({ type: 'checkpoint', label, before, commit, diffPath });
  await saveRun(run);
  return { commit, diffPath };
}
export async function cleanupWorkspace(run, { deleteEvidence = false } = {}) {
  await checkOwnership(run);
  if (run.phase !== 'cleaned') {
    if (await registered(run)) {
      await validateWorkspace(run);
      await runGit(run.repository.root, ['worktree', 'remove', '--force', run.workspace]);
    } else {
      const existing = await lstat(run.workspace).catch((e) => {
        if (e.code !== 'ENOENT') throw e;
        return null;
      });
      if (existing) throw new Error('Cannot clean unregistered workspace');
    }
    run.phase = 'cleaned';
    await saveRun(run);
  }
  if (deleteEvidence) await rm(run.directory, { recursive: true, force: true });
}
