<p align="center">
  <img src="assets/direc-intro.png" alt="direc" width="480" />
</p>

<h3 align="center">Boundary-first agentic development</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/direc"><img src="https://img.shields.io/npm/v/direc.svg" alt="npm version" /></a>
  <a href="https://github.com/spectotal/direc/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license" /></a>
</p>

---

## Getting Started

### Install

```bash
npx direc --help
# or install globally
npm install -g direc
```

### Initialize a project

`direc init` detects your repository facets, enables matching analyzers, and writes a local `.direc/config.json`:

```bash
direc init
```

This generates:

- **`.direc/config.json`** — facet IDs, enabled analyzers, path exclusions, thresholds, and architecture boundaries
- **`.direc/latest/`** — latest analyzer snapshots
- **`.direc/history/`** — event-linked analyzer history

---

## Facets & Analyzers

Direc uses a concept of **Facets** to understand what kind of project it's analyzing. A facet represents a detected technology stack or framework (e.g., `js`, `python`, `tailwind`).

1. **Detection**: During `direc init` (or when analyzers run), Direc scans the repository for evidence (like `package.json`, `tsconfig.json`, or specific file extensions) to detect active facets.
2. **Analyzer Resolution**: Analyzers declare which facets they support. Direc automatically enables the built-in and extended analyzers that match the detected facets in your project.
3. **Prerequisites**: Before an analyzer runs, it can check prerequisites (e.g., "is `eslint` installed?"). If a prerequisite fails or a facet is missing, the analyzer is gracefully skipped.

You can explicitly enable or disable specific analyzers and override their options in your `.direc/config.json`.

---

## Scenarios

### a. Analyze

Run code-quality analysis across your repository or delegate it to agents for validation loop.

```bash
# repository-wide scan
direc analyze

# continuous watch mode
direc analyze --watch
```

`direc analyze` runs built-in analyzers (complexity, architecture drift) and prints a findings summary plus saved report paths. For deeper inspection, open the JSON files in `.direc/latest/`.

#### Extend with plugins

```bash
direc analyze --extension ./my-plugin.mjs
direc analyze --extension @acme/direc-python
```

#### Health check

```bash
direc doctor
```

Validates that your `.direc/config.json` is well-formed and all referenced analyzers are loadable.

---

### b. Automation 🧪

> [!WARNING]
> **Experimental** — the automation surface is under active development and may change.

Automate subagent workflows that react to analysis results and spec events.

```bash
# run the default workflow from config
direc automate

# explicit workflow
direc automate --workflow openspec
```

`direc automate` watches normalized events, runs analyzers first, then writes formalized subagent requests and results under `.direc/automation/`.

Automation artifacts are stored in:

| Path                          | Purpose                             |
| ----------------------------- | ----------------------------------- |
| `.direc/automation/requests/` | Subagent request envelopes          |
| `.direc/automation/results/`  | Subagent results                    |
| `.direc/automation/latest/`   | Latest per-change automation status |

The default transport uses a bundled command backend — runnable immediately after `direc init`. Replace `automation.transport` in your config to point at a different command, HTTP endpoint, or SDK adapter.

---

## License

[MIT](LICENSE)
