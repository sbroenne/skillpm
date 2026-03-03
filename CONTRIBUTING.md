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
├── configs/                # Copy configs/ files to workspace, manifest tracking
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
- **CI must pass** — build and tests on Node 18, 20, 22, and 24 are required before merging
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

Releases are automated via GitHub Actions. See the [Maintainer Guide](MAINTAINERS.md) for the full release process, npm setup, and token configuration.
