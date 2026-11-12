import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createExercise} from './runs.mjs';
import {plan} from './plans.mjs';
import {createWorkspace} from '../../src/workspace.mjs';
export const baselineTest = "import assert from 'node:assert/strict';import {value} from './value.mjs';assert.ok(value>=0);\n";
export async function protocolFixture(t, options = {}) {
  const p = plan();
  for (let n=1;n<=3;n++) {p.commands.push({id:`check${n}`,executable:process.execPath,args:['--test',`round${n}.test.mjs`],purpose:'check'});p.challenges[n-1].commandIds=[`check${n}`];}
  const fixture = await createExercise(t,{files:{'value.mjs':'export const value=0; export const legacy=true;\n','base.test.mjs':baselineTest,...options.files},plan:options.plan??p});
  await createWorkspace(fixture.run);
  return fixture;
}
export async function addAcceptance(run, n) {
  await writeFile(join(run.workspace,`round${n}.test.mjs`),`import assert from 'node:assert/strict';import {value,legacy} from './value.mjs';assert.ok(value>=${n});${n===1?'assert.equal(legacy,true);':''}\n`);
}
export async function implement(run, n, legacy = true) {await writeFile(join(run.workspace,'value.mjs'),`export const value=${n}; export const legacy=${legacy};\n`);}
