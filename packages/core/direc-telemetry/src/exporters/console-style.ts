const isTTY = process.stderr.isTTY ?? false;

function ansi(code: string): string {
  return isTTY ? `\x1b[${code}m` : "";
}

export const CONSOLE_ANSI = {
  reset: ansi("0"),
  bold: ansi("1"),
  dim: ansi("2"),
  red: ansi("31"),
  green: ansi("32"),
  yellow: ansi("33"),
  blue: ansi("34"),
  cyan: ansi("36"),
  gray: ansi("90"),
};

export function formatConsoleText(text: string, ...codes: string[]): string {
  return `${codes.join("")}${text}${CONSOLE_ANSI.reset}`;
}

export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(1)}ms`;
}
