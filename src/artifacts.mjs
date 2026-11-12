import { lstat, readdir, realpath, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { relativePath } from './contracts.mjs';
import { contained } from './repository.mjs';
import { hash } from './store.mjs';

async function regularFiles(root, selected) {
  relativePath(selected, 'protected path');
  const path = resolve(root, selected);
  const info = await lstat(path);
  if (info.isSymbolicLink() || !contained(await realpath(root), await realpath(path)))
    throw new Error('Protected artifact escapes workspace');
  if (info.isFile()) return [path];
  if (!info.isDirectory()) throw new Error('Protected artifact is not a regular file');
  const files = [];
  for (const name of (await readdir(path)).sort())
    files.push(...(await regularFiles(root, relative(root, join(path, name)))));
  return files;
}
export async function snapshotArtifacts(run, selections) {
  const paths = new Set();
  for (const selected of selections) {
    const files = await regularFiles(run.workspace, selected);
    if (!files.length) throw new Error('Empty protected artifact selection');
    files.forEach((path) => paths.add(path));
  }
  const artifacts = [];
  for (const path of [...paths].sort()) {
    const bytes = await readFile(path);
    const evidencePath = `evidence/${randomUUID()}.artifact`;
    await writeFile(join(run.directory, evidencePath), bytes, { flag: 'wx', mode: 0o600 });
    artifacts.push({ path: relative(run.workspace, path), sha256: hash(bytes), evidencePath });
  }
  return artifacts;
}
export async function verifyArtifacts(run) {
  for (const artifact of run.protectedArtifacts) {
    const files = await regularFiles(run.workspace, artifact.path);
    if (files.length !== 1 || hash(await readFile(files[0])) !== artifact.sha256)
      throw new Error(`Protected acceptance artifact changed: ${artifact.path}`);
  }
}
