import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { validatePlan } from '../src/contracts.mjs';
const skill = join(import.meta.dirname, '../skills/evolution-stress-test');
test('skill metadata and reference assets are consumable', async () => {
  const text = await readFile(join(skill, 'SKILL.md'), 'utf8');
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(front);
  assert.match(front[1], /^name: [a-z0-9-]+$/m);
  assert.match(front[1], /^description: Use when/m);
  for (const ref of ['challenges.md', 'assessment.md', 'plan.example.json'])
    await access(join(skill, 'references', ref));
});
test('bundled example plan is accepted by actual runner validation', async () => {
  const p = validatePlan(
    JSON.parse(await readFile(join(skill, 'references/plan.example.json'), 'utf8')),
  );
  assert.equal(p.challenges.length, 3);
  assert.ok(
    p.challenges.every((c) =>
      c.commandIds.every((id) => p.commands.some((command) => command.id === id)),
    ),
  );
});
test('skill runner entry works outside project cwd', async () => {
  const result = await promisify(execFile)(
    process.execPath,
    [join(skill, 'scripts/run.mjs'), '--help'],
    { cwd: process.env.TEMP ?? process.env.TMPDIR ?? '/tmp' },
  );
  assert.match(result.stdout, /Electronic Sheeps/);
});
