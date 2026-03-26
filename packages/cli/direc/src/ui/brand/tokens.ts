const ANSI_RESET = "\u001B[0m";

function withAnsi(text: string, ...codes: string[]): string {
  return `${codes.join("")}${text}${ANSI_RESET}`;
}

export const brandText = {
  accent(text: string): string {
    return withAnsi(text, "\u001B[96m");
  },
  danger(text: string): string {
    return withAnsi(text, "\u001B[91m");
  },
  dim(text: string): string {
    return withAnsi(text, "\u001B[2m");
  },
  muted(text: string): string {
    return withAnsi(text, "\u001B[90m");
  },
  primary(text: string): string {
    return withAnsi(text, "\u001B[97m");
  },
  strong(text: string): string {
    return withAnsi(text, "\u001B[1m", "\u001B[97m");
  },
  success(text: string): string {
    return withAnsi(text, "\u001B[92m");
  },
  warning(text: string): string {
    return withAnsi(text, "\u001B[93m");
  },
};

export const BRAND_SPACING = {
  introLineGap: "",
};
