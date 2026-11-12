import { access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Native plugins keep runtime at their root; standalone bundles embed it here.
const candidates = [join(import.meta.dirname, 'runner'), resolve(import.meta.dirname, '../../..')];
let entry;
for (const root of candidates) {
  const path = join(root, 'src/cli.mjs');
  if (
    await access(path).then(
      () => true,
      () => false,
    )
  ) {
    entry = path;
    break;
  }
}
if (!entry) {
  console.error(
    'Electronic Sheeps runner is missing. Install the complete plugin/standalone bundle, not SKILL.md alone.',
  );
  process.exitCode = 1;
} else {
  const { main } = await import(pathToFileURL(entry).href);
  process.exitCode = await main(process.argv.slice(2), {
    stdout: process.stdout,
    stderr: process.stderr,
  });
}
