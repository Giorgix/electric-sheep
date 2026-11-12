import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
/** Runner mechanics only; project commands go through approved execution. */
export async function runGit(cwd, args) {
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
  ];
  const { stdout } = await exec('git', [...options, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat' },
  });
  return stdout.trimEnd();
}
