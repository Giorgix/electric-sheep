import test from 'node:test';
import assert from 'node:assert/strict';
import {
  access,
  chmod,
  lstat,
  mkdir,
  readFile,
  rename,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { protocolFixture } from './helpers/protocol.mjs';
import { finalizeCleanup } from '../src/closing.mjs';
import { checkpoint, isWorkspaceRegistered, validateWorkspace } from '../src/workspace.mjs';
import { writeReports } from '../src/report.mjs';
import { verifyOutputBundle } from '../src/outputs.mjs';
import { loadRun, saveRun } from '../src/store.mjs';
import { runGit } from '../src/git.mjs';

import { captureWorkspaceIdentity, finishWorkspaceRemoval } from '../src/workspace-cleanup.mjs';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const gitFailure = () => Object.assign(new Error('synthetic Git removal failure'), { code: 1 });
const absent = (path) => assert.rejects(access(path), { code: 'ENOENT' });

// Real Git metadata and directory identity, but fabricated post-removal state.
async function unregisterResidue(fixture, { restore = true } = {}) {
  const { run, repo } = fixture;
  await validateWorkspace(run);
  const identity = await captureWorkspaceIdentity(run.workspace);
  assert.ok(identity);
  const parked = join(run.directory, 'workspace-parked');
  await rename(run.workspace, parked);
  await repo.git('worktree', 'remove', '--force', run.workspace);
  assert.equal(await isWorkspaceRegistered(run), false);
  if (restore) await rename(parked, run.workspace);
  return { identity, parked };
}

// Catches abandoning verified owned residue solely because Git reported failure.
test('removes the same unregistered directory after a Git error', async (t) => {
  const fixture = await protocolFixture(t);
  const before = await fixture.repo.snapshot();
  const { identity } = await unregisterResidue(fixture);
  assert.deepEqual(await finishWorkspaceRemoval(fixture.run, identity, gitFailure()), {
    residueRemoved: true,
  });
  await absent(fixture.run.workspace);
  assert.equal(await isWorkspaceRegistered(fixture.run), false);
  assert.deepEqual(await fixture.repo.snapshot(), before);
});

test('accepts verified absence even when Git reported an error', async (t) => {
  const { run, repo } = await protocolFixture(t);
  const identity = await captureWorkspaceIdentity(run.workspace);
  await repo.git('worktree', 'remove', '--force', run.workspace);
  assert.deepEqual(await finishWorkspaceRemoval(run, identity, gitFailure()), {
    residueRemoved: false,
  });
  await absent(run.workspace);
});

// Catches bypassing Git's lock/retained registration with recursive Node removal.
test('preserves a still-registered workspace and the original Git error', async (t) => {
  const { run, repo } = await protocolFixture(t);
  const before = await repo.snapshot();
  const identity = await captureWorkspaceIdentity(run.workspace);
  const error = gitFailure();
  await assert.rejects(finishWorkspaceRemoval(run, identity, error), (e) => e === error);
  assert.equal(await isWorkspaceRegistered(run), true);
  assert.equal(
    await readFile(join(run.workspace, 'value.mjs'), 'utf8'),
    'export const value=0; export const legacy=true;\n',
  );
  assert.deepEqual(await repo.snapshot(), before);
});

for (const damage of ['missing', 'zero inode', 'wrong path', 'wrong device', 'changed creation'])
  test(`refuses residue with ${damage} identity`, async (t) => {
    const fixture = await protocolFixture(t);
    const { identity } = await unregisterResidue(fixture);
    const candidate = { ...identity };
    if (damage === 'zero inode') candidate.ino = 0n;
    if (damage === 'wrong path') candidate.path = fixture.repo.root;
    if (damage === 'wrong device') candidate.dev += 1n;
    if (damage === 'changed creation') candidate.birthtimeNs = (candidate.birthtimeNs ?? 0n) + 1n;
    const error = gitFailure();
    await assert.rejects(
      finishWorkspaceRemoval(fixture.run, damage === 'missing' ? null : candidate, error),
      /residue|identity/i,
    );
    assert.equal(
      await readFile(join(fixture.run.workspace, 'value.mjs'), 'utf8'),
      'export const value=0; export const legacy=true;\n',
    );
  });

// The parked original remains alive, preventing accidental inode reuse.
test('refuses a foreign replacement at the same workspace pathname', async (t) => {
  const fixture = await protocolFixture(t);
  const { identity, parked } = await unregisterResidue(fixture, { restore: false });
  await mkdir(fixture.run.workspace);
  await writeFile(join(fixture.run.workspace, 'sentinel'), 'foreign directory');
  await assert.rejects(
    finishWorkspaceRemoval(fixture.run, identity, gitFailure()),
    /residue|identity/i,
  );
  assert.equal(
    await readFile(join(fixture.run.workspace, 'sentinel'), 'utf8'),
    'foreign directory',
  );
  await access(join(parked, 'value.mjs'));
});

test('refuses a replacement workspace link without following its target', async (t) => {
  const fixture = await protocolFixture(t);
  const before = await fixture.repo.snapshot();
  const { identity, parked } = await unregisterResidue(fixture, { restore: false });
  await symlink(
    fixture.repo.root,
    fixture.run.workspace,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(
    finishWorkspaceRemoval(fixture.run, identity, gitFailure()),
    /residue|identity/i,
  );
  assert.equal((await lstat(fixture.run.workspace)).isSymbolicLink(), true);
  await access(join(parked, 'value.mjs'));
  assert.deepEqual(await fixture.repo.snapshot(), before);
});

test('unlinks nested source-target links without removing their targets', async (t) => {
  const fixture = await protocolFixture(t);
  const before = await fixture.repo.snapshot();
  const { identity } = await unregisterResidue(fixture);
  await symlink(
    fixture.repo.root,
    join(fixture.run.workspace, 'external'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  assert.deepEqual(await finishWorkspaceRemoval(fixture.run, identity, gitFailure()), {
    residueRemoved: true,
  });
  await absent(fixture.run.workspace);
  assert.deepEqual(await fixture.repo.snapshot(), before);
});

test(
  'fallback permission failure retains output and both errors',
  {
    skip: process.platform === 'win32' || process.getuid?.() === 0,
  },
  async (t) => {
    const fixture = await protocolFixture(t);
    await writeReports(fixture.run);
    const { identity } = await unregisterResidue(fixture);
    const denied = join(fixture.run.workspace, 'denied');
    await mkdir(denied);
    await writeFile(join(denied, 'sentinel'), 'keep on failure');
    await chmod(denied, 0o555);
    const error = gitFailure();
    try {
      await assert.rejects(finishWorkspaceRemoval(fixture.run, identity, error), (failure) => {
        assert.ok(failure instanceof AggregateError);
        assert.ok(failure.errors.includes(error));
        assert.ok(failure.errors.some((e) => e.code === 'EACCES' || e.code === 'EPERM'));
        return true;
      });
      assert.notEqual(fixture.run.phase, 'cleaned');
      await verifyOutputBundle(fixture.run);
      assert.equal(await readFile(join(denied, 'sentinel'), 'utf8'), 'keep on failure');
    } finally {
      await chmod(denied, 0o755);
    }
  },
);

// Catches an unavailable or lossy identity snapshot authorizing residue deletion.
test('captures a stable physical directory identity without mutable timestamps', async (t) => {
  const { run } = await protocolFixture(t);
  const identity = await captureWorkspaceIdentity(run.workspace);
  assert.ok(identity);
  const info = await lstat(run.workspace, { bigint: true });
  assert.equal(identity.path, run.workspace);
  assert.equal(identity.dev, info.dev);
  assert.equal(identity.ino, info.ino);
  assert.ok(identity.ino > 0n);
  assert.equal(identity.birthtimeNs, info.birthtimeNs > 0n ? info.birthtimeNs : null);
  await mkdir(join(run.workspace, 'new-child'));
  assert.deepEqual(await captureWorkspaceIdentity(run.workspace), identity);
});

// Catches throwing on Git's nonzero exit before checking its partial effects.
test(
  'Windows cleanup recovers after Git unregisters but long-path deletion fails',
  {
    skip: process.platform !== 'win32',
  },
  async (t) => {
    const { run, repo, root } = await protocolFixture(t, {
      files: { '.gitignore': 'deep-cache/\n' },
    });
    await repo.git('config', 'core.longpaths', 'false');
    const original = await repo.snapshot();
    let deep = join(run.workspace, 'deep-cache');
    while (join(deep, 'leaf.txt').length < 340) deep = join(deep, 'nested-dependency-segment');
    const leaf = join(deep, 'leaf.txt');
    assert.ok(leaf.length >= 330 && leaf.length <= 380);
    await mkdir(deep, { recursive: true });
    await writeFile(leaf, 'IGNORED_SYNTHETIC_CACHE');
    await writeFile(join(run.workspace, 'value.mjs'), 'export const value=1;\n');
    await checkpoint(run, 'earlier synthetic checkpoint');
    run.phase = 'failed';
    run.outcome = 'failed';
    run.attempts = 2;
    await saveRun(run);
    await writeReports(run);
    const prior = await verifyOutputBundle(run);
    const priorHashes = new Map();
    for (const path of prior.evidenceRefs)
      priorHashes.set(path, digest(await readFile(join(run.directory, path))));
    const findings = structuredClone(run.findings);
    const value = 'export const value=2;\n';
    const binary = Buffer.from([0, 1, 255, 2]);
    await writeFile(join(run.workspace, 'value.mjs'), value);
    await writeFile(join(run.workspace, 'new.txt'), 'final synthetic change\n');
    await writeFile(join(run.workspace, 'binary.bin'), binary);
    let receipt;
    try {
      receipt = await finalizeCleanup(run, { cwd: root });
    } catch (error) {
      // Distinguish the intended old-code failure from oracle/setup failures.
      assert.match(error.message, /filename too long/i);
      assert.equal(await isWorkspaceRegistered(run), false);
      const remaining = await lstat(run.workspace);
      assert.equal(remaining.isDirectory(), true);
      assert.equal(remaining.isSymbolicLink(), false);
      t.diagnostic(
        JSON.stringify({
          observed: 'Git error after unregistration with real directory remaining',
          longestPathLength: leaf.length,
        }),
      );
      throw error;
    }
    const saved = await loadRun(root, run.id);
    assert.equal(receipt.verified, true);
    assert.equal(receipt.phase, 'cleaned');
    assert.equal(receipt.outcome, 'failed');
    assert.equal(receipt.evidenceDeleted, false);
    assert.equal(saved.attempts, 2);
    assert.deepEqual(saved.findings, findings);
    assert.equal(await isWorkspaceRegistered(run), false);
    await assert.rejects(access(run.workspace), { code: 'ENOENT' });
    const recovered = saved.events.filter((e) => e.type === 'cleanup-git-error-recovered');
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].residueRemoved, true);
    assert.ok(Number.isInteger(recovered[0].gitExitCode) && recovered[0].gitExitCode !== 0);
    await verifyOutputBundle(run);
    for (const [path, expected] of priorHashes)
      assert.equal(digest(await readFile(join(run.directory, path))), expected);
    const replay = join(root, 'replay');
    await repo.git('worktree', 'add', '--detach', replay, run.repository.commit);
    try {
      const patches = [
        ...saved.events.filter((e) => e.type === 'checkpoint'),
        saved.events.filter((e) => e.type === 'diff').at(-1),
      ];
      for (const event of patches) {
        const path = join(run.directory, event.diffPath);
        assert.doesNotMatch(await readFile(path, 'utf8'), /IGNORED_SYNTHETIC_CACHE/);
        await runGit(replay, ['apply', '--binary', path]);
      }
      assert.equal(await readFile(join(replay, 'value.mjs'), 'utf8'), value);
      assert.equal(await readFile(join(replay, 'new.txt'), 'utf8'), 'final synthetic change\n');
      assert.deepEqual(await readFile(join(replay, 'binary.bin')), binary);
      assert.deepEqual(await repo.snapshot(), original);
    } finally {
      await repo.git('worktree', 'remove', '--force', replay);
    }
  },
);
