# Maintainer Guide

This guide covers one-time setup and ongoing release operations for skillpm maintainers.

## npm account setup

1. Create an account at [npmjs.com/signup](https://www.npmjs.com/signup)
2. Verify your email address
3. Enable 2FA (required for publishing): [npmjs.com → Profile → Security](https://www.npmjs.com/settings/~/security)

## npm access token

1. Go to [npmjs.com → Access Tokens](https://www.npmjs.com/settings/~/tokens)
2. Click **"Generate New Token"** → select **"Granular Access Token"**
3. Configure:
   - **Token name:** `skillpm-github-actions`
   - **Expiration:** 90 days (set a calendar reminder to rotate)
   - **Packages and scopes:** **All packages**
   - **Permissions:** **Read and write**
4. Copy the token (you won't see it again)

## Add token to GitHub

1. Go to [github.com/sbroenne/skillpm/settings/secrets/actions](https://github.com/sbroenne/skillpm/settings/secrets/actions)
2. Click **"New repository secret"**
3. Name: `NPM_TOKEN`
4. Value: paste the token from step 2
5. Click **"Add secret"**

## Verify the setup

Push a test tag to confirm the pipeline works end-to-end:

```bash
npm version prerelease --preid=rc   # creates e.g. v0.1.1-rc.0
git push origin main --follow-tags
```

Check the [Actions tab](https://github.com/sbroenne/skillpm/actions) to verify it publishes successfully. You can unpublish the prerelease afterward:

```bash
npm unpublish skillpm@0.1.1-rc.0
```

## Releasing

Releases are automated via GitHub Actions. When a version tag is pushed, the [release workflow](.github/workflows/release.yml) runs lint, build, tests, publishes to npm, and creates a GitHub Release.

### How to release

1. **Update the version** in both `package.json` and `src/cli.ts`:

   ```bash
   npm version patch   # or minor, or major
   ```

   This updates `package.json` and creates a git commit + tag automatically.

   Then update the `VERSION` constant in `src/cli.ts` to match:

   ```typescript
   const VERSION = '0.2.0';  // must match package.json
   ```

   Amend the version commit if needed:

   ```bash
   git add src/cli.ts
   git commit --amend --no-edit
   git tag -f v0.2.0
   ```

2. **Push the tag:**

   ```bash
   git push origin main --follow-tags
   ```

3. **GitHub Actions does the rest:**
   - Runs lint, build, and tests
   - Publishes to npm with provenance
   - Creates a GitHub Release with auto-generated release notes

### Version policy

- **Patch** (`0.1.x`): Bug fixes, dependency updates
- **Minor** (`0.x.0`): New features, new commands
- **Major** (`x.0.0`): Breaking changes to CLI interface or `skillpm` field schema

## npm provenance

The release uses `--provenance` for supply chain security. This links the npm package back to the exact GitHub commit and workflow that built it. No extra setup needed — the `id-token: write` permission is already configured in the workflow.

## Token rotation

The npm token expires after 90 days. When it expires:

1. Generate a new token (same steps as above)
2. Update the `NPM_TOKEN` secret in GitHub (same name, new value)

## Revoking access

To revoke publishing access immediately:

1. Go to [npmjs.com → Access Tokens](https://www.npmjs.com/settings/~/tokens)
2. Delete the `skillpm-github-actions` token
