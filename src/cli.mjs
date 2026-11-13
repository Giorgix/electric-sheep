import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { validatePlan } from './contracts.mjs';
import { inspectRepository } from './repository.mjs';
import { createRun, loadRun, withRunLock, recoverLock } from './store.mjs';
import { createWorkspace, cleanupWorkspace } from './workspace.mjs';
import {
  runBaseline,
  freezeChallenge,
  evaluateChallenge,
  amendPlan,
  cancelRun,
  validateResume,
} from './protocol.mjs';
import { addFinding, collectDeltas, writeReports } from './report.mjs';

const help = `Electronic Sheeps — isolated evolution stress tests
Usage: electronic-sheeps <verb> [options]
  inspect --repo PATH --scope PATH
  start --repo PATH --plan FILE --approval-note TEXT
  baseline|freeze|evaluate|status|report|resume --run ID
  amend --run ID --plan FILE --approval-note TEXT
  finding --run ID --file FILE
  recover-lock --run ID --approval-note TEXT
  cancel --run ID --note TEXT
  cleanup --run ID --confirm ID [--delete-evidence]
All verbs accept --runs-root PATH (default ~/.electronic-sheeps/runs).
A worktree is not a security sandbox. No project commands run until baseline.
`;
class UsageError extends Error {}
const flags = {
  inspect: ['repo', 'scope'],
  start: ['repo', 'plan', 'approval-note'],
  baseline: ['run'],
  freeze: ['run'],
  evaluate: ['run'],
  status: ['run'],
  report: ['run'],
  resume: ['run'],
  amend: ['run', 'plan', 'approval-note'],
  finding: ['run', 'file'],
  'recover-lock': ['run', 'approval-note'],
  cancel: ['run', 'note'],
  cleanup: ['run', 'confirm', 'delete-evidence'],
};
async function jsonFile(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new UsageError(`Cannot read valid JSON from ${path}: ${error.message}`);
  }
}
export async function main(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    if (!argv.length || argv[0] === '--help' || argv[0] === '-h') {
      stdout.write(help);
      return 0;
    }
    const [verb, ...rest] = argv;
    if (!Object.hasOwn(flags, verb)) throw new UsageError(`Unknown verb: ${verb}`);
    const options = { 'runs-root': { type: 'string' } };
    for (const name of flags[verb])
      options[name] =
        name === 'delete-evidence'
          ? { type: 'boolean' }
          : name === 'scope'
            ? { type: 'string', multiple: true }
            : { type: 'string' };
    let values;
    try {
      ({ values } = parseArgs({ args: rest, options, allowPositionals: false, strict: true }));
    } catch (error) {
      throw new UsageError(error.message);
    }
    for (const name of flags[verb])
      if (
        !['delete-evidence', 'scope'].includes(name) &&
        (typeof values[name] !== 'string' || !values[name].trim())
      )
        throw new UsageError(`Missing --${name}`);
    const root = resolve(values['runs-root'] ?? join(homedir(), '.electronic-sheeps/runs'));
    let output;
    if (verb === 'inspect') {
      output = await inspectRepository({ repo: values.repo, scope: values.scope ?? ['.'] });
    } else if (verb === 'start') {
      let plan;
      try {
        plan = validatePlan(await jsonFile(values.plan));
      } catch (error) {
        throw new UsageError(error.message);
      }
      const repository = await inspectRepository({ repo: values.repo, scope: plan.scope });
      const run = await createRun({
        runsRoot: root,
        repository,
        plan,
        approvalNote: values['approval-note'],
      });
      try {
        output = await withRunLock(root, run.id, createWorkspace);
      } catch (error) {
        throw new Error(`${error.message}; run ${run.id} was retained for inspection and cleanup`);
      }
    } else if (verb === 'status') {
      output = await loadRun(root, values.run);
    } else if (verb === 'recover-lock') {
      await recoverLock(root, values.run, values['approval-note']);
      output = await loadRun(root, values.run);
    } else {
      if (verb === 'cleanup' && values.confirm !== values.run)
        throw new UsageError('--confirm must exactly match --run');
      output = await withRunLock(root, values.run, async (run) => {
        switch (verb) {
          case 'baseline':
            return runBaseline(run);
          case 'freeze':
            return freezeChallenge(run);
          case 'evaluate':
            return evaluateChallenge(run);
          case 'resume':
            return validateResume(run);
          case 'amend':
            return amendPlan(run, await jsonFile(values.plan), values['approval-note']);
          case 'finding':
            return addFinding(run, await jsonFile(values.file));
          case 'cancel':
            return cancelRun(run, values.note);
          case 'report':
            await collectDeltas(run);
            return writeReports(run);
          case 'cleanup': {
            if (!run.outcome && run.phase !== 'cleaned')
              await cancelRun(run, 'Explicit cleanup of unfinished exercise');
            if (run.phase !== 'cleaned') {
              await collectDeltas(run);
              await writeReports(run);
            }
            await cleanupWorkspace(run, { deleteEvidence: values['delete-evidence'] ?? false });
            return {
              id: run.id,
              phase: 'cleaned',
              outcome: run.outcome,
              evidenceDeleted: Boolean(values['delete-evidence']),
            };
          }
        }
      });
    }
    stdout.write(JSON.stringify(output, null, 2) + '\n');
    const exerciseVerb = ['baseline', 'freeze', 'evaluate', 'resume', 'amend'].includes(verb);
    if (
      exerciseVerb &&
      (['blocked', 'failed', 'invalid', 'cancelled'].includes(output.phase) ||
        (verb === 'evaluate' && output.phase === 'challenge'))
    )
      return 1;
    return 0;
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return error instanceof UsageError ? 2 : 1;
  }
}
