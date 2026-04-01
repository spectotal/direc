const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) {
    return {
      frontmatter: "",
      body: content,
    };
  }

  return {
    frontmatter: match[1] ?? "",
    body: match[2] ?? "",
  };
}

export function readScalar(frontmatter: string, field: string): string | undefined {
  const pattern = new RegExp(`^${field}:\\s*(.+)$`, "mu");
  const match = pattern.exec(frontmatter);
  const value = match?.[1]?.trim();
  if (!value) {
    return undefined;
  }

  return value.replace(/^['"]|['"]$/gu, "");
}
