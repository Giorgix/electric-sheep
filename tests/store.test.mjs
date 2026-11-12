import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile, readFile, symlink, rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRun, loadRun, saveRun, withRunLock, recoverLock} from '../src/store.mjs';
import {inspectRepository} from '../src/repository.mjs';
import {createRepo} from './helpers/repos.mjs';
import {plan} from './helpers/plans.mjs';
export async function storedRun(t) { const repo = await createRepo(); const root = await mkdtemp(join(tmpdir(), 'sheeps runs ü ')); t.after(async () => {await rm(root, {recursive:true, force:true}); await repo.dispose();}); const repository = await inspectRepository({repo: repo.root, scope:['.']}); const run = await createRun({runsRoot: root, repository, plan: plan(), approvalNote:'User approved the exercise'}); return {repo, root, run}; }
test('round-trip approved run', async t => {const {root,run}=await storedRun(t); const value=await loadRun(root,run.id); assert.equal(value.phase,'prepared'); assert.equal(value.approvals[0].planHash,createHash('sha256').update(JSON.stringify(value.plan)).digest('hex')); assert.equal(value.rounds.length,3);});
test('exclusive mutation holds across async work', async t => {const {root,run}=await storedRun(t); let release, entered; const ready=new Promise(r=>entered=r); const held=withRunLock(root,run.id,async()=>{entered(); await new Promise(r=>release=r);}); await ready; await assert.rejects(withRunLock(root,run.id,async()=>{}),/locked/i); release(); await held; await withRunLock(root,run.id,async()=>{});});
test('atomic save preserves old state on serialization error', async t => {const {root,run}=await storedRun(t); const before=await loadRun(root,run.id); run.events.push({bad:1n}); await assert.rejects(saveRun(run)); assert.deepEqual(await loadRun(root,run.id),before);});
test('rejects traversal, forged marker, and malformed version', async t => {const {root,run}=await storedRun(t); await assert.rejects(loadRun(root,'../source'),/invalid.*id/i); const manifest=join(run.directory,'manifest.json'); await writeFile(manifest,JSON.stringify({...run,schemaVersion:99})); await assert.rejects(loadRun(root,run.id),/schema/i); await writeFile(manifest,JSON.stringify(run)); await writeFile(join(run.directory,'owner.json'),'{}'); await assert.rejects(loadRun(root,run.id),/ownership/i);});
test('rejects run root inside source', async t => {const {repo,run}=await storedRun(t); await assert.rejects(createRun({runsRoot:join(repo.root,'runs'),repository:run.repository,plan:plan(),approvalNote:'approved'}),/source|outside/i);});
test('symlinked run cannot be loaded', async t => {const {root,run}=await storedRun(t); const moved=run.directory+'-moved'; await rename(run.directory,moved); await symlink(moved,run.directory,process.platform==='win32'?'junction':'dir'); await assert.rejects(loadRun(root,run.id),/ownership|symlink/i);});
test('stale lock requires recorded explicit recovery', async t => {const {root,run}=await storedRun(t); await writeFile(join(run.directory,'mutation.lock'),'stale'); await assert.rejects(recoverLock(root,run.id,'')); await recoverLock(root,run.id,'Confirmed previous process stopped'); const value=await loadRun(root,run.id); assert.equal(value.events.at(-1).type,'lock-recovered'); await assert.rejects(readFile(join(run.directory,'mutation.lock')));});
