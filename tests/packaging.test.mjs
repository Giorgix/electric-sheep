import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, access, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { packageLocal } from '../scripts/package-local.mjs';
const source = join(import.meta.dirname, '..');
async function temp(t) {
  const root = await mkdtemp(join(tmpdir(), 'electric-sheep bundles ü '));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
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
  const result = await promisify(execFile)(
    process.execPath,
    [join(installed, 'scripts/run.mjs'), '--help'],
    { cwd: root },
  );
  assert.match(result.stdout, /Electric Sheep/);
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
