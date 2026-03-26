export function findCycles(graph: Record<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string, path: string[]) {
    visited.add(node);
    stack.add(node);

    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      if (stack.has(neighbor)) {
        const cycle = path.slice(path.indexOf(neighbor));
        cycles.push([...cycle, neighbor]);
      } else if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      }
    }

    stack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node, [node]);
    }
  }

  return cycles;
}
