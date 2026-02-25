# Copilot Instructions for skillpm

## What is skillpm?

skillpm is **npm for Agent Skills**. It builds on top of npm to add skill-awareness — resolving dependency trees, wiring skills into agent directories, and configuring MCP servers.

**Design principle: stay as close to npm as possible.** skillpm should feel like npm. Same `package.json`, same `node_modules/`, same `package-lock.json`, same registry. skillpm only adds what npm can't do: scanning for skills, wiring them into agent directories, and configuring MCP servers.

skillpm only manages npm-hosted skills. For GitHub/URL skills outside npm, users can run `npx skills add <source>` directly — skillpm doesn't manage those.

The project is developed in TypeScript.

### Key dependencies (don't reimplement — use these)

| Package | Type | What it does | How skillpm uses it |
|---|---|---|---|
| npm | CLI (shell out) | Package management, dependency resolution, registry, lockfiles, caching | All package operations — `skillpm install` calls `npm install` under the hood |
| [`skills`](https://www.npmjs.com/package/skills) (Vercel) | CLI (shell out) | Links skills into 37+ agent directories | `npx skills add <path>` — wires npm-installed skills into agent dirs |
| [`add-mcp`](https://github.com/neondatabase/add-mcp) | CLI (shell out) | Configures MCP servers across agents (Cursor, Claude, VS Code, Codex, etc.) | `npx add-mcp <source>` for MCP server configuration |

Before writing any new code, check whether one of these tools already does it.

## What are Agent Skills?

Agent Skills are modular, reusable packages of instructions, scripts, and resources that AI agents can dynamically load to extend their capabilities. They follow an open standard originated by Anthropic and adopted by Claude, Codex, Cursor, Gemini CLI, Augment, and others.

### Skill package structure

A skill is a standard npm package with the skill content in a `skills/<name>/` subdirectory:

```
my-skill/                        # npm package root
├── package.json                 # npm metadata, deps, skillpm.mcpServers, keywords: ["agent-skill"]
├── README.md                    # for humans on npmjs.org
├── LICENSE
└── skills/
    └── my-skill/                # spec-compliant skill directory
        ├── SKILL.md             # The skill definition (YAML frontmatter + Markdown body)
        ├── scripts/             # Optional: executable code the skill references
        ├── references/          # Optional: additional docs/resources
        └── assets/              # Optional: templates, images, data files
```

One skill per npm package. The skill directory name must match the `name` field in SKILL.md frontmatter. All skill packages must include `"agent-skill"` in `package.json` `keywords` for discoverability on npmjs.org.

### Dependency model

Skill dependencies go in standard `package.json` `dependencies` — npm handles resolution, lockfile, audit, outdated, caching, everything. The `skillpm` field is **only** for MCP server requirements:

```json
{
  "name": "refactor-react",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "dependencies": {
    "react-patterns": "^2.0.0",
    "typescript-best-practices": "^1.3.0"
  },
  "skillpm": {
    "mcpServers": [
      "@anthropic/mcp-server-filesystem",
      "https://mcp.context7.com/mcp"
    ]
  }
}
```

| Field | What goes here | Resolved by |
|---|---|---|
| `dependencies` | Skill packages on npm | npm — standard semver, lockfile, `node_modules/` |
| `skillpm.mcpServers[]` | MCP servers to configure for agents | `npx add-mcp <source>` |

All dependencies resolve transitively — skillpm walks each installed skill's `package.json` for further deps and MCP server requirements.

### SKILL.md format

```yaml
---
name: pdf-processing          # 1-64 chars, lowercase + digits + hyphens
description: Extract text and tables from PDF files, fill forms, merge documents.
license: Apache-2.0           # optional
compatibility: Requires pdfplumber Python package.  # optional, max 500 chars
metadata:                     # optional, arbitrary key-value pairs
  author: jane@example.com
allowed-tools: Bash Read      # optional, space-delimited tool whitelist
---

# PDF Processing

## When to use this skill
...step-by-step instructions, examples, edge cases...
```

Version comes from `package.json` — do not duplicate it in SKILL.md metadata.

## How skillpm works

### Install flow

When a user runs `skillpm install refactor-react`:

1. skillpm runs `npm install refactor-react` — npm handles resolution, download, lockfile, `node_modules/`
2. skillpm scans `node_modules/` for installed packages containing `skills/*/SKILL.md`
3. For each skill found, skillpm calls `npx skills add ./node_modules/<package>/skills/<name>/` to link it into agent directories
4. skillpm reads the `skillpm` field from each installed skill's `package.json` (transitive walk):
   - `skillpm.mcpServers[]` → shells out to `npx add-mcp <source>` for each
5. Done — agents see the full skill tree with MCP servers configured

### Core CLI commands

| Command | Description |
|---|---|
| `skillpm install [skill]` | Install a skill + its full dependency tree, wire into agent dirs |
| `skillpm uninstall <skill>` | Remove a skill and prune unused dependencies |
| `skillpm list` | Show installed skills and their dependency tree |
| `skillpm init` | Scaffold a new skill package (`package.json` + `skills/<name>/SKILL.md`) |
| `skillpm publish` | Publish a skill to npmjs.org (validates `"agent-skill"` keyword, wraps `npm publish`) |
| `skillpm sync` | Re-scan and re-wire agent directories without reinstalling |
| `skillpm mcp add <source>` | Configure an MCP server across agents (delegates to `add-mcp`) |
| `skillpm mcp list` | List configured MCP servers |

## Architecture

```
src/
├── cli.ts                  # Entry point — mirrors npm's command interface
├── commands/               # One file per command, thin wrappers around npm + tools
│   ├── install.ts          # npm install → scan for skills/*/SKILL.md → skills add → MCP config
│   ├── uninstall.ts        # npm uninstall + cleanup
│   ├── init.ts             # npm init + skills/<name>/SKILL.md scaffold + "agent-skill" keyword
│   ├── publish.ts          # npm publish with "agent-skill" keyword validation
│   ├── list.ts             # npm ls + skill tree annotation
│   ├── sync.ts             # Re-run scan/link/MCP config without reinstalling
│   └── mcp.ts              # Passthrough to add-mcp
├── scanner/                # Scan node_modules/ for packages containing skills/*/SKILL.md
├── postinstall/            # Walk tree, collect skillpm.mcpServers fields, delegate to add-mcp
├── manifest/               # package.json `skillpm` field parsing + SKILL.md parsing
├── config/                 # Config loading (supported agents, preferences)
└── utils/                  # Shared helpers (logging, errors, child_process wrappers)
```

## Build & Test

```bash
npm install           # install dependencies
npm run build         # compile TypeScript
npm test              # run full test suite
npx vitest run src/path/to/file.test.ts   # run a single test
npm run lint          # lint
```

## Conventions

- Use **Vitest** for testing. Co-locate tests next to source as `*.test.ts`.
- Use **ESLint** and **Prettier** for linting and formatting.
- One file per CLI command under `src/commands/`.
- Delegate to npm for all package management — do not reimplement registry, resolution, or caching.
- skillpm's only custom code is: scanning `node_modules/` for `skills/*/SKILL.md`, reading `skillpm.mcpServers` fields, and orchestrating the tools above.
- Shell out to `skills` CLI (for agent-directory linking) and `add-mcp` CLI (for MCP config).
- Use **zod** for validating the `skillpm` field schema in `package.json`.
- Use **gray-matter** for parsing YAML frontmatter from SKILL.md files.
- Prefer explicit, actionable error messages — this is a CLI tool, not a library.

## Git workflow

- **`main` is protected** — all changes go through pull requests with squash merge.
- **CI must pass** before merging (lint, build, tests on Node 18/20/22).
- Branch naming: `feat/`, `fix/`, `docs/`, `chore/`.
- Never push directly to `main`.
