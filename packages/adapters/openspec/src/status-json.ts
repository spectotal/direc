export function extractJson<T>(output: string): T {
  const start = output.indexOf("{");

  if (start === -1) {
    throw new Error("Could not locate JSON payload in OpenSpec output.");
  }

  return JSON.parse(output.slice(start)) as T;
}
