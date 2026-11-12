import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRepo} from './repos.mjs';
import {plan as examplePlan} from './plans.mjs';
import {inspectRepository} from '../../src/repository.mjs';
import {createRun} from '../../src/store.mjs';
export async function createExercise(t, {files, plan = examplePlan()} = {}) {
  const repo = await createRepo(files ? {files} : {});
  const root = await mkdtemp(join(tmpdir(), 'sheeps exercise '));
  t.after(async () => {
    await rm(root, {recursive: true, force: true, maxRetries: 3});
    await repo.dispose();
  });
  const repository = await inspectRepository({repo: repo.root, scope: ['.']});
  const run = await createRun({runsRoot: root, repository, plan, approvalNote: 'Approved test exercise'});
  return {repo, root, run};
}
