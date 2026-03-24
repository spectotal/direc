export const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".svn",
  ".direc",
  "dist",
  "node_modules",
]);

export const NODE_SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);

export const CSS_EXTENSIONS = new Set([".css", ".less", ".sass", ".scss"]);

export const FRONTEND_DEPENDENCIES = new Set([
  "@angular/core",
  "next",
  "preact",
  "react",
  "solid-js",
  "svelte",
  "vue",
]);
