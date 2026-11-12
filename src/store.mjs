import {mkdir, lstat, realpath, readFile, writeFile, rename, rm, open} from 'node:fs/promises';
import {join, resolve, dirname} from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {validatePlan, nonempty} from './contracts.mjs';
import {contained} from './repository.mjs';
export const hash = value => createHash('sha256').update(value).digest('hex');
const validId = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export async function ownedDirectory(directory, id) {
  if (!validId(id)) throw new Error('Invalid run id');
  if ((await lstat(directory)).isSymbolicLink()) throw new Error('Symlink violates ownership');
  const owner = JSON.parse(await readFile(join(directory, 'owner.json'), 'utf8'));
  if (owner.id !== id || owner.directory !== await realpath(directory)) throw new Error('Invalid run ownership');
  return owner;
}
export async function createRun({runsRoot, repository, plan, approvalNote}) {
  nonempty(approvalNote, 'approval note'); const approved = validatePlan(plan);
  const root = resolve(runsRoot);
  // Check before creating directories, then again after resolving existing parents.
  let ancestor = root;
  while (true) { try { ancestor = await realpath(ancestor); break; } catch (e) { if (e.code !== 'ENOENT') throw e; const parent=dirname(ancestor); if(parent===ancestor) throw e; ancestor=parent; } }
  if (contained(repository.root, root) || contained(repository.root, ancestor)) throw new Error('Runs root must be outside source repository');
  await mkdir(root, {recursive:true,mode:0o700}); const canonical = await realpath(root);
  if (contained(repository.root, canonical)) throw new Error('Runs root must be outside source repository');
  const id=randomUUID(); const directory=join(canonical,id); await mkdir(directory,{mode:0o700});
  const physical=await realpath(directory);
  await writeFile(join(directory,'owner.json'),JSON.stringify({id,directory:physical,repository:repository.root}),{flag:'wx',mode:0o600});
  await mkdir(join(directory,'evidence'),{mode:0o700});
  const run={schemaVersion:1,id,directory:physical,repository,workspace:join(physical,'worktree'),plan:approved,approvals:[{at:new Date().toISOString(),note:approvalNote,planHash:hash(JSON.stringify(approved))}],phase:'prepared',outcome:null,currentIndex:0,attempts:0,checkpoint:repository.commit,rounds:approved.challenges.map((c,index)=>({challengeId:c.id,index,status:'not-run',attempts:0,beforeCheckpoint:null,afterCheckpoint:null,protectedArtifacts:[],resultIds:[]})),protectedArtifacts:[],commandResults:[],deltas:[],events:[],findings:[]};
  await saveRun(run); return run;
}
export async function loadRun(runsRoot,id) {
  if(!validId(id)) throw new Error('Invalid run id');
  const directory=join(await realpath(runsRoot),id); const owner=await ownedDirectory(directory,id);
  const run=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));
  if(run.schemaVersion!==1) throw new Error('Unsupported run schema');
  if(run.id!==id || run.directory!==await realpath(directory) || run.repository?.root!==owner.repository || run.workspace!==join(run.directory,'worktree')) throw new Error('Invalid run ownership');
  validatePlan(run.plan); return run;
}
export async function saveRun(run) {
  await ownedDirectory(run.directory,run.id);
  const text=JSON.stringify(run,null,2)+'\n'; const temp=join(run.directory,`.manifest-${randomUUID()}.tmp`);
  try {await writeFile(temp,text,{flag:'wx',mode:0o600}); await rename(temp,join(run.directory,'manifest.json'));} finally {await rm(temp,{force:true});}
}
export async function withRunLock(runsRoot,id,action) {
  const run=await loadRun(runsRoot,id); const path=join(run.directory,'mutation.lock'); const token=randomUUID(); let handle;
  try {handle=await open(path,'wx',0o600);} catch(e) {if(e.code==='EEXIST') throw new Error('Run is locked; explicitly recover only after the prior process stops'); throw e;}
  try {await handle.writeFile(token); await handle.close(); return await action(await loadRun(runsRoot,id));}
  finally {await handle.close().catch(()=>{}); if(await readFile(path,'utf8').catch(()=>null)===token) await rm(path,{force:true});}
}
export async function recoverLock(runsRoot,id,approvalNote) {
  nonempty(approvalNote,'lock recovery approval note'); const run=await loadRun(runsRoot,id);
  await rm(join(run.directory,'mutation.lock'),{force:true});
  await withRunLock(runsRoot,id,async value=>{value.events.push({type:'lock-recovered',at:new Date().toISOString(),note:approvalNote}); await saveRun(value);});
}
