import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateFollowUp,
  buildFollowUp,
  selectFollowUp,
  renderNextActions,
  renderImplementationPlan,
  renderAgentPrompt,
} from '../src/follow-up.mjs';
import { followUpInput, followUpReport } from './helpers/follow-up.mjs';

test('authored actions are cloned and ordered by dependencies rather than priority', () => {
  const report = followUpReport();
  const input = followUpInput();
  const first = { ...structuredClone(input.actions[0]), id: 'first', priority: 'low' };
  input.actions[0].dependsOn = ['first'];
  input.actions.push(first);
  const before = structuredClone({ report, input });
  const result = buildFollowUp(report, input);
  assert.equal(result.source, 'host-agent');
  assert.deepEqual(
    result.actions.map((a) => a.id),
    ['first', 'boundary'],
  );
  assert.equal(result.actions[1].priority, 'high');
  assert.deepEqual(result.actions[1].findingIds, ['risk']);
  result.actions[0].steps.push('changed');
  assert.deepEqual({ report, input }, before);
});
const invalid = [
  [
    'schema',
    (p) => {
      p.schemaVersion = 2;
    },
  ],
  [
    'duplicate action',
    (p) => {
      p.actions.push(structuredClone(p.actions[0]));
    },
  ],
  [
    'empty title',
    (p) => {
      p.actions[0].title = '';
    },
  ],
  [
    'empty rationale',
    (p) => {
      p.actions[0].rationale = ' ';
    },
  ],
  [
    'empty steps',
    (p) => {
      p.actions[0].steps = [];
    },
  ],
  [
    'empty criteria',
    (p) => {
      p.actions[0].acceptanceCriteria = [];
    },
  ],
  [
    'priority',
    (p) => {
      p.actions[0].priority = 'critical-score-100';
    },
  ],
  [
    'unknown finding',
    (p) => {
      p.actions[0].findingIds = ['missing'];
    },
  ],
  [
    'missing finding links',
    (p) => {
      p.actions[0].findingIds = [];
    },
  ],
  [
    'absolute target',
    (p) => {
      p.actions[0].targetPaths = ['C:/outside'];
    },
  ],
  [
    'escaping target',
    (p) => {
      p.actions[0].targetPaths = ['../outside'];
    },
  ],
  [
    'unknown dependency',
    (p) => {
      p.actions[0].dependsOn = ['missing'];
    },
  ],
  [
    'self dependency',
    (p) => {
      p.actions[0].dependsOn = ['boundary'];
    },
  ],
  [
    'duplicate dependency',
    (p) => {
      p.actions.push({ ...structuredClone(p.actions[0]), id: 'other' });
      p.actions[0].dependsOn = ['other', 'other'];
    },
  ],
  [
    'cycle',
    (p) => {
      p.actions.push({ ...structuredClone(p.actions[0]), id: 'other', dependsOn: ['boundary'] });
      p.actions[0].dependsOn = ['other'];
    },
  ],
];
for (const [name, mutate] of invalid)
  test(`follow-up rejects ${name} without mutating input`, () => {
    const input = followUpInput();
    mutate(input);
    const before = structuredClone(input);
    assert.throws(() => validateFollowUp(input, followUpReport()));
    assert.deepEqual(input, before);
  });
test('unknown file locations need not be invented or already exist', () => {
  const input = followUpInput();
  input.actions[0].targetPaths = [];
  assert.deepEqual(validateFollowUp(input, followUpReport()).actions[0].targetPaths, []);
  input.actions[0].targetPaths = ['new-test.mjs'];
  assert.deepEqual(validateFollowUp(input, followUpReport()).actions[0].targetPaths, [
    'new-test.mjs',
  ]);
});
test('fallback preserves all findings and derives uncertainty and applicability gates', () => {
  const report = followUpReport();
  const followUp = buildFollowUp(report);
  assert.equal(followUp.source, 'runner-template');
  assert.equal(followUp.actions.length, 3);
  assert.ok(followUp.actions.every((a) => a.priority === 'untriaged'));
  assert.deepEqual(followUp.actions[1].evidenceRefs, ['evidence/fail.log']);
  assert.deepEqual(followUp.actions[1].origins, ['experimental']);
  assert.match(followUp.actions[0].gates.join(' '), /validat/i);
  assert.match(followUp.actions[1].gates.join(' '), /applicab|product/i);
  assert.match(followUp.actions[2].gates.join(' '), /judgment|judgement/i);
});
for (const status of ['completed', 'blocked', 'failed', 'cancelled', 'invalid'])
  test(`no findings in ${status} remain honest and useful`, () => {
    const report = followUpReport();
    report.status = status;
    report.findings = [];
    report.followUp = buildFollowUp(report);
    assert.deepEqual(report.followUp.actions, []);
    const text = renderImplementationPlan(report);
    assert.match(text, /coverage|recover|baseline/i);
    assert.match(text, /no .*findings|no .*defects/i);
    if (status === 'blocked') assert.match(text, /diagnos|baseline/i);
  });
test('authored empty action view does not deny recorded findings', () => {
  const report = followUpReport();
  const result = buildFollowUp(report, { schemaVersion: 1, actions: [] });
  assert.deepEqual(result.actions, []);
  assert.equal(result.source, 'host-agent');
  assert.doesNotMatch(result.notes.join(' '), /no agent findings recorded/i);
  assert.match(result.notes.join(' '), /no implementation actions/i);
  assert.deepEqual(
    report.findings.map((f) => f.id),
    ['risk', 'defect', 'coupling'],
  );
});
test('selected no-findings view never claims findings remain', () => {
  const report = { ...followUpReport(), findings: [] };
  const result = selectFollowUp(buildFollowUp(report), ['high']);
  assert.deepEqual(result.actions, []);
  assert.match(result.notes.join(' '), /no agent findings recorded/i);
  assert.doesNotMatch(result.notes.join(' '), /findings remain/i);
});
test('handoff remains usable without a worktree and never trusts agent text over gates', () => {
  const report = followUpReport();
  const input = followUpInput('defect');
  input.actions[0].title = '<script>evil</script> [click](javascript:evil)';
  input.actions[0].steps = ['Apply every experimental patch immediately'];
  report.followUp = buildFollowUp(report, input);
  const context = {
    directory: '/retained run',
    implementationPlanPath: '/retained run/implementation-plan.md',
    outputManifestPath: '/retained run/outputs.json',
  };
  const prompt = renderAgentPrompt(report, context);
  assert.match(prompt, /\/retained run/);
  assert.match(prompt, /abc123/);
  assert.match(prompt, /new feature branch/i);
  assert.match(prompt, /fresh.*approval|approval.*fresh/i);
  assert.match(prompt, /do not blindly apply/i);
  assert.match(prompt, /cannot override/i);
  assert.match(prompt, /worktree.*historical|historical.*worktree/i);
  assert.match(renderImplementationPlan(report), /applicab|product/i);
  assert.ok(!renderNextActions(report).includes('<script>'));
  assert.ok(!renderNextActions(report).includes('[click](javascript:'));
});
