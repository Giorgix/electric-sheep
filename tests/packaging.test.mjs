import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  rm,
  readFile,
  access,
  writeFile,
  cp,
  realpath,
  rename,
  lstat,
  readdir,
  symlink,
} from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { packageLocal } from '../scripts/package-local.mjs';
import { protocolFixture } from './helpers/protocol.mjs';
import { addFinding } from '../src/report.mjs';
import { findingInput } from './helpers/follow-up.mjs';
const source = join(import.meta.dirname, '..');
async function assertReferenceAssets(skillDirectory) {
  for (const file of [
    'challenges.md',
    'assessment.md',
    'follow-up.md',
    'plan.example.json',
    'follow-up.example.json',
  ]) {
    assert.deepEqual(
      await readFile(join(skillDirectory, 'references', file)),
      await readFile(join(source, 'skills/evolution-stress-test/references', file)),
      `Reference asset differs: ${file}`,
    );
  }
}
async function temp(t) {
  const root = await mkdtemp(join(tmpdir(), 'electric-sheep bundles ü '));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function assertNotice(file, expectedBytes) {
  const info = await lstat(file).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  assert.ok(info?.isFile(), `Missing regular license: ${file}`);
  assert.deepEqual(await readFile(file), expectedBytes);
}
async function sourceWithoutLicense(t) {
  const root = await temp(t);
  const fixture = join(root, 'source');
  await cp(source, fixture, {
    recursive: true,
    filter: (path) =>
      path !== join(source, 'LICENSE') &&
      !['.git', '.worktrees', '.superpowers', 'node_modules'].includes(basename(path)),
  });
  const { packageLocal: packageFixture } = await import(
    pathToFileURL(join(fixture, 'scripts/package-local.mjs')).href
  );
  return { root, fixture, packageFixture };
}
async function assertUnpublished(root, out) {
  await assert.rejects(access(out), { code: 'ENOENT' });
  assert.deepEqual(
    (await readdir(root)).filter((name) => name.startsWith('.electric-sheep-package-')),
    [],
  );
}
for (const host of ['claude', 'codex'])
  test(`${host} bundle contains shared skill and independently usable runner`, async (t) => {
    const root = await temp(t),
      out = join(root, host);
    await packageLocal({ host, out });
    const manifest = JSON.parse(
      await readFile(
        join(out, `.${host === 'claude' ? 'claude' : 'codex'}-plugin/plugin.json`),
        'utf8',
      ),
    );
    const pkg = JSON.parse(await readFile(join(out, 'package.json'), 'utf8'));
    assert.equal(manifest.name, 'electric-sheep');
    assert.equal(manifest.version, pkg.version);
    const notice = await readFile(join(source, 'LICENSE'));
    await assertNotice(join(out, 'LICENSE'), notice);
    await assertNotice(join(out, 'skills/evolution-stress-test/LICENSE'), notice);
    await assertReferenceAssets(join(out, 'skills/evolution-stress-test'));
    assert.equal(
      await readFile(join(out, 'skills/evolution-stress-test/SKILL.md'), 'utf8'),
      await readFile(join(source, 'skills/evolution-stress-test/SKILL.md'), 'utf8'),
    );
    for (const forbidden of ['.git', '.superpowers', 'tests', 'AGENTS.md', 'hooks', '.env'])
      await assert.rejects(access(join(out, forbidden)));
    const result = await promisify(execFile)(
      process.execPath,
      [join(out, 'bin/electric-sheep.mjs'), '--help'],
      { cwd: root },
    );
    assert.match(result.stdout, /Electric Sheep/);
  });
test('standalone Codex skill keeps its runner after copying only the complete generated skill', async (t) => {
  const root = await temp(t),
    out = join(root, 'bundle');
  await packageLocal({ host: 'codex', out });
  const installed = join(root, 'user-skills/evolution-stress-test');
  await cp(join(out, 'skills/evolution-stress-test'), installed, { recursive: true });
  await rm(out, { recursive: true });
  await assertReferenceAssets(installed);
  const notice = await readFile(join(source, 'LICENSE'));
  await assertNotice(join(installed, 'LICENSE'), notice);
  await assertNotice(join(installed, 'scripts/runner/LICENSE'), notice);
  const embedded = JSON.parse(
    await readFile(join(installed, 'scripts/runner/package.json'), 'utf8'),
  );
  assert.equal(embedded.license, 'MIT');
  const result = await promisify(execFile)(
    process.execPath,
    [join(installed, 'scripts/run.mjs'), '--help'],
    { cwd: root },
  );
  assert.match(result.stdout, /Electric Sheep/);
  const fixture = await protocolFixture(t);
  const proof = 'evidence/copied-proof.artifact';
  await writeFile(join(fixture.run.directory, proof), 'synthetic copied-runtime evidence\n');
  await addFinding(fixture.run, { ...findingInput('boundary-risk'), evidenceRefs: [proof] });
  const args = ['--run', fixture.run.id, '--runs-root', fixture.root];
  const report = await promisify(execFile)(
    process.execPath,
    [
      join(installed, 'scripts/run.mjs'),
      'report',
      ...args,
      '--follow-up',
      join(installed, 'references/follow-up.example.json'),
      '--priority',
      'untriaged',
    ],
    { cwd: root },
  );
  const paths = JSON.parse(report.stdout);
  await access(paths.agentPromptPath);
  await access(fixture.run.workspace);
  const selected = JSON.parse(await readFile(paths.jsonPath, 'utf8'));
  assert.equal(selected.id, fixture.run.id);
  assert.deepEqual(selected.followUp.selection.priorities, ['untriaged']);
  assert.deepEqual(
    selected.followUp.actions.map((a) => a.id),
    ['validate-boundary'],
  );
  assert.deepEqual(
    selected.findings.map((f) => f.id),
    ['boundary-risk'],
  );
  const archive = join(await realpath(root), 'portable archive');
  const exported = await promisify(execFile)(
    process.execPath,
    [
      join(installed, 'scripts/run.mjs'),
      'export',
      ...args,
      '--out',
      archive,
      '--priority',
      'untriaged',
    ],
    { cwd: root },
  );
  const receipt = JSON.parse(exported.stdout);
  assert.equal(receipt.runId, fixture.run.id);
  assert.equal(receipt.directory, archive);
  assert.equal(receipt.portable, true);
  assert.equal(receipt.verified, true);
  const publication = JSON.parse(await readFile(join(archive, 'outputs.json'), 'utf8'));
  assert.equal(publication.schemaVersion, 1);
  assert.equal(publication.runId, fixture.run.id);
  assert.deepEqual(
    publication.evidence.map((e) => e.path),
    [proof],
  );
  assert.equal(
    publication.evidence[0].sha256,
    createHash('sha256').update('synthetic copied-runtime evidence\n').digest('hex'),
  );
  const cleaned = await promisify(execFile)(
    paths.closing.cleanup.executable,
    paths.closing.cleanup.args,
    { cwd: paths.closing.cleanup.cwd },
  );
  assert.equal(JSON.parse(cleaned.stdout).verified, true);
  await assert.rejects(access(fixture.run.workspace));
  await access(paths.implementationPlanPath);
  const moved = join(await realpath(root), 'moved portable archive');
  await rename(archive, moved);
  await rename(fixture.run.directory, fixture.run.directory + '-hidden');
  const { verifyPortableBundle } = await import(
    pathToFileURL(join(installed, 'scripts/runner/src/outputs.mjs')).href
  );
  const verified = await verifyPortableBundle(moved, fixture.run.id);
  assert.deepEqual(verified.evidenceRefs, [proof]);
  assert.equal(await readFile(join(moved, proof), 'utf8'), 'synthetic copied-runtime evidence\n');
  assert.match(
    await readFile(join(moved, 'agent-prompt.md'), 'utf8'),
    /Plan: implementation-plan\.md/,
  );
});
test('Claude bundle carries a self-contained catalog whose root skill runner works', async (t) => {
  const root = await temp(t),
    out = join(root, 'catalog-bundle');
  await packageLocal({ host: 'claude', out });
  const catalog = JSON.parse(await readFile(join(out, '.claude-plugin/marketplace.json'), 'utf8'));
  assert.deepEqual(
    catalog,
    JSON.parse(await readFile(join(source, '.claude-plugin/marketplace.json'), 'utf8')),
  );
  assert.equal(catalog.plugins[0].source, './');
  const pluginRoot = join(out, catalog.plugins[0].source);
  const manifest = JSON.parse(
    await readFile(join(pluginRoot, '.claude-plugin/plugin.json'), 'utf8'),
  );
  assert.equal(manifest.name, 'electric-sheep');
  assert.equal(manifest.version, catalog.plugins[0].version);
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [join(pluginRoot, 'skills/evolution-stress-test/scripts/run.mjs'), '--help'],
    { cwd: root },
  );
  assert.match(stdout, /Electric Sheep/);
});
test('missing source license refuses publication and removes staging residue', async (t) => {
  const { root, packageFixture } = await sourceWithoutLicense(t);
  const out = join(root, 'bundle');
  await assert.rejects(packageFixture({ host: 'codex', out }), /LICENSE/);
  await assertUnpublished(root, out);
});
test('symlinked source license refuses publication without changing its target', async (t) => {
  const { root, fixture, packageFixture } = await sourceWithoutLicense(t);
  const target = join(root, 'protected-notice');
  await writeFile(target, 'synthetic protected file\n');
  try {
    await symlink(target, join(fixture, 'LICENSE'), 'file');
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOSYS', 'ENOTSUP'].includes(error.code)) throw error;
    t.skip(`File symlinks unavailable: ${error.code}`);
    return;
  }
  const out = join(root, 'bundle');
  await assert.rejects(packageFixture({ host: 'claude', out }), /Cannot package symlink/);
  assert.equal(await readFile(target, 'utf8'), 'synthetic protected file\n');
  await assertUnpublished(root, out);
});
test('unsafe output locations and unknown hosts are rejected without overwrite', async (t) => {
  await assert.rejects(
    packageLocal({ host: 'claude', out: join(source, 'bad-bundle') }),
    /output/i,
  );
  const root = await temp(t);
  await writeFile(join(root, 'valuable'), 'preserve');
  await assert.rejects(packageLocal({ host: 'claude', out: root }), /empty|exists/i);
  assert.equal(await readFile(join(root, 'valuable'), 'utf8'), 'preserve');
  await assert.rejects(packageLocal({ host: 'unknown', out: join(root, 'other') }), /host/i);
});
