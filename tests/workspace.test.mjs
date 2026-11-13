import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, access, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createExercise } from './helpers/runs.mjs';
import {
  createWorkspace,
  checkpoint,
  validateWorkspace,
  cleanupWorkspace,
} from '../src/workspace.mjs';
import { runGit } from '../src/git.mjs';
test('detached experiment preserves source and excludes ignored secrets', async (t) => {
  const { repo, run } = await createExercise(t, {
    files: { '.gitignore': 'ignored-secret\n', 'source.txt': 'baseline' },
  });
  await repo.write('ignored-secret', 'SECRET');
  const before = await repo.snapshot();
  await createWorkspace(run);
  assert.notEqual(run.workspace, repo.root);
  assert.equal(await runGit(run.workspace, ['branch', '--show-current']), '');
  await assert.rejects(access(join(run.workspace, 'ignored-secret')));
  assert.deepEqual(await repo.snapshot(), before);
});
test('checkpoint includes added files and leaves source branch untouched', async (t) => {
  const { repo, run } = await createExercise(t);
  const before = await repo.snapshot();
  await createWorkspace(run);
  await writeFile(join(run.workspace, 'new.txt'), 'experimental\n');
  const result = await checkpoint(run, 'round 1');
  assert.equal(await runGit(run.workspace, ['show', `${result.commit}:new.txt`]), 'experimental');
  assert.match(await readFile(join(run.directory, result.diffPath), 'utf8'), /new.txt/);
  assert.deepEqual(await repo.snapshot(), before);
});
test('runner Git operations do not invoke hooks or signing', async (t) => {
  const { repo, run } = await createExercise(t);
  await repo.write('.git/hooks/post-checkout', '#!/bin/sh\ntouch HOOK_RAN\n');
  await repo.write('.git/hooks/pre-commit', '#!/bin/sh\ntouch HOOK_RAN\nexit 1\n');
  await repo.git('config', 'commit.gpgSign', 'true');
  await repo.git('config', 'gpg.program', 'nonexistent-signer');
  await createWorkspace(run);
  await checkpoint(run, 'empty checkpoint');
  await assert.rejects(access(join(run.workspace, 'HOOK_RAN')));
});
test('cleanup refuses forged paths and retains report evidence', async (t) => {
  const { repo, run } = await createExercise(t);
  await createWorkspace(run);
  await writeFile(join(run.directory, 'report.md'), 'retained');
  await assert.rejects(cleanupWorkspace({ ...run, workspace: repo.root }), /ownership|workspace/i);
  await cleanupWorkspace(run);
  await cleanupWorkspace(run);
  assert.equal(await readFile(join(run.directory, 'report.md'), 'utf8'), 'retained');
  await assert.rejects(access(run.workspace));
  assert.equal(await repo.git('branch', '--show-current'), 'main');
});
test('reconciles registered workspace after interrupted manifest save', async (t) => {
  const { run } = await createExercise(t);
  await createWorkspace(run);
  run.events = [];
  await createWorkspace(run);
  await validateWorkspace(run);
});
test('source moving forward does not change recorded baseline', async (t) => {
  const { repo, run } = await createExercise(t);
  const original = run.repository.commit;
  await repo.write('later.txt', 'later');
  await repo.git('add', '.');
  await repo.git('commit', '-m', 'later');
  await createWorkspace(run);
  assert.equal(await runGit(run.workspace, ['rev-parse', 'HEAD']), original);
});
test('cleanup does not follow a directory symlink into source', async (t) => {
  const { repo, run } = await createExercise(t);
  await createWorkspace(run);
  await symlink(
    repo.root,
    join(run.workspace, 'escape'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await cleanupWorkspace(run);
  assert.equal(await readFile(join(repo.root, 'source.txt'), 'utf8'), 'baseline\n');
  await assert.rejects(access(run.workspace));
});
