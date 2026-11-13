import { mkdir, mkdtemp, readdir, lstat, realpath, copyFile, rename, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { contained } from '../src/repository.mjs';

const source = resolve(import.meta.dirname, '..');
async function copyPlain(from, to) {
  const info = await lstat(from);
  if (info.isSymbolicLink()) throw new Error(`Cannot package symlink: ${from}`);
  if (info.isDirectory()) {
    await mkdir(to, { recursive: true });
    for (const name of (await readdir(from)).sort())
      await copyPlain(join(from, name), join(to, name));
  } else if (info.isFile()) {
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
  } else throw new Error(`Cannot package non-file: ${from}`);
}
export async function packageLocal({ host, out }) {
  if (!['claude', 'codex'].includes(host)) throw new Error('Host must be claude or codex');
  if (typeof out !== 'string' || !out.trim()) throw new Error('Output path required');
  const output = resolve(out);
  if (contained(source, output)) throw new Error('Output must be outside source tree');
  let ancestor = dirname(output);
  while (true) {
    try {
      ancestor = await realpath(ancestor);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT' || dirname(ancestor) === ancestor) throw error;
      ancestor = dirname(ancestor);
    }
  }
  if (contained(await realpath(source), ancestor))
    throw new Error('Output must be outside source tree');
  const existing = await lstat(output).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (
    existing &&
    (existing.isSymbolicLink() || !existing.isDirectory() || (await readdir(output)).length)
  )
    throw new Error('Output already exists and is not an empty directory');
  await mkdir(dirname(output), { recursive: true });
  const stage = await mkdtemp(join(dirname(output), '.electric-sheep-package-'));
  try {
    const paths = [
      'package.json',
      'bin',
      'src',
      'skills',
      'README.md',
      'docs/usage.md',
      'docs/verification.md',
      'examples',
      `.${host}-plugin/plugin.json`,
    ];
    if (host === 'claude') paths.push('.claude-plugin/marketplace.json');
    for (const path of paths) await copyPlain(join(source, path), join(stage, path));
    if (host === 'codex') {
      const embedded = join(stage, 'skills/evolution-stress-test/scripts/runner');
      for (const path of ['src', 'bin', 'package.json'])
        await copyPlain(join(source, path), join(embedded, path));
    }
    if (existing) await rm(output, { recursive: true });
    await rename(stage, output);
    return { directory: output, host };
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({
      options: { host: { type: 'string' }, out: { type: 'string' } },
    });
    console.log(JSON.stringify(await packageLocal(values)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
