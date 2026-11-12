import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
export async function createRepo({files = {'source.txt': 'baseline\n'}, commit = true} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'sheeps repo ü '));
  const git = async (...args) => (await exec('git', ['-c', 'core.autocrlf=false', ...args], {cwd: root, env: {...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null'}, encoding: 'utf8'})).stdout.trim();
  const write = async (path, text) => { await mkdir(dirname(join(root, path)), {recursive: true}); await writeFile(join(root, path), text); };
  await git('init', '-b', 'main');
  await git('config', 'user.name', 'Fixture'); await git('config', 'user.email', 'fixture@example.invalid');
  for (const [path, text] of Object.entries(files)) await write(path, text);
  if (commit) { await git('add', '.'); await git('commit', '--allow-empty', '-m', 'fixture'); }
  return {root, git, write, snapshot: async () => ({head: await git('rev-parse', 'HEAD'), branch: await git('branch', '--show-current'), status: await git('status', '--porcelain=v1', '--untracked-files=all'), config: await readFile(join(root, '.git/config'), 'utf8')}), dispose: () => rm(root, {recursive: true, force: true})};
}
