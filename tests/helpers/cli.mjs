import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
export const cliPath = fileURLToPath(new URL('../../bin/electric-sheep.mjs', import.meta.url));
const exec = promisify(execFile);
export async function cli(args, options = {}) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  try {
    const result = await exec(process.execPath, [cliPath, ...args], {
      ...options,
      env,
      maxBuffer: 4 * 1024 * 1024,
    });
    return { ...result, exitCode: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? '', stderr: error.stderr ?? '', exitCode: error.code };
  }
}
