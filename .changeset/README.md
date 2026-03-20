# Release Notes

This folder stores Changesets for publishable workspace packages.

## Routine

1. After a user-facing package change, run `npm run changeset`.
2. Commit the generated markdown file in this folder with your feature branch.
3. When the branch is merged and you want to cut a release, run `npm run release:version`.
4. Commit the generated package version and changelog updates.
5. Publish with `npm run release:publish`.

## Scope

- Add a changeset when a published package changes in a way users should see.
- Skip a changeset for root-only maintenance work that does not affect a published package.
