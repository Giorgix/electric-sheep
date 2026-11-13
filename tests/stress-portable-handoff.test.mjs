import test from 'node:test';
import assert from 'node:assert/strict';
import {
  access,
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  rename,
  realpath,
  readdir,
  symlink,
  lstat,
} from 'node:fs/promises';
import { join, resolve, sep, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { protocolFixture } from './helpers/protocol.mjs';
import { cli } from './helpers/cli.mjs';
import { findingInput, followUpInput } from './helpers/follow-up.mjs';
import { addFinding } from '../src/report.mjs';
import { loadRun } from '../src/store.mjs';

// Catch archives depending on the source run location, incomplete evidence copying,
// overwrite/path escape, or corruption silently acquiring fresh hashes.
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function fixture(t) {
  const f = await protocolFixture(t, { files: { '.gitignore': 'secret.txt\n' } });
  const baseline = await cli(['baseline', '--run', f.run.id, '--runs-root', f.root]);
  assert.equal(baseline.exitCode, 0, baseline.stderr);
  f.run = await loadRun(f.root, f.run.id);
  const input = { schemaVersion: 1, actions: [] };
  await mkdir(join(f.run.directory, 'evidence/details'));
  for (const [id, priority, deps] of [
    ['base', 'low', []],
    ['main', 'high', ['base']],
    ['unrelated', 'low', []],
  ]) {
    const ref = `evidence/details/${id}.txt`;
    await writeFile(join(f.run.directory, ref), `synthetic proof ${id}\n`);
    await addFinding(f.run, { ...findingInput(id), evidenceRefs: [ref] });
    input.actions.push({
      ...followUpInput(id).actions[0],
      id,
      title: `Task ${id}`,
      priority,
      dependsOn: deps,
    });
  }
  await writeFile(join(f.run.workspace, 'secret.txt'), 'IGNORED_DO_NOT_EXPORT');
  await writeFile(join(f.run.directory, 'evidence/unreferenced.txt'), 'UNREFERENCED_DO_NOT_EXPORT');
  const inputPath = join(f.root, 'input.json');
  await writeFile(inputPath, JSON.stringify(input));
  const report = await cli([
    'report',
    '--run',
    f.run.id,
    '--runs-root',
    f.root,
    '--follow-up',
    inputPath,
  ]);
  assert.equal(report.exitCode, 0, report.stderr);
  const exportParent = await realpath(await mkdtemp(join(tmpdir(), 'sheep portable ü ')));
  t.after(() => rm(exportParent, { recursive: true, force: true, maxRetries: 3 }));
  const out = join(exportParent, 'archive');
  const invoke = (destination = out) =>
    cli([
      'export',
      '--run',
      f.run.id,
      '--runs-root',
      f.root,
      '--out',
      destination,
      '--priority',
      'high',
    ]);
  return { ...f, out, exportParent, invoke };
}
// Independent manifest walk: no production hashing/selection/verifier helper computes expectations.
async function verifyIndependently(directory, runId) {
  const manifest = JSON.parse(await readFile(join(directory, 'outputs.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.runId, runId);
  assert.deepEqual(manifest.files.map((f) => f.path).sort(), [
    'agent-prompt.md',
    'implementation-plan.md',
    'next-actions.md',
    'report.json',
    'report.md',
  ]);
  for (const entry of [...manifest.files, ...manifest.evidence]) {
    assert.equal(isAbsolute(entry.path), false);
    const path = resolve(directory, entry.path);
    assert.ok(path.startsWith(directory + sep));
    assert.equal((await lstat(path)).isSymbolicLink(), false);
    assert.equal(sha(await readFile(path)), entry.sha256);
  }
  const report = JSON.parse(await readFile(join(directory, 'report.json'), 'utf8'));
  for (const finding of report.findings)
    for (const ref of finding.evidenceRefs) await access(join(directory, ref));
  for (const match of (await readFile(join(directory, 'report.md'), 'utf8')).matchAll(
    /\]\(([^)]+)\)/g,
  ))
    await access(join(directory, match[1]));
  return { report, manifest };
}
test('portable export relocates with selected dependencies full findings snapshots and evidence, without altering original publication', async (t) => {
  const f = await fixture(t);
  const sourceManifest = await readFile(join(f.run.directory, 'manifest.json'), 'utf8');
  const sourcePublication = await readFile(join(f.run.directory, 'outputs.json'), 'utf8');
  const original = await f.repo.snapshot();
  const exported = await f.invoke();
  assert.equal(exported.exitCode, 0, exported.stderr);
  const receipt = JSON.parse(exported.stdout);
  assert.equal(receipt.verified, true);
  assert.equal(receipt.portable, true);
  assert.equal(receipt.directory, await realpath(f.out));
  assert.equal(await readFile(join(f.run.directory, 'manifest.json'), 'utf8'), sourceManifest);
  assert.equal(await readFile(join(f.run.directory, 'outputs.json'), 'utf8'), sourcePublication);
  const moved = join(f.exportParent, 'relocated archive');
  await rename(f.out, moved);
  const cleaned = await cli(
    ['cleanup', '--run', f.run.id, '--confirm', f.run.id, '--runs-root', f.root],
    { cwd: f.root },
  );
  assert.equal(cleaned.exitCode, 0, cleaned.stderr);
  const hidden = f.run.directory + '-hidden';
  await rename(f.run.directory, hidden);
  const { report, manifest } = await verifyIndependently(moved, f.run.id);
  assert.deepEqual(
    report.followUp.actions.map((a) => a.id),
    ['base', 'main'],
  );
  assert.deepEqual(
    report.findings.map((a) => a.id),
    ['base', 'main', 'unrelated'],
  );
  assert.ok(manifest.evidence.some((e) => e.path.endsWith('.artifact')));
  assert.ok(manifest.evidence.some((e) => e.path.endsWith('.stdout')));
  assert.ok(!manifest.evidence.some((e) => e.path.endsWith('unreferenced.txt')));
  await assert.rejects(access(join(moved, 'secret.txt')));
  const prompt = await readFile(join(moved, 'agent-prompt.md'), 'utf8');
  assert.match(prompt, /Plan: implementation-plan\.md/);
  assert.match(prompt, /Integrity manifest: outputs\.json/);
  assert.match(prompt, /selected priorities:\s*high/i);
  assert.match(prompt, /prerequisite.*base/i);
  assert.match(prompt, /fresh.*approval|approval.*fresh/i);
  const { verifyPortableBundle } = await import('../src/outputs.mjs');
  await verifyPortableBundle(moved, f.run.id);
  assert.deepEqual(await f.repo.snapshot(), original);
});
for (const damage of ['changed', 'missing'])
  test(`portable verifier rejects ${damage} exported evidence`, async (t) => {
    const f = await fixture(t);
    const result = await f.invoke();
    assert.equal(result.exitCode, 0, result.stderr);
    const target = join(f.out, 'evidence/details/base.txt');
    if (damage === 'changed') await writeFile(target, 'corruption');
    else await rm(target);
    await assert.rejects(verifyIndependently(f.out, f.run.id));
    const { verifyPortableBundle } = await import('../src/outputs.mjs');
    await assert.rejects(verifyPortableBundle(f.out, f.run.id));
  });
for (const existing of ['empty directory', 'nonempty directory', 'file'])
  test(`export refuses an existing ${existing} without overwriting`, async (t) => {
    const f = await fixture(t);
    if (existing === 'file') await writeFile(f.out, 'keep');
    else {
      await mkdir(f.out);
      if (existing === 'nonempty directory') await writeFile(join(f.out, 'marker'), 'keep');
    }
    const result = await f.invoke();
    assert.notEqual(result.exitCode, 0);
    if (existing === 'file') assert.equal(await readFile(f.out, 'utf8'), 'keep');
    else assert.deepEqual(await readdir(f.out), existing === 'empty directory' ? [] : ['marker']);
  });
for (const where of ['source', 'run', 'runs root'])
  test(`export refuses a destination inside fixture ${where}`, async (t) => {
    const f = await fixture(t);
    const out = join(
      where === 'source' ? f.repo.root : where === 'run' ? f.run.directory : f.root,
      'forbidden-archive',
    );
    const result = await f.invoke(out);
    assert.notEqual(result.exitCode, 0);
    await assert.rejects(access(out));
  });
test('export refuses a symlink/junction parent without writing into its target', async (t) => {
  const f = await fixture(t);
  const foreign = join(f.exportParent, 'foreign');
  await mkdir(foreign);
  await writeFile(join(foreign, 'marker'), 'keep');
  const alias = join(f.exportParent, 'alias');
  await symlink(foreign, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const result = await f.invoke(join(alias, 'archive'));
  assert.notEqual(result.exitCode, 0);
  assert.deepEqual(await readdir(foreign), ['marker']);
});
for (const damage of ['changed proof', 'missing proof', 'escaping manifest reference'])
  test(`export refuses ${damage} before creating destination or replacing source hashes`, async (t) => {
    const f = await fixture(t);
    const publication = join(f.run.directory, 'outputs.json');
    if (damage === 'changed proof')
      await writeFile(join(f.run.directory, 'evidence/details/base.txt'), 'corruption');
    if (damage === 'missing proof') await rm(join(f.run.directory, 'evidence/details/base.txt'));
    if (damage === 'escaping manifest reference') {
      const manifest = JSON.parse(await readFile(publication, 'utf8'));
      manifest.evidence[0].path = '../outside';
      await writeFile(publication, JSON.stringify(manifest));
    }
    const before = await readFile(publication, 'utf8');
    const result = await f.invoke();
    assert.notEqual(result.exitCode, 0);
    assert.equal(await readFile(publication, 'utf8'), before);
    await assert.rejects(access(f.out));
  });
