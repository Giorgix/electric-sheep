import { readFile, writeFile, rename, realpath, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { nonempty, relativePath } from './contracts.mjs';
import { contained } from './repository.mjs';
import { runGit } from './git.mjs';
import { saveRun } from './store.mjs';

export async function addFinding(run, input) {
  const finding = structuredClone(input);
  for (const key of ['id', 'impact', 'summary', 'recommendation']) nonempty(finding[key], key);
  if (
    !['defect', 'evolution-friction', 'maintainability-concern', 'hypothesis'].includes(
      finding.category,
    )
  )
    throw new Error('Invalid finding category');
  if (!['baseline', 'experimental', 'uncertain'].includes(finding.origin))
    throw new Error('Invalid finding origin');
  if (
    !Array.isArray(finding.evidenceRefs) ||
    (finding.category !== 'hypothesis' && !finding.evidenceRefs.length)
  )
    throw new Error('Finding requires evidence');
  if (run.findings.some((f) => f.id === finding.id)) throw new Error('Duplicate finding id');
  for (const ref of finding.evidenceRefs) {
    relativePath(ref, 'evidence reference');
    const path = resolve(run.directory, ref);
    const info = await lstat(path);
    if (
      info.isSymbolicLink() ||
      !info.isFile() ||
      !contained(await realpath(join(run.directory, 'evidence')), await realpath(path))
    )
      throw new Error('Invalid evidence reference');
  }
  if (
    finding.category === 'defect' &&
    !run.commandResults.some(
      (r) =>
        r.status === 'failed' &&
        r.stage !== 'baseline' &&
        finding.evidenceRefs.some((ref) => ref === r.stdoutPath || ref === r.stderrPath),
    )
  )
    throw new Error('Defect requires a referenced failing check, not a blocked baseline');
  if (
    ['evolution-friction', 'maintainability-concern'].includes(finding.category) &&
    !finding.evidenceRefs.some((ref) => /\.(diff|artifact)$/.test(ref))
  )
    throw new Error('Structural concerns require diff or code artifact evidence');
  run.findings.push(finding);
  await saveRun(run);
  return run;
}
function parseNumstat(text, exclusions) {
  return text
    .split('\0')
    .filter(Boolean)
    .map((row) => {
      const [added, removed, ...pathParts] = row.split('\t');
      return { path: pathParts.join('\t'), added: Number(added), removed: Number(removed) };
    })
    .filter(
      (f) =>
        Number.isFinite(f.added) &&
        Number.isFinite(f.removed) &&
        !exclusions.some((p) => f.path === p || f.path.startsWith(p.replace(/\/$/, '') + '/')),
    )
    .map((f) => ({ ...f, lineGrowth: f.added - f.removed }));
}
export async function collectDeltas(run) {
  if (run.phase === 'cleaned') return run.deltas;
  try {
    const deltas = [];
    for (const event of run.events.filter((e) => e.type === 'checkpoint')) {
      const text = await runGit(run.workspace, [
        'diff',
        '--numstat',
        '-z',
        '--no-renames',
        '--no-ext-diff',
        '--no-textconv',
        event.before,
        event.commit,
        '--',
      ]);
      deltas.push({
        label: event.label,
        before: event.before,
        after: event.commit,
        files: parseNumstat(text, run.plan.exclusions),
        evidenceRef: event.diffPath,
      });
    }
    const lastDiff = run.events.filter((e) => ['diff', 'checkpoint'].includes(e.type)).at(-1);
    if (lastDiff?.type === 'diff') {
      const text = await runGit(run.workspace, [
        'diff',
        '--numstat',
        '-z',
        '--no-renames',
        '--no-ext-diff',
        '--no-textconv',
        run.checkpoint,
        '--',
      ]);
      deltas.push({
        label: lastDiff.label,
        before: run.checkpoint,
        after: null,
        files: parseNumstat(text, run.plan.exclusions),
        evidenceRef: lastDiff.diffPath,
      });
    }
    run.deltas = deltas;
  } catch (error) {
    run.events.push({ type: 'metrics-unavailable', message: error.message });
  }
  await saveRun(run);
  return run.deltas;
}
export async function buildReport(run) {
  return {
    schemaVersion: 1,
    id: run.id,
    status: run.outcome ?? run.phase,
    repository: run.repository,
    scope: run.plan.scope,
    host: run.plan.host,
    roleSeparation: run.plan.roleSeparation,
    approvals: run.approvals,
    baseline: {
      coverage: run.plan.coverage,
      coverageNote: run.plan.coverageNote,
      results: run.commandResults.filter((r) =>
        ['setup', 'baseline', 'amended-baseline'].includes(r.stage),
      ),
    },
    challenges: run.plan.challenges.map((c, i) => ({
      id: c.id,
      requirement: c.requirement,
      outcome: run.rounds[i].status === 'frozen' ? 'in-progress' : run.rounds[i].status,
      attempts: run.rounds[i].attempts,
      evidenceRefs: run.rounds[i].resultIds.flatMap((id) => {
        const r = run.commandResults.find((value) => value.id === id);
        return r ? [r.stdoutPath, r.stderrPath] : [];
      }),
    })),
    commandResults: run.commandResults,
    deltas: run.deltas,
    findings: run.findings,
    events: run.events,
    limitations: [
      'A Git worktree is not a security sandbox. Host permissions and inherited credentials/network access still apply.',
      'Three challenges do not prove production readiness. Structural metrics are signals, not verdicts.',
      'Findings are agent interpretations, separate from runner-recorded command outcomes.',
      'Logs remain local but can contain secrets. The host model uses its existing provider privacy settings.',
      'Runner timeouts do not limit model tokens or all host actions.',
    ],
    nextActions: run.findings.map((f) => f.recommendation),
    recovery: {
      runId: run.id,
      worktree: run.workspace,
      phase: run.phase,
      instructions:
        'Inspect status; resume only after prior processes have stopped. Cleanup requires explicit run-id confirmation. No fixes are merged automatically.',
    },
  };
}
const escape = (value) => String(value).replace(/[&<>\[\]`*_\\]/g, (c) => `&#${c.charCodeAt(0)};`);
function markdown(report) {
  const lines = [
    '# Electronic Sheeps evolution report',
    '',
    `Run: ${report.id}`,
    `Status: **${report.status}**`,
    '',
    '## 1. Scope, baseline, and limitations',
    `Scope: ${report.scope.map(escape).join(', ')}`,
    `Baseline commit: ${report.repository.commit}`,
    `Coverage: ${escape(report.baseline.coverage)} ${escape(report.baseline.coverageNote || '')}`,
    `Host: ${escape(report.host)}; evaluation: ${report.roleSeparation}`,
    ...report.limitations.map((v) => `- ${escape(v)}`),
    '',
    '## 2. Challenges and evidence',
  ];
  for (const c of report.challenges)
    lines.push(
      `### ${escape(c.id)} — ${c.outcome}`,
      escape(c.requirement),
      ...c.evidenceRefs.map((ref) => `- [${escape(ref)}](${ref})`),
    );
  lines.push('', '## 3. Regression outcomes and structural deltas');
  for (const r of report.commandResults)
    lines.push(
      `- ${escape(r.stage)} / ${escape(r.commandId)}: ${r.status} (exit ${r.exitCode ?? 'unknown'})`,
    );
  for (const d of report.deltas)
    lines.push(
      `- ${escape(d.label)}: ${d.files.length} text files; +${d.files.reduce((n, f) => n + f.added, 0)} / -${d.files.reduce((n, f) => n + f.removed, 0)} lines`,
    );
  lines.push('', '## 4. Findings (agent interpretations)');
  if (!report.findings.length)
    lines.push('No agent findings recorded; this is not a claim of no defects.');
  for (const f of report.findings)
    lines.push(
      `### ${escape(f.summary)}`,
      `Category: ${f.category}; origin: ${f.origin}`,
      escape(f.impact),
      ...f.evidenceRefs.map((ref) => `- [Evidence](${ref})`),
      `Recommendation: ${escape(f.recommendation)}`,
    );
  lines.push(
    '',
    '## 5. Recommended next actions',
    ...report.nextActions.map((v) => `- ${escape(v)}`),
    'Review untested requirements and permission/coverage limits before bringing back any fix.',
    '',
    '## 6. Resume and cleanup',
    escape(report.recovery.instructions),
    `Run ID: ${report.id}`,
    `Workspace: ${escape(report.recovery.worktree)}`,
    '',
  );
  return lines.join('\n');
}
async function atomicReport(path, content) {
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, content, { flag: 'wx', mode: 0o600 });
  await rename(temp, path);
}
export async function writeReports(run) {
  const report = await buildReport(run);
  const jsonPath = join(run.directory, 'report.json'),
    markdownPath = join(run.directory, 'report.md');
  await atomicReport(jsonPath, JSON.stringify(report, null, 2) + '\n');
  await atomicReport(markdownPath, markdown(report));
  return { jsonPath, markdownPath };
}
