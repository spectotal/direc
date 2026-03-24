export function compactEvidence(values: Array<string | null>): string[] {
  return values.filter((value): value is string => value !== null);
}

export function describeRoots(paths: string[]): string {
  const roots = [...new Set(paths.map((file) => file.split("/")[0] ?? file))];
  return roots.slice(0, 3).join(", ");
}
