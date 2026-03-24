import type { OpenSpecTaskItem } from "./types.js";

export function parseOpenSpecTasks(contents: string, sourcePath: string): OpenSpecTaskItem[] {
  const tasks: OpenSpecTaskItem[] = [];

  for (const line of contents.split(/\r?\n/u)) {
    const parsedTask = parseTaskLine(line, sourcePath, tasks.length + 1);

    if (parsedTask) {
      tasks.push(parsedTask);
    }
  }

  return tasks;
}

function parseTaskLine(
  line: string,
  sourcePath: string,
  fallbackIndex: number,
): OpenSpecTaskItem | null {
  const match = line.match(/^\s*[-*]\s+\[(?<checked>[ xX])\]\s+(?<text>.+?)\s*$/u);

  if (!match?.groups) {
    return null;
  }

  const rawText = match.groups.text?.trim();
  const checked = match.groups.checked?.toLowerCase();

  if (!rawText || !checked) {
    return null;
  }

  const { id, title } = splitTaskIdentity(rawText, fallbackIndex);

  return {
    id,
    title,
    checked: checked === "x",
    sourcePath,
  };
}

function splitTaskIdentity(rawText: string, fallbackIndex: number): { id: string; title: string } {
  const match = rawText.match(/^(?<id>\d+(?:\.\d+)*)\s+(?<title>.+)$/u);

  if (!match?.groups?.id || !match.groups.title) {
    return {
      id: `task-${fallbackIndex}`,
      title: rawText,
    };
  }

  return {
    id: match.groups.id,
    title: match.groups.title,
  };
}
