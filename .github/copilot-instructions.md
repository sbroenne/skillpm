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
| [`skills-ref`](https://www.npmjs.com/package/skills-ref) | CLI (shell out) | Validates SKILL.md against the Agent Skills spec | `npx skills-ref validate <path>` during `skillpm publish` |

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
├── skills/
│   └── my-skill/                # spec-compliant skill directory
│       ├── SKILL.md             # The skill definition (YAML frontmatter + Markdown body)
│       ├── scripts/             # Optional: executable code the skill references
│       ├── references/          # Optional: additional docs/resources
│       └── assets/              # Optional: templates, images, data files
└── configs/                      # Optional: mirrors workspace layout for agent/rule/prompt files
    ├── .claude/
    │   ├── agents/reviewer.md
    │   └── rules/conventions.md
    ├── .cursor/
    │   ├── agents/reviewer.md
    │   └── rules/conventions.md
    └── .github/
        ├── agents/reviewer.md
        └── instructions/conventions.instructions.md
```

One skill per npm package. The skill directory name must match the `name` field in SKILL.md frontmatter. All skill packages must include `"agent-skill"` in `package.json` `keywords` for discoverability on npmjs.org. Use `git+https://` prefix for `repository.url` in `package.json` (npm requires this format).

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

### Agent system terminology

Each agent system uses different names for the same concepts. skillpm abstracts over all of them:

| Agent system | "Agents" term | Agent directory | "Prompts/Rules" term | Prompt directory |
|---|---|---|---|---|
| **Claude Code** | Subagents | `.claude/agents/*.md` | Rules / CLAUDE.md | `.claude/rules/*.md` |
| **Cursor** | Custom agents | `.cursor/agents/*.md` | Rules | `.cursor/rules/*.md` |
| **GitHub Copilot** | Custom agents | `.github/agents/*.md` | Instructions | `.github/instructions/*.md` |
| **Codex** | Agents | `AGENTS.md` (sections) | — | `AGENTS.md` (sections) |
| **Gemini** | — | `GEMINI.md` (sections) | — | `GEMINI.md` (sections) |

Skills are always per-workspace (backed by `package.json` and lockfile). Global skill installs (`-g`) are not supported — use `npx skills add <path>` for global skills.

## How skillpm works

### Install flow

When a user runs `skillpm install refactor-react`:

1. skillpm runs `npm install refactor-react` — npm handles resolution, download, lockfile, `node_modules/`
2. skillpm scans `node_modules/` for installed packages containing `skills/*/SKILL.md`
3. For each skill found, skillpm calls `npx skills add ./node_modules/<package>/skills/<name>/` to link it into agent directories
4. skillpm reads the `skillpm` field from each installed skill's `package.json` (transitive walk):
   - `skillpm.mcpServers[]` → shells out to `npx add-mcp <source>` for each
5. For each skill with a `configs/` directory, skillpm copies files to the workspace root with auto-prefixed filenames (de-scoped package name, or `skillpm.configPrefix` if set) tracked in `.skillpm/manifest.json`
6. Done — agents see the full skill tree with MCP servers configured

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

skillpm is a monorepo with npm workspaces:

```
skillpm/
├── package.json              # Root — CLI tool + workspaces config
├── src/                      # CLI source (TypeScript)
│   ├── cli.ts                # Entry point — mirrors npm's command interface
│   ├── commands/             # One file per command, thin wrappers around npm + tools
│   │   ├── install.ts        # npm install → scan for skills/*/SKILL.md → skills add → MCP config
│   │   ├── uninstall.ts      # npm uninstall + cleanup
│   │   ├── init.ts           # npm init + skills/<name>/SKILL.md scaffold + "agent-skill" keyword
│   │   ├── publish.ts        # Validates against Agent Skills spec (skills-ref), wraps npm publish
│   │   ├── list.ts           # npm ls + skill tree annotation
│   │   ├── sync.ts           # Re-run scan/link/MCP config without reinstalling
│   │   └── mcp.ts            # Passthrough to add-mcp
│   ├── scanner/              # Scan node_modules/ for packages containing skills/*/SKILL.md
│   ├── configs/               # Copy configs/ files to workspace, manifest tracking
│   ├── manifest/             # package.json `skillpm` field parsing + SKILL.md parsing
│   ├── config/               # Config loading (supported agents, preferences)
│   └── utils/                # Shared helpers (logging, errors, child_process wrappers)
└── packages/
    └── skillpm-skill/        # Agent Skill package (published separately as "skillpm-skill")
        ├── package.json      # keywords: ["agent-skill"], independent npm package
        ├── README.md
        └── skills/
            └── skillpm/
                └── SKILL.md  # Teaches agents how to use skillpm
```

### Release strategy

Both packages are released in **lockstep** — same version, single tag trigger (`v*`). The release workflow **sets the version from the tag** (no version bump PR required), then publishes `skillpm` first, then `skillpm-skill`.

To release: merge all PRs, then `git tag vX.Y.Z && git push origin vX.Y.Z` from `main`.

**npm publishing uses OIDC trusted publishing** — no `NPM_TOKEN` secret. The workflow needs `id-token: write` permission. Trusted publishers must be configured on npmjs.com for both `skillpm` and `skillpm-skill` packages (Settings → Trusted Publisher → GitHub Actions, workflow: `release.yml`). Provenance attestations are generated automatically. Do not use stored npm tokens.

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
- skillpm's only custom code is: scanning `node_modules/` for `skills/*/SKILL.md`, reading `skillpm.mcpServers` fields, copying `configs/` files into the workspace, and orchestrating the tools above.
- Shell out to `skills` CLI (for agent-directory linking), `add-mcp` CLI (for MCP config), and `skills-ref` CLI (for spec validation).
- Use **zod** for validating the `skillpm` field schema in `package.json`.
- Use **gray-matter** for parsing YAML frontmatter from SKILL.md files.
- Prefer explicit, actionable error messages — this is a CLI tool, not a library.

### Examples and naming in docs, issues, and comments

**Always use generic placeholder names** in all documentation, GitHub issues, PR descriptions, code comments, and test fixtures. Never use real project names, internal org names, or private package names from any specific user's environment.

| Context | Use this | Never use |
|---------|----------|-----------|
| Scoped package name | `@org/my-skill`, `@acme/fullstack-react` | `@mcaps/spt-iq-consumption`, `@microsoft/internal-skill` |
| Config prefix | `react`, `my-skill` | `spt-iq-consumption`, `consumption` |
| Org / registry | `my-org`, `acme` | `mcaps`, `stbrnner`, any real org name |
| Skill name | `my-skill`, `pdf-processing`, `refactor-react` | Any real customer or internal project name |

This applies everywhere: inline code, tables, shell examples, test case descriptions, and issue bodies.

## Git workflow

- **`main` is protected** — all changes go through pull requests with squash merge.
- **Never commit directly to `main`** — always create a branch, push it, and create a PR.
- **Never auto-merge PRs** — push the branch, create the PR, then stop. The user reviews and merges manually.
- **CI must pass** before merging (lint, build, tests on Node 18/20/22).
- Branch naming: `feat/`, `fix/`, `docs/`, `chore/`.
- Never push directly to `main`.
