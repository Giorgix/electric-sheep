import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { protocolFixture } from './helpers/protocol.mjs';
import { findingInput } from './helpers/follow-up.mjs';
import { cli } from './helpers/cli.mjs';
import { addFinding } from '../src/report.mjs';
import { loadRun } from '../src/store.mjs';

// Catch filtering that promotes a template to authored input or destroys findings.
for (const priority of ['untriaged', 'high'])
  test(`template selection preserves untriaged provenance and saved data (${priority})`, async (t) => {
    const f = await protocolFixture(t);
    await addFinding(f.run, findingInput());
    const result = await cli([
      'report',
      '--run',
      f.run.id,
      '--runs-root',
      f.root,
      '--priority',
      priority,
    ]);
    assert.equal(result.exitCode, 0, result.stderr);
    const report = JSON.parse(await readFile(JSON.parse(result.stdout).jsonPath, 'utf8'));
    assert.equal(report.followUp.source, 'runner-template');
    assert.deepEqual(report.followUp.selection.priorities, [priority]);
    assert.deepEqual(
      report.findings.map((v) => v.id),
      ['risk'],
    );
    if (priority === 'untriaged') {
      assert.equal(report.followUp.actions.length, 1);
      assert.equal(report.followUp.actions[0].priority, 'untriaged');
      assert.deepEqual(report.followUp.actions[0].findingIds, ['risk']);
    } else {
      assert.deepEqual(report.followUp.actions, []);
      assert.ok(!report.followUp.notes.some((s) => /no agent findings recorded/i.test(s)));
    }
    const saved = await loadRun(f.root, f.run.id);
    assert.equal(saved.followUp, undefined);
    assert.deepEqual(saved.findings, f.run.findings);
  });
test('selection without findings does not invent tasks', async (t) => {
  const f = await protocolFixture(t);
  const result = await cli([
    'report',
    '--run',
    f.run.id,
    '--runs-root',
    f.root,
    '--priority',
    'high',
  ]);
  assert.equal(result.exitCode, 0, result.stderr);
  const report = JSON.parse(await readFile(JSON.parse(result.stdout).jsonPath, 'utf8'));
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.followUp.actions, []);
  assert.equal(report.followUp.source, 'runner-template');
  assert.match(report.followUp.notes.join(' '), /no .*findings|no .*defects/i);
});
