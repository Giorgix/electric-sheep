import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlan} from '../src/contracts.mjs';
import {plan} from './helpers/plans.mjs';
test('valid plan receives exact defaults without mutating input', () => { const input = plan(); const value = validatePlan(input); assert.equal(value.commands[0].timeoutMs, 300000); assert.equal(value.commands[0].cwd, '.'); assert.equal(input.commands[0].timeoutMs, undefined); });
const mutations = {
  'empty challenges': p => p.challenges = [],
  'duplicate command ids': p => p.commands.push({...p.commands[0]}),
  'unknown command reference': p => p.challenges[0].commandIds = ['unknown'],
  'shell string not argv': p => p.commands[0].args = 'echo unsafe',
  'empty baseline': p => p.baselineCommandIds = [],
  'empty protected files': p => p.challenges[0].protectedPaths = [],
  'escaping scope': p => p.scope = ['../source'],
  'escaping command cwd': p => p.commands[0].cwd = '../source',
  'absolute protected file': p => p.baselineProtectedPaths = ['/etc/passwd'],
  'zero timeout': p => p.commands[0].timeoutMs = 0,
  'negative timeout': p => p.commands[0].timeoutMs = -1,
  'NaN timeout': p => p.commands[0].timeoutMs = NaN,
  'missing requirement': p => p.challenges[0].requirement = '',
  'limited coverage without note': p => p.coverage = 'limited',
  'setup used as test': p => p.commands[0].purpose = 'setup',
};
for (const [name, change] of Object.entries(mutations)) test(`rejects ${name}`, () => { const p = plan(); change(p); assert.throws(() => validatePlan(p)); });
