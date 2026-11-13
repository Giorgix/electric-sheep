import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { protocolFixture } from './helpers/protocol.mjs';
import { cli } from './helpers/cli.mjs';
import { findingInput, followUpInput } from './helpers/follow-up.mjs';
import { addFinding } from '../src/report.mjs';
import { loadRun } from '../src/store.mjs';
import { verifyOutputBundle } from '../src/outputs.mjs';

// Catch a priority filter producing dangling dependencies, duplicated prerequisites,
// or skipping validation of malformed but excluded authored actions.
async function fixture(t) {
  const f = await protocolFixture(t);
  await addFinding(f.run, findingInput());
  const action = (id, priority, dependsOn = []) => ({ ...followUpInput().actions[0],
    id, title: `Task ${id}`, priority, dependsOn });
  const input = { schemaVersion: 1, actions: [
    action('main', 'high', ['prep']), action('prep', 'medium', ['base']),
    action('base', 'low'), action('solo', 'high'), action('unrelated', 'low')
  ] };
  const file = join(f.root, 'graph.json');
  await writeFile(file, JSON.stringify(input));
  const invoke = (...args) => cli(['report', '--run', f.run.id, '--runs-root', f.root, ...args]);
  const initial = await invoke('--follow-up', file);
  assert.equal(initial.exitCode, 0, initial.stderr);
  return { ...f, input, file, invoke };
}
async function selected(f) {
  const result = await f.invoke('--priority', 'high');
  assert.equal(result.exitCode, 0, result.stderr);
  const paths = JSON.parse(result.stdout);
  const report = JSON.parse(await readFile(paths.jsonPath, 'utf8'));
  await verifyOutputBundle(await loadRun(f.root, f.run.id));
  return { report, paths };
}
test('high selection includes transitive lower-priority prerequisites once before dependents', async (t) => {
  const f = await fixture(t);
  const before = structuredClone((await loadRun(f.root, f.run.id)).followUp);
  const { report, paths } = await selected(f);
  assert.deepEqual(report.followUp.actions.map(a => a.id), ['base', 'prep', 'main', 'solo']);
  assert.deepEqual(report.followUp.selection.dependencyIds, ['base', 'prep']);
  assert.deepEqual(report.followUp.actions[2].dependsOn, ['prep']);
  assert.deepEqual((await loadRun(f.root, f.run.id)).followUp, before);
  for (const path of [paths.implementationPlanPath, paths.agentPromptPath]) {
    const text = await readFile(path, 'utf8');
    assert.match(text, /prerequisite.*base/i);
    assert.match(text, /prerequisite.*prep/i);
    assert.match(text, /selected priorities:\s*high/i);
  }
  assert.ok(report.followUp.actions.every(a => a.gates.some(g => /validat/i.test(g))));
});
test('shared prerequisite is deduplicated without pulling in unrelated dependents', async (t) => {
  const f = await fixture(t);
  f.input.actions[0].dependsOn = ['base'];
  f.input.actions[3].dependsOn = ['base'];
  await writeFile(f.file, JSON.stringify(f.input));
  const updated = await f.invoke('--follow-up', f.file);
  assert.equal(updated.exitCode, 0, updated.stderr);
  const { report } = await selected(f);
  assert.deepEqual(report.followUp.actions.map(a => a.id), ['base', 'main', 'solo']);
  assert.deepEqual(report.followUp.selection.dependencyIds, ['base']);
});
for (const malformed of ['unknown', 'self', 'cycle'])
 test(`excluded ${malformed} dependency graph is rejected before any mutation`, async (t) => {
  const f = await fixture(t);
  f.input.actions[0].dependsOn = [];
  if (malformed === 'unknown') f.input.actions[4].dependsOn = ['missing'];
  if (malformed === 'self') f.input.actions[4].dependsOn = ['unrelated'];
  if (malformed === 'cycle') {
    f.input.actions[4].dependsOn = ['base'];
    f.input.actions[2].dependsOn = ['unrelated'];
  }
  await writeFile(f.file, JSON.stringify(f.input));
  const manifest = join(f.run.directory, 'manifest.json');
  const before = await readFile(manifest, 'utf8');
  const outputs = await readFile(join(f.run.directory, 'outputs.json'), 'utf8');
  const result = await f.invoke('--follow-up', f.file, '--priority', 'high');
  assert.equal(result.exitCode, 2, result.stderr);
  assert.equal(await readFile(manifest, 'utf8'), before);
  assert.equal(await readFile(join(f.run.directory, 'outputs.json'), 'utf8'), outputs);
 });
