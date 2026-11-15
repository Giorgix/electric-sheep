import { runGit } from './git.mjs';
import { join, resolve } from 'node:path';
import { lstat, realpath, rm } from 'node:fs/promises';
import { ownedDirectory } from './store.mjs';

export async function isWorkspaceRegistered(run) {
  const listing = await runGit(run.repository.root, ['worktree', 'list', '--porcelain', '-z']);
  return listing
    .split('\0')
    .some(
      (field) =>
        field.startsWith('worktree ') && resolve(field.slice(9)) === resolve(run.workspace),
    );
}
export async function captureWorkspaceIdentity(workspace) {
  const info = await lstat(workspace, { bigint: true }).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (
    !info || info.isSymbolicLink() || !info.isDirectory() ||
    typeof info.dev !== 'bigint' || info.dev < 0n ||
    typeof info.ino !== 'bigint' || info.ino <= 0n ||
    (await realpath(workspace)) !== workspace
  ) return null;
  return {
    path: workspace, dev: info.dev, ino: info.ino,
    birthtimeNs: typeof info.birthtimeNs === 'bigint' && info.birthtimeNs > 0n ? info.birthtimeNs : null,
  };
}
// Internal post-Git reconciliation, not independent cleanup authority: the
// caller must have validated registration and captured identity in this call.
export async function finishWorkspaceRemoval(run, identity, gitError = null) {
  try {
    const owner = await ownedDirectory(run.directory, run.id);
    if (owner.repository !== run.repository.root || run.workspace !== join(run.directory, 'worktree'))
      throw new Error('Invalid workspace ownership');
    if (await isWorkspaceRegistered(run)) {
      if (gitError) throw gitError;
      throw new Error('Workspace cleanup registration postcondition failed');
    }
    let residueRemoved = false;
    if (await optionalInfo(run.workspace)) {
      const current = await captureWorkspaceIdentity(run.workspace);
      if (
        !identity || !current || identity.path !== current.path ||
        identity.dev !== current.dev || identity.ino !== current.ino ||
        identity.birthtimeNs !== current.birthtimeNs
      ) throw new Error('Unexpected workspace residue identity');
      // fs.rm unlinks nested symlinks/junctions, never their targets.
      await rm(run.workspace, { recursive: true, force: true, maxRetries: 3 });
      residueRemoved = true;
    }
    if ((await optionalInfo(run.workspace)) || (await isWorkspaceRegistered(run)))
      throw new Error('Workspace cleanup postcondition failed');
    return { residueRemoved };
  } catch (error) {
    if (gitError && error !== gitError)
      throw new AggregateError([gitError, error], error.message);
    throw error;
  }
}

async function optionalInfo(path) {
  return lstat(path).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
}
