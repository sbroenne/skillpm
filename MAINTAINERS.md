# Maintainer Guide

This guide covers one-time setup and ongoing release operations for skillpm maintainers.

## npm account setup

1. Create an account at [npmjs.com/signup](https://www.npmjs.com/signup)
2. Verify your email address
3. Enable 2FA (required for publishing): [npmjs.com → Profile → Security](https://www.npmjs.com/settings/~/security)

## Trusted Publishing (OIDC)

skillpm uses [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) — no tokens or secrets needed. GitHub Actions authenticates directly via OIDC.

### Initial setup (already done)

1. Publish the first version of each package manually (`npm publish --access public`)
2. On npmjs.com, go to each package → Settings → Trusted Publisher
3. Configure: Provider **GitHub Actions**, Owner `sbroenne`, Repository `skillpm`, Workflow `release.yml`

Both `skillpm` and `skillpm-skill` are configured to trust `release.yml`.

## Releasing

Releases are automated via GitHub Actions. When a version tag is pushed, the [release workflow](.github/workflows/release.yml) runs lint, build, tests, publishes both packages to npm, and creates a GitHub Release.

Both `skillpm` and `skillpm-skill` are released in lockstep with the same version.

### How to release

1. **Create a release branch and bump the version:**

   ```bash
   git checkout -b chore/release-0.2.0
   npm version minor --no-git-tag-version   # or patch, or major
   ```

2. **Update the `VERSION` constant** in `src/cli.ts` to match:

   ```typescript
   const VERSION = '0.2.0';  // must match package.json
   ```

3. **Update `packages/skillpm-skill/package.json`** version to match.

4. **Commit, push, and merge via PR:**

   ```bash
   git add -A
   git commit -m "chore: release v0.2.0"
   git push -u origin chore/release-0.2.0
   gh pr create --title "chore: release v0.2.0" --body ""
   ```

   Wait for CI, then squash merge.

5. **Tag and push from `main`:**

   ```bash
   git checkout main && git pull
   git tag v0.2.0
   git push origin v0.2.0
   ```

6. **GitHub Actions does the rest:**
   - Runs lint, build, and tests
   - Publishes `skillpm` and `skillpm-skill` to npm with provenance
   - Creates a GitHub Release with auto-generated release notes

### Version policy

- **Patch** (`0.1.x`): Bug fixes, dependency updates
- **Minor** (`0.x.0`): New features, new commands
- **Major** (`x.0.0`): Breaking changes to CLI interface or `skillpm` field schema

## npm provenance

The release uses `--provenance` for supply chain security. This links the npm package back to the exact GitHub commit and workflow that built it. No extra setup needed — the `id-token: write` permission is already configured in the workflow.
