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

export const PYTHON_SOURCE_EXTENSIONS = new Set([".py", ".pyi"]);

export const PYTHON_CONFIG_FILENAMES = new Set([
  "pyproject.toml",
  "requirements.txt",
  "requirements-dev.txt",
  "requirements-test.txt",
  "setup.py",
  "pytest.ini",
  "mypy.ini",
  "ruff.toml",
]);

export const FRONTEND_DEPENDENCIES = new Set([
  "@angular/core",
  "next",
  "preact",
  "react",
  "solid-js",
  "svelte",
  "vue",
]);
