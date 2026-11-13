import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile, access, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRepo } from './helpers/repos.mjs';
import { cli } from './helpers/cli.mjs';
import { loadRun } from '../src/store.mjs';
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
  assert.equal((await invoke('cleanup', '--confirm', id)).exitCode, 0);
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
  const paths = JSON.parse((await invoke('report')).stdout);
  const report = JSON.parse(await readFile(paths.jsonPath, 'utf8'));
  assert.equal(report.status, 'completed');
  assert.equal(report.challenges.filter((c) => c.outcome === 'passed').length, 3);
  assert.equal((await invoke('cleanup', '--confirm', id)).exitCode, 0);
  assert.deepEqual(await repo.snapshot(), original);
  await access(paths.markdownPath);
});
