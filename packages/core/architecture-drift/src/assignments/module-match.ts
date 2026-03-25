export function matchesModulePattern(modulePath: string, pattern: string): boolean {
  if (pattern === ".") {
    return true;
  }

  const normalizedModulePath = modulePath.replaceAll("\\", "/");
  const normalizedPattern = pattern.replaceAll("\\", "/").replace(/\/$/, "");

  return (
    normalizedModulePath === normalizedPattern ||
    normalizedModulePath.startsWith(`${normalizedPattern}/`)
  );
}
