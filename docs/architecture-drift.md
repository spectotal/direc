# Architecture Drift Analysis

The JS Architecture Drift analyzer is a core plugin (`@spectotal/direc-plugin-js-architecture-drift`) that detects architectural degradation in JavaScript and TypeScript projects. It ensures that the project's dependency graph conforms to a customized set of modular boundaries and role definitions, preventing modules from bypassing intended architectural isolation.

## How It Works

The architecture drift analysis operates in several distinct phases:

1. **Dependency Graph Extraction**
2. **Configuration Validation**
3. **Role Assignment**
4. **Boundary Violation & Cycle Detection**

### 1. Dependency Graph Extraction

The analyzer uses [Madge](https://github.com/pahen/madge) as its underlying engine to parse the source files and build a dependency graph.

- It resolves paths based on the TypeScript configuration (`tsconfig.json`) to accurately trace module imports.
- It identifies all connections between files within the target paths, explicitly capturing circular dependencies natively.
- It filters out configured excluded paths before further processing.

### 2. Configuration Validation

The analysis operates based on custom rules provided in the plugin configuration. Before analyzing the graph, these rules are validated.

- **Module Roles:** Defines categories or "roles" of files (e.g., `Domain`, `UI`, `Infrastructure`) using path-matching patterns.
- **Role Boundary Rules:** Specifies the allowed and forbidden relationships between these roles.

The configuration validator checks for:

- Invalid configurations, such as empty identifiers or references to unrecognized roles.
- Missing required selectors, ensuring each rule has a clear `sourceRole` (or `allSourceRoles`) and boundary restrictions (`onlyDependOnRoles` or `notDependOnRoles`).

Any invalid rule generates a finding categorized as `invalid-role-config`.

### 3. Role Assignment

Every module in the filtered dependency graph is assigned one or more roles based on the `moduleRoles` configuration.

- The analyzer evaluates the module's file path against the glob patterns defined for each role.
- If a module's file path matches a pattern, it is assigned the corresponding role.
- If a module matches no patterns and thus receives zero roles, an `unassigned-module` finding is generated. This forces developers to intentionally categorize all source files into the architecture.

### 4. Boundary Violation & Cycle Detection

Finally, the analyzer cross-references the assigned roles and the dependency graph against the `roleBoundaryRules`.

For every dependency (a module importing another module):

- The roles of the source module and the target module are retrieved.
- If the source module has no specific rules attached to its roles, it passes.
- For each applicable boundary rule, the analyzer enforces the constraints:
  - **`onlyDependOnRoles`:** If specified, the target module _must_ have at least one role matching the allowed list. If not, a violation is flagged.
  - **`notDependOnRoles`:** If specified, the target module _must not_ have any roles in the forbidden list. If it does, a violation is flagged.

Any violation results in an architectural finding with details on exactly which import broke the boundary.

**Cycle Detection:**
Independently of the boundary rules, any circular dependencies identified by Madge during the graph extraction phase are explicitly extracted. Each cycle results in a severe `cycle` finding, discouraging tightly coupled or mutually dependent files.
