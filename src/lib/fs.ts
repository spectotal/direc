import { mkdir, writeFile } from "node:fs/promises";

export async function writeFileSafe(
  filePath: string,
  content: string,
  force = false,
): Promise<void> {
  try {
    await writeFile(filePath, content, { flag: force ? "w" : "wx" });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      throw new Error(`Refusing to overwrite existing file: ${filePath}`);
    }

    throw error;
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}
