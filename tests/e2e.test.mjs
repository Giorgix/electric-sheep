import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile, access, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRepo } from './helpers/repos.mjs';
import { cli } from './helpers/cli.mjs';
import { loadRun } from '../src/store.mjs';
import { findingInput, followUpInput } from './helpers/follow-up.mjs';
import { protocolFixture } from './helpers/protocol.mjs';
import { verifyOutputBundle } from '../src/outputs.mjs';
const example = join(import.meta.dirname, '../examples/checkout');
const acceptance = [
  `import assert from 'node:assert/strict'; import {totalItems,total} from './checkout.mjs'; assert.equal(total({price:12.5}),12.5); assert.equal(totalItems([{price:2},{price:3}]),5); assert.throws(()=>totalItems([])); for(const price of [-1,NaN,Infinity]) assert.throws(()=>totalItems([{price}]));`,
  `import assert from 'node:assert/strict'; import {totalItems} from './checkout.mjs'; assert.equal(totalItems([{price:1.005}]),1.01); assert.equal(totalItems([{price:0.105},{price:0.105}]),0.21); assert.equal(totalItems([{price:0}]),0); assert.throws(()=>totalItems([{price:-1}]));`,
  `import assert from 'node:assert/strict'; import {createOrderStore} from './checkout.mjs'; const store=createOrderStore(); const items=[{price:1.005}]; const order=store.place('id',items); assert.equal(order.total,1.01); assert.equal(store.place('id',items),order); assert.throws(()=>store.place('id',[{price:2}])); assert.equal(store.place('id',items),order);`,
];
// Simulated host edits, never runner/model-generated implementation.
const legacy = 'export function total(item) {return item.price;}\n';
const validated = `function sum(items) {if(!Array.isArray(items)||!items.length)throw new Error('empty');let result=0;for(const item of items){if(!Number.isFinite(item?.price)||item.price<0)throw new Error('price');result+=item.price;}if(!Number.isFinite(result))throw new Error('overflow');return result;}\n`;
const round1 = legacy + validated + 'export function totalItems(items){return sum(items);}\n';
const round2 =
  legacy +
  validated +
  'export function totalItems(items){const value=sum(items);return Math.round((value+Number.EPSILON)*100)/100;}\n';
const round3 =
  round2 +
  `export function createOrderStore(){const orders=new Map();return {place(id,items){const amount=totalItems(items);const key=JSON.stringify(items);if(orders.has(id)){const saved=orders.get(id);if(saved.key!==key)throw new Error('conflict');return saved.order;}const order=Object.freeze({id,total:amount});orders.set(id,{key,order});return order;}};}\n`;
async function setup(t) {
  const files = {};
  for (const name of await readdir(example))
    files[name] = await readFile(join(example, name), 'utf8');
  const repo = await createRepo({ files });
  const root = await mkdtemp(join(tmpdir(), 'electric-sheep demo '));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await repo.dispose();
  });
  const original = await repo.snapshot();
  const p = JSON.parse(files['exercise.json']);
  p.commands.forEach((c) => (c.executable = process.execPath));
  const file = join(root, 'approved.json');
  await writeFile(file, JSON.stringify(p));
  const started = await cli([
    'start',
    '--repo',
    repo.root,
    '--plan',
    file,
    '--approval-note',
    'Approved local sample',
    '--runs-root',
    root,
  ]);
  assert.equal(started.exitCode, 0, started.stderr);
  const { id } = JSON.parse(started.stdout);
  const invoke = (verb, ...rest) => cli([verb, '--run', id, '--runs-root', root, ...rest]);
  assert.equal((await invoke('baseline')).exitCode, 0);
  return { repo, root, id, original, invoke };
}
test('known empty-cart omission is demonstrated without altering source', async (t) => {
  const { repo, root, id, original, invoke } = await setup(t);
  const run = await loadRun(root, id);
  await writeFile(join(run.workspace, 'round1.test.mjs'), acceptance[0]);
  assert.equal((await invoke('freeze')).exitCode, 0);
  await writeFile(
    join(run.workspace, 'checkout.mjs'),
    legacy + 'export function totalItems(items){return items.reduce((n,item)=>n+item.price,0);}\n',
  );
  assert.equal((await invoke('evaluate')).exitCode, 1);
  assert.equal((await invoke('evaluate')).exitCode, 1);
  const { jsonPath } = JSON.parse((await invoke('report')).stdout);
  const report = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert.equal(report.challenges[0].outcome, 'failed');
  assert.equal(report.challenges[1].outcome, 'not-run');
  const receipt = JSON.parse((await invoke('cleanup', '--confirm', id)).stdout);
  assert.equal(receipt.verified, true);
  assert.equal(receipt.outcome, 'failed');
  await verifyOutputBundle(await loadRun(root, id));
  await assert.rejects(access(run.workspace));
  await access(jsonPath);
  assert.deepEqual(await repo.snapshot(), original);
});
test('three realistic cumulative requirements complete and preserve source', async (t) => {
  const { repo, root, id, original, invoke } = await setup(t);
  const run = await loadRun(root, id);
  for (let i = 0; i < 3; i++) {
    await writeFile(join(run.workspace, `round${i + 1}.test.mjs`), acceptance[i]);
    assert.equal((await invoke('freeze')).exitCode, 0);
    await writeFile(join(run.workspace, 'checkout.mjs'), [round1, round2, round3][i]);
    const result = await invoke('evaluate');
    assert.equal(result.exitCode, 0, result.stderr);
  }
  const completed = await loadRun(root, id);
  const structural = {
    ...findingInput('structure'),
    category: 'evolution-friction',
    origin: 'experimental',
    evidenceRefs: [completed.events.find((e) => e.type === 'checkpoint').diffPath],
  };
  const findingFile = join(root, 'finding.json');
  for (const finding of [findingInput(), structural]) {
    await writeFile(findingFile, JSON.stringify(finding));
    assert.equal((await invoke('finding', '--file', findingFile)).exitCode, 0);
  }
  const followUp = followUpInput();
  followUp.actions.push({
    ...structuredClone(followUp.actions[0]),
    id: 'structure',
    findingIds: ['structure'],
    dependsOn: ['boundary'],
  });
  const followUpFile = join(root, 'follow-up.json');
  await writeFile(followUpFile, JSON.stringify(followUp));
  const generated = await invoke('report', '--follow-up', followUpFile);
  assert.equal(generated.exitCode, 0, generated.stderr);
  const paths = JSON.parse(generated.stdout);
  await access(run.workspace); // Report/keep choice has no deletion side effect.
  assert.deepEqual(paths.closing.choices, ['remove-worktree', 'keep-worktree']);
  const report = JSON.parse(await readFile(paths.jsonPath, 'utf8'));
  assert.equal(report.schemaVersion, 1);
  assert.deepEqual(
    report.followUp.actions.map((a) => a.id),
    ['boundary', 'structure'],
  );
  assert.equal(report.status, 'completed');
  assert.equal(report.challenges.filter((c) => c.outcome === 'passed').length, 3);
  const cleaned = await invoke('cleanup', '--confirm', id);
  assert.equal(cleaned.exitCode, 0, cleaned.stderr);
  assert.equal(JSON.parse(cleaned.stdout).verified, true);
  const later = await invoke('report');
  assert.equal(later.exitCode, 0, later.stderr);
  const after = JSON.parse(await readFile(paths.jsonPath, 'utf8'));
  assert.deepEqual(after.followUp.actions, report.followUp.actions);
  await verifyOutputBundle(await loadRun(root, id));
  assert.deepEqual(await repo.snapshot(), original);
  await access(paths.markdownPath);
  await access(paths.agentPromptPath);
});
test('blocked baseline still publishes honest follow-up and confirmed closing', async (t) => {
  const { run, root, repo } = await protocolFixture(t, {
    files: { 'value.mjs': 'export const value=-1;' },
  });
  const before = await repo.snapshot();
  const invoke = (verb, ...args) => cli([verb, '--run', run.id, '--runs-root', root, ...args]);
  assert.equal((await invoke('baseline')).exitCode, 1);
  const generated = await invoke('report');
  assert.equal(generated.exitCode, 0, generated.stderr);
  const paths = JSON.parse(generated.stdout);
  await access(run.workspace);
  const report = JSON.parse(await readFile(paths.jsonPath, 'utf8'));
  assert.equal(report.status, 'blocked');
  assert.deepEqual(report.followUp.actions, []);
  assert.match(await readFile(paths.implementationPlanPath, 'utf8'), /blocked baseline/i);
  assert.equal(paths.closing.requiresConfirmation, true);
  const removed = await invoke('cleanup', '--confirm', run.id);
  assert.equal(removed.exitCode, 0, removed.stderr);
  assert.equal(JSON.parse(removed.stdout).outcome, 'blocked');
  await verifyOutputBundle(await loadRun(root, run.id));
  assert.deepEqual(await repo.snapshot(), before);
});
