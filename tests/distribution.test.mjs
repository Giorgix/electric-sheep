import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm, writeFile, realpath } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { protocolFixture } from './helpers/protocol.mjs';

const source = join(import.meta.dirname, '..');
const exec = promisify(execFile);
const json = async (path) => JSON.parse(await readFile(join(source, path), 'utf8'));

// Catch a mismatch between public install identifiers, the npm entry, and release metadata.
test('release artifacts register the Electric Sheep package and matching plugin identities', async () => {
  const pkg = await json('package.json');
  const lock = await json('package-lock.json');
  for (const metadata of [
    pkg,
    lock,
    lock.packages[''],
    await json('.claude-plugin/plugin.json'),
    await json('.codex-plugin/plugin.json'),
  ]) {
    assert.equal(metadata.name, 'electric-sheep');
    assert.equal(metadata.version, '0.4.0');
  }
  assert.deepEqual(pkg.bin, { 'electric-sheep': 'bin/electric-sheep.mjs' });
  assert.deepEqual(lock.packages[''].bin, pkg.bin);
  assert.deepEqual(await readdir(join(source, 'bin')), ['electric-sheep.mjs']);
});

// Run the registered artifact rather than inspecting its implementation text.
test('registered CLI advertises Electric Sheep and its new default storage', async () => {
  const pkg = await json('package.json');
  const { stdout } = await exec(
    process.execPath,
    [join(source, Object.values(pkg.bin)[0]), '--help'],
    { cwd: tmpdir() },
  );
  assert.match(stdout, /Electric Sheep — isolated evolution stress tests/);
  assert.match(stdout, /Usage: electric-sheep /);
  assert.match(stdout, /~\/\.electric-sheep\/runs/);
});

// Catch changing help without changing storage, or breaking pre-existing explicit roots.
test('default storage uses the new home directory while explicit schema-1 runs stay accessible', async (t) => {
  const { root, repo, run: existing } = await protocolFixture(t);
  const before = await repo.snapshot();
  const home = await mkdtemp(join(tmpdir(), 'electric-sheep home ü '));
  t.after(() => rm(home, { recursive: true, force: true, maxRetries: 3 }));
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  delete env.NODE_TEST_CONTEXT;
  const pkg = await json('package.json');
  const invoke = (args) =>
    exec(process.execPath, [join(source, Object.values(pkg.bin)[0]), ...args], { env, cwd: root });
  const planPath = join(root, 'approved-plan.json');
  await writeFile(planPath, JSON.stringify(existing.plan));
  const { stdout } = await invoke([
    'start',
    '--repo',
    repo.root,
    '--plan',
    planPath,
    '--approval-note',
    'Approved local fixture',
  ]);
  const started = JSON.parse(stdout);
  try {
    assert.equal(dirname(started.directory), join(await realpath(home), '.electric-sheep', 'runs'));
    const prior = JSON.parse(
      (await invoke(['status', '--run', existing.id, '--runs-root', root])).stdout,
    );
    assert.equal(prior.schemaVersion, 1);
    assert.equal(prior.id, existing.id);
    assert.equal(prior.directory, existing.directory);
    assert.deepEqual(await repo.snapshot(), before);
  } finally {
    await invoke([
      'cleanup',
      '--run',
      started.id,
      '--confirm',
      started.id,
      '--runs-root',
      dirname(started.directory),
    ]);
  }
});

// Catch an install name that cannot resolve to the shipped root plugin.
test('marketplace exposes the renamed root plugin with matching release metadata', async () => {
  const catalog = await json('.claude-plugin/marketplace.json');
  assert.equal(catalog.name, 'electric-sheep');
  assert.equal(catalog.owner.name, 'Giorgix');
  assert.equal(catalog.plugins.length, 1);
  const entry = catalog.plugins[0];
  assert.equal(entry.name, 'electric-sheep');
  assert.equal(entry.source, './');
  assert.equal(entry.version, '0.4.0');
  assert.equal(entry.strict, true);
  const manifest = await json(join(entry.source, '.claude-plugin/plugin.json'));
  assert.equal(entry.name, manifest.name);
  assert.equal(entry.version, manifest.version);
  const { stdout } = await exec(
    process.execPath,
    [join(source, entry.source, 'skills/evolution-stress-test/scripts/run.mjs'), '--help'],
    { cwd: tmpdir() },
  );
  assert.match(stdout, /Electric Sheep/);
});
