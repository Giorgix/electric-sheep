import { isAbsolute, win32 } from 'node:path';
export const SCHEMA_VERSION = 1;
export const DEFAULT_TIMEOUT_MS = 300000;
export function nonempty(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0'))
    throw new Error(`Invalid ${label}`);
  return value;
}
export function relativePath(value, label = 'path') {
  nonempty(value, label);
  if (
    isAbsolute(value) ||
    win32.isAbsolute(value) ||
    value.split(/[\\/]/).includes('..') ||
    value.includes(':')
  )
    throw new Error(`Invalid relative ${label}`);
  return value;
}
function list(value, label, check = nonempty, required = true) {
  if (!Array.isArray(value) || (required && !value.length)) throw new Error(`Invalid ${label}`);
  value.forEach((v) => check(v, label));
}
function unique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
}
/** Normalize an ExercisePlan (see docs/usage.md), without mutating caller input. */
export function validatePlan(input) {
  const p = structuredClone(input);
  if (!p || p.schemaVersion !== SCHEMA_VERSION) throw new Error('Unsupported plan schemaVersion');
  list(p.scope, 'scope', relativePath);
  list(p.commands, 'commands', () => {});
  for (const c of p.commands) {
    nonempty(c.id, 'command id');
    nonempty(c.executable, 'executable');
    list(
      c.args,
      'args',
      (v) => {
        if (typeof v !== 'string' || v.includes('\0')) throw new Error('Invalid argument');
      },
      false,
    );
    c.cwd ??= '.';
    relativePath(c.cwd, 'command cwd');
    c.timeoutMs ??= DEFAULT_TIMEOUT_MS;
    if (!Number.isSafeInteger(c.timeoutMs) || c.timeoutMs <= 0 || c.timeoutMs > 2147483647)
      throw new Error('Invalid timeout');
    if (!['setup', 'check'].includes(c.purpose)) throw new Error('Invalid command purpose');
  }
  unique(
    p.commands.map((c) => c.id),
    'command ids',
  );
  const references = (ids, purpose, required = true) => {
    list(ids, 'command references', nonempty, required);
    unique(ids, 'command references');
    for (const id of ids)
      if (!p.commands.some((c) => c.id === id && c.purpose === purpose))
        throw new Error(`Unknown ${purpose} command: ${id}`);
  };
  references(p.setupCommandIds, 'setup', false);
  references(p.baselineCommandIds, 'check');
  list(p.baselineProtectedPaths, 'baseline protected paths', relativePath);
  if (!['existing', 'limited'].includes(p.coverage)) throw new Error('Invalid coverage');
  if (p.coverage === 'limited') nonempty(p.coverageNote, 'coverage note');
  if (!Array.isArray(p.challenges) || p.challenges.length !== 3)
    throw new Error('Exactly three challenges required');
  for (const c of p.challenges) {
    for (const key of ['id', 'requirement', 'rationale', 'stopCondition']) nonempty(c[key], key);
    list(c.constraints, 'constraints');
    list(c.protectedPaths, 'protected paths', relativePath);
    references(c.commandIds, 'check');
  }
  unique(
    p.challenges.map((c) => c.id),
    'challenge ids',
  );
  list(p.exclusions, 'exclusions', relativePath, false);
  nonempty(p.host, 'host');
  if (!['single-agent', 'separate-agents', 'unknown'].includes(p.roleSeparation))
    throw new Error('Invalid role separation');
  return p;
}
