export const DIREC_CONFIG_TEMPLATE = `{
  "specsDir": "specs",
  "defaultSpec": "specs/example.spec.md",
  "pipeline": {
    "analyze": {
      "enabled": true
    },
    "plan": {
      "enabled": true
    },
    "execute": {
      "enabled": false
    }
  }
}
`;

export const EXAMPLE_SPEC_TEMPLATE = `# Example Spec

## Goal
Describe the capability you want to build.

## Constraints
- List important product, technical, or safety constraints.

## Acceptance Criteria
- Define observable outcomes.
- Keep each criterion testable.

## Implementation Notes
- Add architecture or workflow notes here.
`;
