// Shared enumeration for saved runs and their reports; reports omit acceptance ownership state.
export function evidenceReferences(record) {
  const artifacts = [
    ...(record.protectedArtifacts ?? []),
    ...(record.rounds ?? []).flatMap((r) => r.protectedArtifacts),
  ];
  return [
    ...record.findings.flatMap((f) => f.evidenceRefs),
    ...record.commandResults.flatMap((r) => [r.stdoutPath, r.stderrPath]),
    ...record.events.map((e) => e.diffPath),
    ...record.deltas.map((d) => d.evidenceRef),
    ...artifacts.map((a) => a.evidencePath),
  ].filter(Boolean);
}
