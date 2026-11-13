import { lstat, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ownedDirectory } from './store.mjs';
import { contained } from './repository.mjs';
import {
  validateWorkspace,
  isWorkspaceRegistered,
  captureDiff,
  cleanupWorkspace,
} from './workspace.mjs';
import { collectDeltas, writeReports } from './report.mjs';
import { verifyOutputBundle } from './outputs.mjs';
import { cancelRun } from './protocol.mjs';

async function optionalInfo(path) {
  return lstat(path).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
}
export async function finalizeCleanup(run, { deleteEvidence = false, cwd = process.cwd() } = {}) {
  const owner = await ownedDirectory(run.directory, run.id);
  if (owner.repository !== run.repository.root || run.workspace !== join(run.directory, 'worktree'))
    throw new Error('Invalid workspace ownership');
  const physicalCwd = await realpath(resolve(cwd));
  if (
    contained(run.workspace, physicalCwd) ||
    (deleteEvidence && contained(run.directory, physicalCwd))
  )
    throw new Error('Run cleanup from outside the worktree/run directory');
  if (run.commandResults.some((r) => r.status === 'running'))
    throw new Error(
      'Running command records: confirm processes stopped, then resume before cleanup',
    );
  const existing = await optionalInfo(run.workspace);
  const registered = await isWorkspaceRegistered(run);
  if (run.phase === 'cleaned') {
    if (existing || registered)
      throw new Error('Unexpected workspace after cleanup; refusing foreign replacement');
  } else {
    if (Boolean(existing) !== registered)
      throw new Error('Workspace path/registration mismatch; inspect ownership before cleanup');
    if (existing) {
      await validateWorkspace(run);
      await captureDiff(run, 'Final workspace snapshot before cleanup');
    }
    if (!run.outcome) await cancelRun(run, 'Explicit cleanup of unfinished exercise');
  }
  await collectDeltas(run);
  await writeReports(run);
  const verified = await verifyOutputBundle(run);
  try {
    await cleanupWorkspace(run, { deleteEvidence });
  } catch (error) {
    throw new Error(
      `Cleanup failed; output retained. Inspect locks/processes/ownership and retry: ${error.message}`,
      { cause: error },
    );
  }
  if ((await optionalInfo(run.workspace)) || (await isWorkspaceRegistered(run)))
    throw new Error('Cleanup verification failed');
  if (deleteEvidence && (await optionalInfo(run.directory)))
    throw new Error('Evidence deletion verification failed');
  return {
    id: run.id,
    phase: 'cleaned',
    outcome: run.outcome,
    verified: true,
    evidenceDeleted: deleteEvidence,
    retainedPaths: deleteEvidence ? [] : Object.values(verified.paths),
  };
}
