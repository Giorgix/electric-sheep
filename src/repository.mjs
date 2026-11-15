import { realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { relativePath } from './contracts.mjs';
import { runGit } from './git.mjs';
export function contained(parent, child) {
  const rel = relative(parent, child);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
export async function assertNoFilters(root) {
  const files = await runGit(root, [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
  ]);
  if (!files) return;
  const attrs = (
    await runGit(root, ['check-attr', '-z', '--stdin', 'filter'], { input: files })
  ).split('\0');
  for (let i = 2; i < attrs.length; i += 3) {
    if (!['unspecified', 'unset'].includes(attrs[i]))
      throw new Error('Unsupported Git filters (including LFS) in v1');
  }
}
export async function inspectRepository({ repo, scope }) {
  let root, commit;
  try {
    root = await realpath(await runGit(repo, ['rev-parse', '--show-toplevel']));
  } catch {
    throw new Error('Not an available Git repository');
  }
  try {
    commit = await runGit(root, ['rev-parse', '--verify', 'HEAD^{commit}']);
  } catch {
    throw new Error('Repository needs an initial commit');
  }
  const entries = (await runGit(root, ['ls-files', '--stage', '-z'])).split('\0');
  if (entries.some((e) => e.startsWith('160000 ')))
    throw new Error('Submodules are unsupported in v1');
  // Even `git status` can run clean filters; inspect attributes first.
  await assertNoFilters(root);
  if (await runGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']))
    throw new Error(
      'Dirty checkout: commit or exclude changes yourself; no stash or reset performed',
    );
  if (!Array.isArray(scope) || !scope.length) throw new Error('Missing scope');
  for (const path of scope) {
    relativePath(path, 'scope');
    let target;
    try {
      target = await realpath(resolve(root, path));
      await stat(target);
    } catch {
      throw new Error(`Unavailable scope: ${path}`);
    }
    if (!contained(root, target)) throw new Error('Scope escapes repository');
  }
  return {
    root,
    commit,
    branch: await runGit(root, ['branch', '--show-current']),
    scope,
    gitVersion: await runGit(root, ['--version']),
    nodeVersion: process.version,
  };
}
