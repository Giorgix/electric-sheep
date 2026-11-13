import { lstat, realpath, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { contained } from './repository.mjs';
import { hash } from './store.mjs';
import { buildReport, reportContents, evidenceReferences } from './report.mjs';
import { outputPaths, verifyOutputBundle, verifyPortableBundle, readEvidence } from './outputs.mjs';

async function destination(run, value) {
  const path = resolve(value);
  const existing = await lstat(path).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (existing) throw new Error('Refusing existing export destination');
  const parent = dirname(path);
  const physical = await realpath(parent);
  const comparable = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
  if (comparable(parent) !== comparable(physical))
    throw new Error('Refusing symlinked export parent; use its canonical physical path');
  const out = join(physical, basename(path));
  if (contained(run.repository.root, out) || contained(dirname(run.directory), out))
    throw new Error('Export must be outside the source repository and runs root');
  return out;
}
export async function exportReport(run, { out, priorities } = {}) {
  const directory = await destination(run, out);
  // Validate the old publication before reading source bytes: never bless corruption.
  const source = await verifyOutputBundle(run);
  const published = JSON.parse(await readFile(source.paths.outputManifestPath, 'utf8'));
  if (published.generationId !== source.generationId) throw new Error('Source publication changed');
  const knownHashes = new Map(published.evidence.map((e) => [e.path, e.sha256]));
  const report = await buildReport(run, { priorities });
  const contents = reportContents(report, { directory: '.', ...outputPaths({ directory: '.' }) });
  contents['agent-prompt.md'] =
    'This is a portable data archive, not an owned executable run. Resolve package links relative to this file. Original repository/worktree metadata is historical context.\n\n' +
    contents['agent-prompt.md'];
  const evidence = [];
  for (const ref of [...new Set(evidenceReferences(run))].sort()) {
    const bytes = await readEvidence(run, ref);
    const sha256 = hash(bytes);
    if (knownHashes.has(ref) && knownHashes.get(ref) !== sha256)
      throw new Error(`Source evidence changed: ${ref}`);
    evidence.push({ path: ref, sha256, bytes });
  }
  // Exclusive directory creation cannot replace even an empty existing directory.
  // On subsequent I/O failure retain the incomplete directory for inspection.
  await mkdir(directory, { mode: 0o700 });
  try {
    await mkdir(join(directory, 'evidence'), { mode: 0o700 });
    for (const entry of evidence) {
      await mkdir(dirname(join(directory, entry.path)), { recursive: true, mode: 0o700 });
      await writeFile(join(directory, entry.path), entry.bytes, { flag: 'wx', mode: 0o600 });
    }
    const files = [];
    for (const name of Object.keys(contents).sort()) {
      await writeFile(join(directory, name), contents[name], { flag: 'wx', mode: 0o600 });
      files.push({ path: name, sha256: hash(contents[name]) });
    }
    await writeFile(
      join(directory, 'outputs.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          runId: run.id,
          generationId: randomUUID(),
          files,
          evidence: evidence.map(({ path, sha256 }) => ({ path, sha256 })),
        },
        null,
        2,
      ) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
    const verified = await verifyPortableBundle(directory, run.id);
    return { runId: run.id, directory, portable: true, verified: true, paths: verified.paths };
  } catch (error) {
    throw new Error(`Export failed; inspect partial archive at ${directory}: ${error.message}`, {
      cause: error,
    });
  }
}
