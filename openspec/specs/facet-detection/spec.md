## Purpose

Define how Direc detects repository facets and reports evidence, boundaries, and source-scope metadata for analyzer selection.

## Requirements

### Requirement: Repository facet detection returns all matching facets

The facet detection package SHALL inspect repository structure, configuration files, dependency manifests, and source patterns, and it SHALL return every supported facet that matches the repository instead of collapsing the repository to a single platform label.

#### Scenario: Mixed repository yields additive facets

- **WHEN** a repository contains npm workspaces, TypeScript configuration, frontend application structure, CSS source files, and Tailwind configuration
- **THEN** facet detection returns `js`, `frontend`, `css`, and `tailwind` as separate detected facets

### Requirement: Detected facets include evidence and metadata

Each detected facet SHALL include machine-readable metadata and human-readable evidence that explains why the facet was selected and what repository scope it covers.

#### Scenario: JavaScript and TypeScript facet includes workspace evidence

- **WHEN** the detector identifies the `js` facet from `package.json` workspaces and `tsconfig` files
- **THEN** the detection result includes the supporting file paths and derived package boundary metadata

### Requirement: JavaScript and TypeScript facet detection identifies package boundaries and analyzable source scope

The `js` facet detector SHALL identify JavaScript and TypeScript repositories from package manifests, workspace configuration, and TypeScript configuration, and it SHALL return package boundary metadata plus production-oriented source scope suitable for analyzer scoping.

#### Scenario: Workspace repository exposes package boundaries

- **WHEN** the detector scans a monorepo with a root `package.json`, workspace package manifests, and `tsconfig` files
- **THEN** it returns the `js` facet with metadata describing package roots and TypeScript ownership boundaries

#### Scenario: Source roots are captured for analyzer execution

- **WHEN** a workspace package contains `src/` TypeScript files and published package metadata
- **THEN** the detection result includes source scope metadata that analyzer plugins can use to limit execution

#### Scenario: Fixture code is not treated as primary analyzer scope

- **WHEN** the detector scans a repository that contains `src/` files alongside `test/fixtures/`, `dist/`, and `.d.ts` files
- **THEN** the default analyzable source scope excludes the generated and fixture-oriented paths

### Requirement: CSS facet detection is independently scoped

The `css` facet detector SHALL identify CSS-related source ownership from file patterns and tooling signals without requiring the repository to be classified as a frontend or JavaScript-only project, and it SHALL return metadata describing the matched CSS paths or styling entrypoints.

#### Scenario: Standalone CSS repository still exposes CSS facet

- **WHEN** a repository contains CSS files or CSS build configuration but no supported JavaScript or TypeScript facet
- **THEN** Direc still returns the `css` facet as an independent repository concern

#### Scenario: CSS file paths are included in metadata

- **WHEN** the detector identifies the `css` facet from repository file patterns
- **THEN** the result includes the matching CSS paths or globs used to justify analyzer selection

### Requirement: Frontend facet detection identifies application-facing UI structure

The `frontend` facet detector SHALL identify frontend-oriented application structure from framework dependencies, application entrypoints, or browser-targeted source layout.

#### Scenario: UI application structure yields frontend facet

- **WHEN** the detector finds browser-facing application files and frontend framework dependencies inside a workspace package
- **THEN** it returns the `frontend` facet for that repository or package scope

### Requirement: Tailwind facet detection is based on explicit repository signals

The `tailwind` facet detector SHALL identify Tailwind usage from repository signals such as Tailwind configuration files, package dependencies, or Tailwind utility usage patterns, and it SHALL report Tailwind as a styling concern alongside any other matched repository facets.

#### Scenario: Tailwind config enables the Tailwind facet

- **WHEN** a repository includes Tailwind configuration and supporting package dependencies
- **THEN** Direc returns the `tailwind` facet with evidence showing the relevant configuration files or manifests
