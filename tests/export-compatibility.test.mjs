import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { protocolFixture } from './helpers/protocol.mjs';
import { cli } from './helpers/cli.mjs';
import { verifyOutputBundle } from '../src/outputs.mjs';

async function archiveFixture(t) {
  const f = await protocolFixture(t);
  const report = await cli(['report', '--run', f.run.id, '--runs-root', f.root]);
  assert.equal(report.exitCode, 0, report.stderr);
  const parent = await realpath(await mkdtemp(join(tmpdir(), 'sheep archive boundary ü ')));
  t.after(() => rm(parent, { recursive: true, force: true, maxRetries: 3 }));
  const archive = join(parent, f.run.id);
  const result = await cli(['export', '--run', f.run.id, '--runs-root', f.root, '--out', archive]);
  assert.equal(result.exitCode, 0, result.stderr);
  const { verifyPortableBundle } = await import('../src/outputs.mjs');
  return { ...f, parent, archive, verifyPortableBundle };
}
// Catch treating a hash-valid data archive as owned state authorized for deletion.
test('portable archive cannot be adopted by cleanup', async (t) => {
  const f = await archiveFixture(t);
  const before = await readFile(join(f.archive, 'outputs.json'), 'utf8');
  await assert.rejects(access(join(f.archive, 'owner.json')));
  await assert.rejects(
    verifyOutputBundle({ ...f.run, directory: f.archive }),
    /owner\.json|ownership/i,
  );
  const cleanupAttempt = await cli(
    ['cleanup', '--run', f.run.id, '--confirm', f.run.id, '--runs-root', f.parent],
    { cwd: f.parent },
  );
  assert.notEqual(cleanupAttempt.exitCode, 0);
  assert.equal(await readFile(join(f.archive, 'outputs.json'), 'utf8'), before);
  await f.verifyPortableBundle(f.archive, f.run.id);
  await verifyOutputBundle(f.run);
});
// Catch identity checks disappearing from the location-independent verifier.
test('portable verification rejects a different run ID', async (t) => {
  const f = await archiveFixture(t);
  await assert.rejects(f.verifyPortableBundle(f.archive, '00000000-0000-4000-8000-000000000000'));
  await f.verifyPortableBundle(f.archive, f.run.id);
  await verifyOutputBundle(f.run);
});
// Catch accepting incomplete publication or borrowing a source run's manifest.
test('portable verification rejects a missing publication manifest', async (t) => {
  const f = await archiveFixture(t);
  await rm(join(f.archive, 'outputs.json'));
  await assert.rejects(f.verifyPortableBundle(f.archive, f.run.id));
  await verifyOutputBundle(f.run);
});
