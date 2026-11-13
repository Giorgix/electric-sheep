import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { protocolFixture } from './helpers/protocol.mjs';
import { findingInput } from './helpers/follow-up.mjs';
import { cli } from './helpers/cli.mjs';
import { addFinding } from '../src/report.mjs';
import { verifyPortableBundle, verifyOutputBundle } from '../src/outputs.mjs';

// Hashes need not establish authenticity, but a verified package must be internally consistent.
for (const damage of ['omitted finding evidence', 'mismatched report identity'])
  test(`portable verification refuses ${damage} even when listed hashes match`, async (t) => {
    const f = await protocolFixture(t);
    const proof = 'evidence/proof.txt';
    await writeFile(join(f.run.directory, proof), 'proof');
    await addFinding(f.run, { ...findingInput(), evidenceRefs: [proof] });
    const args = ['--run', f.run.id, '--runs-root', f.root];
    const report = await cli(['report', ...args]);
    assert.equal(report.exitCode, 0, report.stderr);
    const parent = await realpath(await mkdtemp(join(tmpdir(), 'sheep consistency ')));
    t.after(() => rm(parent, { recursive: true, force: true, maxRetries: 3 }));
    const out = join(parent, 'archive');
    const exported = await cli(['export', ...args, '--out', out]);
    assert.equal(exported.exitCode, 0, exported.stderr);
    const path = join(out, 'outputs.json');
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    if (damage === 'omitted finding evidence') {
      await rm(join(out, proof));
      manifest.evidence = manifest.evidence.filter((e) => e.path !== proof);
    } else {
      const reportPath = join(out, 'report.json');
      const content = JSON.parse(await readFile(reportPath, 'utf8'));
      content.id = '00000000-0000-4000-8000-000000000000';
      const bytes = JSON.stringify(content);
      await writeFile(reportPath, bytes);
      manifest.files.find((f) => f.path === 'report.json').sha256 = createHash('sha256')
        .update(bytes)
        .digest('hex');
    }
    await writeFile(path, JSON.stringify(manifest));
    await assert.rejects(
      verifyPortableBundle(out, f.run.id),
      /report identity|unpublished evidence/i,
    );
    await verifyOutputBundle(f.run);
  });
