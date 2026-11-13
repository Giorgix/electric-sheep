import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, realpath, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { protocolFixture } from './helpers/protocol.mjs';
import { cli } from './helpers/cli.mjs';
import { addFinding } from '../src/report.mjs';
import { findingInput } from './helpers/follow-up.mjs';

// A leading '..' within a filename is not a parent-directory path segment.
for (const location of ['source', 'runs root'])
  test(`export refuses a dot-dot-prefixed child inside ${location}`, async (t) => {
    const f = await protocolFixture(t);
    const report = await cli(['report', '--run', f.run.id, '--runs-root', f.root]);
    assert.equal(report.exitCode, 0, report.stderr);
    const before = await f.repo.snapshot();
    const parent = await realpath(location === 'source' ? f.repo.root : f.root);
    const out = join(parent, '..archive');
    const result = await cli(['export', '--run', f.run.id, '--runs-root', f.root, '--out', out]);
    assert.notEqual(result.exitCode, 0, 'must refuse an archive inside the protected root');
    assert.match(result.stderr, /outside.*repository.*runs root/i);
    await assert.rejects(access(out));
    assert.deepEqual(await f.repo.snapshot(), before);
  });
test('dot-dot-prefixed evidence filename remains contained and exportable', async (t) => {
  const f = await protocolFixture(t);
  const ref = 'evidence/..notes.txt';
  await writeFile(join(f.run.directory, ref), 'valid contained evidence\n');
  await addFinding(f.run, { ...findingInput(), evidenceRefs: [ref] });
  const report = await cli(['report', '--run', f.run.id, '--runs-root', f.root]);
  assert.equal(report.exitCode, 0, report.stderr);
  const parent = await realpath(await mkdtemp(join(tmpdir(), 'sheep dot dot ')));
  t.after(() => rm(parent, { recursive: true, force: true, maxRetries: 3 }));
  const out = join(parent, 'archive');
  const result = await cli(['export', '--run', f.run.id, '--runs-root', f.root, '--out', out]);
  assert.equal(result.exitCode, 0, result.stderr);
  assert.equal(await readFile(join(out, ref), 'utf8'), 'valid contained evidence\n');
});
