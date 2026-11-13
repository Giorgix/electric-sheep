import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
/** Runner mechanics only; project commands go through approved execution. */
export async function runGit(cwd, args, { input, raw = false } = {}) {
  const options = [
    '--no-pager',
    '-c',
    `core.hooksPath=${process.platform === 'win32' ? 'NUL' : '/dev/null'}`,
    '-c',
    'core.fsmonitor=false',
    '-c',
    'commit.gpgSign=false',
    '-c',
    'tag.gpgSign=false',
    '-c',
    'core.autocrlf=false',
    '-c',
    'core.quotePath=false',
    '-c',
    'submodule.recurse=false',
    '-c',
    'gc.auto=0',
    '-c',
    'maintenance.auto=false',
  ];
  const env = { ...process.env };
  // Git invoked from hooks can otherwise redirect this worktree's staging into
  // the caller's index, or even select an entirely different repository.
  for (const key of Object.keys(env)) {
    if (
      /^GIT_(DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|NAMESPACE|PREFIX|CONFIG_PARAMETERS|CONFIG_COUNT)$/.test(
        key,
      ) ||
      /^GIT_(CONFIG_(KEY|VALUE)_|AUTHOR_|COMMITTER_)/.test(key)
    )
      delete env[key];
  }
  Object.assign(env, { GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat' });
  const pending = exec('git', [...options, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env,
  });
  let inputError;
  pending.child.stdin?.on('error', (error) => {
    inputError = error;
  });
  pending.child.stdin?.end(input);
  const { stdout } = await pending;
  if (input !== undefined && inputError) throw inputError;
  return raw ? stdout : stdout.trimEnd();
}
