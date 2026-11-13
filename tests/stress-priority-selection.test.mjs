import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { protocolFixture } from './helpers/protocol.mjs';
import { cli } from './helpers/cli.mjs';
import { findingInput, followUpInput } from './helpers/follow-up.mjs';
import { addFinding } from '../src/report.mjs';
import { verifyOutputBundle } from '../src/outputs.mjs';
import { loadRun } from '../src/store.mjs';

// Catch selection being ignored, saved actions being destroyed, or uncertainty gates being lost.
async function fixture(t) {
  const f = await protocolFixture(t);
  const proof = 'evidence/priority-proof.txt';
  await writeFile(join(f.run.directory, proof), 'synthetic priority evidence\n');
  const input = { schemaVersion: 1, actions: [] };
  for (const priority of ['high', 'medium', 'low']) {
    await addFinding(f.run, { ...findingInput(priority), evidenceRefs: [proof] });
    input.actions.push({
      ...followUpInput(priority).actions[0],
      id: priority,
      title: `Action ${priority} only`,
      priority,
      dependsOn: [],
    });
  }
  const file = join(f.root, 'authored.json');
  await writeFile(file, JSON.stringify(input));
  const invoke = (...args) => cli(['report', '--run', f.run.id, '--runs-root', f.root, ...args]);
  const initial = await invoke('--follow-up', file);
  assert.equal(initial.exitCode, 0, initial.stderr);
  return { ...f, invoke, input, proof };
}
async function result(f, ...args) {
  const generated = await f.invoke(...args);
  assert.equal(generated.exitCode, 0, generated.stderr);
  const paths = JSON.parse(generated.stdout);
  const report = JSON.parse(await readFile(paths.jsonPath, 'utf8'));
  await verifyOutputBundle(await loadRun(f.root, f.run.id));
  return { paths, report };
}
test('priority view selects high actions while preserving findings saved input evidence and gates', async (t) => {
  const f = await fixture(t);
  const { paths, report } = await result(f, '--priority', 'high');
  assert.equal(report.schemaVersion, 1);
  assert.deepEqual(
    report.followUp.actions.map((a) => a.id),
    ['high'],
  );
  assert.deepEqual(
    report.findings.map((a) => a.id),
    ['high', 'medium', 'low'],
  );
  assert.deepEqual(report.followUp.selection.priorities, ['high']);
  assert.deepEqual(report.followUp.actions[0].evidenceRefs, [f.proof]);
  assert.deepEqual(report.followUp.actions[0].origins, ['uncertain']);
  assert.match(report.followUp.actions[0].gates.join(' '), /validat/i);
  assert.match(report.followUp.actions[0].gates.join(' '), /approval/i);
  assert.deepEqual((await loadRun(f.root, f.run.id)).followUp, f.input);
  for (const path of [paths.implementationPlanPath, paths.agentPromptPath]) {
    const text = await readFile(path, 'utf8');
    assert.match(text, /selected priorities:\s*high/i);
    assert.ok(text.includes('Action high only'));
    assert.ok(!text.includes('Action low only'));
  }
});
test('multiple priority options form a deduplicated union in original action order', async (t) => {
  const f = await fixture(t);
  const { report } = await result(
    f,
    '--priority',
    'low',
    '--priority',
    'high',
    '--priority',
    'high',
  );
  assert.deepEqual(
    report.followUp.actions.map((a) => a.id),
    ['high', 'low'],
  );
});
test('omitting priority after a selected view restores all actions without losing authored data', async (t) => {
  const f = await fixture(t);
  await result(f, '--priority', 'high');
  const { report } = await result(f);
  assert.deepEqual(
    report.followUp.actions.map((a) => a.id),
    ['high', 'medium', 'low'],
  );
  assert.equal(report.followUp.source, 'host-agent');
});
test('empty selection is disclosed without pretending there were no findings', async (t) => {
  const f = await fixture(t);
  const { report, paths } = await result(f, '--priority', 'untriaged');
  assert.deepEqual(report.followUp.actions, []);
  assert.equal(report.findings.length, 3);
  const text = await readFile(paths.implementationPlanPath, 'utf8');
  assert.match(text, /selected priorities:\s*untriaged/i);
  assert.match(text, /no actions.*match/i);
  assert.doesNotMatch(text, /no agent findings recorded/i);
});
for (const value of ['urgent', 'HIGH', ''])
  test(`invalid priority ${JSON.stringify(value)} is usage error without changing prior state/output`, async (t) => {
    const f = await fixture(t);
    const manifestPath = join(f.run.directory, 'manifest.json');
    const outputPath = join(f.run.directory, 'outputs.json');
    const before = await readFile(manifestPath, 'utf8');
    const outputs = await readFile(outputPath, 'utf8');
    const invalid = await f.invoke('--priority', value);
    assert.equal(invalid.exitCode, 2, invalid.stderr);
    assert.equal(await readFile(manifestPath, 'utf8'), before);
    assert.equal(await readFile(outputPath, 'utf8'), outputs);
  });
