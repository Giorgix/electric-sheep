import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, rm, mkdir, symlink, rename, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { protocolFixture } from './helpers/protocol.mjs';
import { findingInput, followUpInput } from './helpers/follow-up.mjs';
import { addFinding, buildReport, writeReports } from '../src/report.mjs';
import { verifyOutputBundle, writeOutputBundle } from '../src/outputs.mjs';
import { loadRun } from '../src/store.mjs';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
test('publication retains authored follow-up and returns verified absolute artifact paths', async (t) => {
  const { run, root } = await protocolFixture(t);
  await addFinding(run, findingInput());
  const input = followUpInput();
  const approvedHash = run.approvals[0].planHash;
  const paths = await writeReports(run, { followUp: input });
  const manifest = JSON.parse(await readFile(paths.outputManifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.runId, run.id);
  assert.match(manifest.generationId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(manifest.files.map((f) => f.path).sort(), [
    'agent-prompt.md',
    'implementation-plan.md',
    'next-actions.md',
    'report.json',
    'report.md',
  ]);
  for (const file of manifest.files) {
    const bytes = await readFile(join(run.directory, file.path));
    assert.ok(bytes.length);
    assert.equal(file.sha256, digest(bytes));
  }
  assert.equal((await verifyOutputBundle(run)).paths.jsonPath, paths.jsonPath);
  assert.equal(paths.closing.requiresConfirmation, true);
  assert.deepEqual(paths.closing.choices, ['remove-worktree', 'keep-worktree']);
  assert.equal(paths.closing.cleanup.cwd, dirname(run.directory));
  assert.ok(paths.closing.cleanup.args.includes(dirname(run.directory)));
  await access(run.workspace);
  const loaded = await loadRun(root, run.id);
  assert.deepEqual(loaded.followUp, input);
  assert.equal(loaded.approvals[0].planHash, approvedHash);
  input.actions[0].title = 'mutated input';
  await writeReports(loaded);
  assert.equal((await buildReport(loaded)).followUp.actions[0].title, 'Validate boundary behavior');
  assert.equal((await buildReport(loaded)).followUp.source, 'host-agent');
});
test('invalid follow-up cannot modify prior outputs or manifest', async (t) => {
  const { run } = await protocolFixture(t);
  const paths = await writeReports(run);
  const before = await readFile(join(run.directory, 'manifest.json'), 'utf8');
  const prior = await readFile(paths.outputManifestPath, 'utf8');
  await assert.rejects(writeReports(run, { followUp: followUpInput('unknown') }));
  assert.equal(await readFile(join(run.directory, 'manifest.json'), 'utf8'), before);
  assert.equal(await readFile(paths.outputManifestPath, 'utf8'), prior);
});
for (const operation of ['missing', 'tampered', 'stale', 'foreign path'])
  test(`verification rejects ${operation} output`, async (t) => {
    const { run } = await protocolFixture(t);
    const paths = await writeReports(run);
    if (operation === 'missing') await rm(paths.agentPromptPath);
    if (operation === 'tampered') await writeFile(paths.agentPromptPath, 'tampered');
    if (operation === 'stale')
      await writeFile(paths.markdownPath, 'new generation without commit marker');
    if (operation === 'foreign path') {
      const m = JSON.parse(await readFile(paths.outputManifestPath, 'utf8'));
      m.files[0].path = '../foreign';
      await writeFile(paths.outputManifestPath, JSON.stringify(m));
    }
    await assert.rejects(verifyOutputBundle(run));
    await access(run.workspace);
  });
for (const kind of ['directory', 'symlink'])
  test(`publication rejects ${kind} destination without overwriting it`, async (t) => {
    const { run, root } = await protocolFixture(t);
    const output = join(run.directory, 'agent-prompt.md');
    const foreign = join(root, 'foreign');
    await mkdir(foreign);
    await writeFile(join(foreign, 'keep'), 'untouched');
    if (kind === 'directory') await mkdir(output);
    else await symlink(foreign, output, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(writeReports(run), /regular|symlink|destination/i);
    assert.equal(await readFile(join(foreign, 'keep'), 'utf8'), 'untouched');
  });
test('evidence hashing rejects deletion and changed bytes after publication', async (t) => {
  const { run } = await protocolFixture(t);
  const ref = 'evidence/proof.diff';
  await writeFile(join(run.directory, ref), 'proof');
  await addFinding(run, { ...findingInput(), evidenceRefs: [ref] });
  const paths = await writeReports(run);
  const manifest = JSON.parse(await readFile(paths.outputManifestPath, 'utf8'));
  assert.equal(manifest.evidence.find((e) => e.path === ref).sha256, digest('proof'));
  await writeFile(join(run.directory, ref), 'changed');
  await assert.rejects(verifyOutputBundle(run));
  await rm(join(run.directory, ref));
  await assert.rejects(writeReports(run));
});
test('symlinked evidence root is never adopted', async (t) => {
  const { run, root } = await protocolFixture(t);
  await rm(join(run.directory, 'evidence'), { recursive: true });
  const foreign = join(root, 'external evidence');
  await mkdir(foreign);
  await symlink(
    foreign,
    join(run.directory, 'evidence'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(writeReports(run), /evidence|symlink/i);
});
test('publication cannot write arbitrary output names or escaping evidence refs', async (t) => {
  const { run } = await protocolFixture(t);
  await assert.rejects(writeOutputBundle(run, { '../foreign': 'bad' }, []));
  run.findings.push({ ...findingInput(), evidenceRefs: ['../foreign'] });
  await assert.rejects(writeReports(run));
});
test('legacy cleaned runs render without a source checkout or cleanup offer', async (t) => {
  const { run, repo } = await protocolFixture(t);
  const moved = repo.root + '-moved';
  await rename(repo.root, moved);
  t.after(() => rm(moved, { recursive: true, force: true }));
  run.phase = 'cleaned';
  run.outcome = 'completed';
  const paths = await writeReports(run);
  assert.equal(paths.closing.requiresConfirmation, false);
  assert.deepEqual(paths.closing.choices, []);
  assert.equal(paths.closing.cleanup, null);
  assert.equal((await buildReport(run)).followUp.source, 'runner-template');
  await verifyOutputBundle(run);
});
