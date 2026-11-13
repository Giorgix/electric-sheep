import { lstat, realpath, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ownedDirectory, hash } from './store.mjs';
import { relativePath } from './contracts.mjs';
import { contained } from './repository.mjs';

const names = {
  jsonPath: 'report.json',
  markdownPath: 'report.md',
  nextActionsPath: 'next-actions.md',
  implementationPlanPath: 'implementation-plan.md',
  agentPromptPath: 'agent-prompt.md',
  outputManifestPath: 'outputs.json',
};
export function outputPaths(run) {
  return Object.fromEntries(
    Object.entries(names).map(([key, name]) => [key, join(run.directory, name)]),
  );
}
async function own(run) {
  const owner = await ownedDirectory(run.directory, run.id);
  if (owner.repository !== run.repository.root) throw new Error('Invalid output ownership');
  const evidence = join(run.directory, 'evidence');
  const info = await lstat(evidence);
  if (
    info.isSymbolicLink() ||
    !info.isDirectory() ||
    !contained(run.directory, await realpath(evidence))
  )
    throw new Error('Invalid evidence directory or symlink');
}
async function regular(path, optional = false) {
  const info = await lstat(path).catch((e) => {
    if (optional && e.code === 'ENOENT') return null;
    throw e;
  });
  if (info && (info.isSymbolicLink() || !info.isFile()))
    throw new Error('Output/evidence destination must be a regular file, not a symlink');
}
async function evidenceFile(run, ref) {
  relativePath(ref, 'evidence reference');
  if (!ref.startsWith('evidence/')) throw new Error('Invalid evidence reference');
  const path = resolve(run.directory, ref);
  await regular(path);
  if (!contained(await realpath(join(run.directory, 'evidence')), await realpath(path)))
    throw new Error('Escaping evidence reference');
  return path;
}
async function atomic(path, content) {
  await regular(path, true);
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, content, { flag: 'wx', mode: 0o600 });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
export async function writeOutputBundle(run, contents, evidenceRefs) {
  await own(run);
  const expected = Object.values(names)
    .filter((n) => n !== 'outputs.json')
    .sort();
  if (
    JSON.stringify(Object.keys(contents).sort()) !== JSON.stringify(expected) ||
    Object.values(contents).some((v) => typeof v !== 'string' || !v.trim())
  )
    throw new Error('Invalid fixed output filenames or empty content');
  const paths = outputPaths(run);
  for (const path of Object.values(paths)) await regular(path, true);
  const evidence = [];
  for (const ref of [...new Set(evidenceRefs)].sort())
    evidence.push({ path: ref, sha256: hash(await readFile(await evidenceFile(run, ref))) });
  const files = [];
  for (const name of expected) {
    await atomic(join(run.directory, name), contents[name]);
    files.push({ path: name, sha256: hash(await readFile(join(run.directory, name))) });
  }
  await atomic(
    paths.outputManifestPath,
    JSON.stringify(
      { schemaVersion: 1, runId: run.id, generationId: randomUUID(), files, evidence },
      null,
      2,
    ) + '\n',
  );
  await verifyOutputBundle(run);
  return paths;
}
export async function verifyOutputBundle(run) {
  await own(run);
  const paths = outputPaths(run);
  await regular(paths.outputManifestPath);
  const manifest = JSON.parse(await readFile(paths.outputManifestPath, 'utf8'));
  const expected = Object.values(names)
    .filter((n) => n !== 'outputs.json')
    .sort();
  if (
    manifest.schemaVersion !== 1 ||
    manifest.runId !== run.id ||
    !/^[0-9a-f-]{36}$/i.test(manifest.generationId) ||
    !Array.isArray(manifest.files) ||
    !Array.isArray(manifest.evidence) ||
    JSON.stringify(manifest.files.map((f) => f.path).sort()) !== JSON.stringify(expected)
  )
    throw new Error('Invalid output publication manifest');
  const refs = new Set();
  for (const [entries, isEvidence] of [
    [manifest.files, false],
    [manifest.evidence, true],
  ])
    for (const entry of entries) {
      if (!entry || typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256))
        throw new Error('Invalid output hash');
      const path = isEvidence
        ? await evidenceFile(run, entry.path)
        : join(run.directory, entry.path);
      if (isEvidence && refs.has(entry.path)) throw new Error('Duplicate evidence reference');
      if (isEvidence) refs.add(entry.path);
      await regular(path);
      if (hash(await readFile(path)) !== entry.sha256)
        throw new Error(`Output/evidence integrity mismatch: ${entry.path}`);
    }
  return { generationId: manifest.generationId, paths, evidenceRefs: [...refs] };
}
export function describeClosing(run, paths) {
  const cleaned = run.phase === 'cleaned';
  return {
    requiresConfirmation: !cleaned,
    choices: cleaned ? [] : ['remove-worktree', 'keep-worktree'],
    cleanup: cleaned
      ? null
      : {
          executable: process.execPath,
          args: [
            fileURLToPath(new URL('../bin/electric-sheep.mjs', import.meta.url)),
            'cleanup',
            '--run',
            run.id,
            '--confirm',
            run.id,
            '--runs-root',
            dirname(run.directory),
          ],
          cwd: dirname(run.directory),
        },
    retainedPaths: Object.values(paths),
  };
}
