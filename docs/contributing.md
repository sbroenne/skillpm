# Contributing

## Development setup

```bash
git clone https://github.com/sbroenne/skillpm.git
cd skillpm
npm install
npm run build
npm test
```

## Commands

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode — recompile on changes |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |

## Project structure

```
src/
├── cli.ts                  # Entry point, command dispatch
├── cli.test.ts             # CLI integration tests
├── commands/               # One file per command
├── scanner/                # Scans node_modules/ for skills
├── manifest/               # package.json + SKILL.md parsing
└── utils/                  # Logging, shell helpers
```

## Conventions

- Co-locate tests next to source as `*.test.ts`
- Use `catch (err: unknown)` — never `any`
- One file per CLI command under `src/commands/`
- Delegate to npm/skills/add-mcp — don't reimplement

## Releasing

See the [Maintainer Guide](https://github.com/sbroenne/skillpm/blob/main/MAINTAINERS.md) for the full release process and npm setup.
