export const fallback = {
  mode: "default",
} satisfies { mode: string };

export function selectValue(input?: string | null): string {
  for (const value of ["alpha", "beta"]) {
    if (input?.trim() ?? value) {
      return input ?? value;
    }
  }

  try {
    return input!.toUpperCase();
  } catch {
    return "fallback";
  }
}
