export function filterPathsWithPatterns(paths: string[], patterns: readonly string[]): string[] {
  return paths.filter((path) => !matchesAnyPathPattern(path, patterns));
}

export function matchesAnyPathPattern(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => matchesPathPattern(path, pattern));
}

export function matchesPathPattern(path: string, pattern: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(pattern);
  const regex = globToRegExp(normalizedPattern);
  return regex.test(normalizedPath);
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function globToRegExp(pattern: string): RegExp {
  let expression = "^";

  for (let index = 0; index < pattern.length; ) {
    const character = pattern[index];
    const nextCharacter = pattern[index + 1];
    const thirdCharacter = pattern[index + 2];

    if (character === undefined) {
      break;
    }

    if (character === "*" && nextCharacter === "*" && thirdCharacter === "/") {
      expression += "(?:.*/)?";
      index += 3;
      continue;
    }

    if (character === "*") {
      if (nextCharacter === "*") {
        expression += ".*";
        index += 2;
        continue;
      }

      expression += "[^/]*";
      index += 1;
      continue;
    }

    expression += escapeRegExp(character);
    index += 1;
  }

  expression += "$";
  return new RegExp(expression);
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}
