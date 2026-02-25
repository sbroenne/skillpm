# Contributing to skillpm

## Development

```bash
git clone https://github.com/sbroenne/skillpm.git
cd skillpm
npm install
npm run build
npm test
```

### Commands

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode — recompile on changes |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |

### Project structure

```
src/
├── cli.ts                  # Entry point, command dispatch
├── cli.test.ts             # CLI integration tests
├── commands/               # One file per command
│   ├── install.ts
│   ├── uninstall.ts
│   ├── init.ts
│   ├── publish.ts
│   ├── list.ts
│   ├── sync.ts
│   └── mcp.ts
├── scanner/                # Scans node_modules/ for skills
│   ├── index.ts
│   └── index.test.ts
├── manifest/               # package.json + SKILL.md parsing
│   ├── schema.ts
│   ├── index.ts
│   └── index.test.ts
└── utils/                  # Logging, shell helpers
    ├── exec.ts
    ├── log.ts
    └── index.ts
```

### Conventions

- Co-locate tests next to source as `*.test.ts`
- Use `catch (err: unknown)` — never `any`
- One file per CLI command under `src/commands/`
- Delegate to npm/skills/add-mcp — don't reimplement

## Workflow

### Branch protection

The `main` branch is protected:

- **All changes go through pull requests** — no direct pushes to `main`
- **Squash merge only** — every PR becomes a single clean commit on `main`
- **CI must pass** — build and tests on Node 18, 20, and 22 are required before merging
- **Branches are auto-deleted** after merge

### Making changes

1. Create a feature branch:

   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes, ensure lint + tests pass:

   ```bash
   npm run lint && npm run build && npm test
   ```

3. Push and open a PR:

   ```bash
   git push -u origin feat/my-feature
   gh pr create --fill
   ```

4. After CI passes, squash merge via GitHub.

### Branch naming

| Prefix | Use for |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `chore/` | Maintenance, deps, CI |

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

### Prerequisites (one-time setup)

1. **npm token:** Create an [npm access token](https://docs.npmjs.com/creating-and-viewing-access-tokens) (Automation type) and add it as a repository secret named `NPM_TOKEN` in GitHub Settings → Secrets → Actions.

2. **npm provenance:** The release uses `--provenance` for supply chain security. This requires the `id-token: write` permission (already configured in the workflow).

### Version policy

- **Patch** (`0.1.x`): Bug fixes, dependency updates
- **Minor** (`0.x.0`): New features, new commands
- **Major** (`x.0.0`): Breaking changes to CLI interface or `skillpm` field schema
