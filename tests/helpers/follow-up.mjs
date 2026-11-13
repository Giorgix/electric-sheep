export function findingInput(id = 'risk') {
  return {
    id,
    category: 'hypothesis',
    origin: 'uncertain',
    impact: 'Boundary behavior is untested',
    summary: 'Possible boundary omission',
    evidenceRefs: [],
    recommendation: 'Add a boundary regression test',
  };
}
export function followUpInput(findingId = 'risk') {
  return {
    schemaVersion: 1,
    actions: [
      {
        id: 'boundary',
        title: 'Validate boundary behavior',
        findingIds: [findingId],
        priority: 'high',
        rationale: 'The boundary is part of the current contract',
        targetPaths: ['value.mjs'],
        steps: [
          'Reproduce the boundary with a focused test',
          'Change implementation only if the test demonstrates a defect',
        ],
        acceptanceCriteria: ['Existing and new regression checks pass'],
        dependsOn: [],
      },
    ],
  };
}
export function followUpReport() {
  return {
    schemaVersion: 1,
    id: 'fixture',
    status: 'failed',
    scope: ['src'],
    repository: { root: '/project', commit: 'abc123' },
    baseline: { coverage: 'existing', results: [] },
    approvedPlan: { commands: [] },
    commandResults: [],
    deltas: [],
    events: [],
    findings: [
      findingInput(),
      {
        ...findingInput('defect'),
        category: 'defect',
        origin: 'experimental',
        evidenceRefs: ['evidence/fail.log'],
      },
      {
        ...findingInput('coupling'),
        category: 'evolution-friction',
        origin: 'experimental',
        evidenceRefs: ['evidence/change.diff'],
      },
    ],
  };
}
