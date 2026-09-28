# Copilot Instructions for skillpm

## What is skillpm?

skillpm is **npm for Agent Skills**. It builds on top of npm to add skill-awareness: resolving skill dependency trees, scanning for installed skills, and wiring them into agent directories.

**Design principle: stay as close to npm as possible.** skillpm should feel like npm. Same `package.json`, same `node_modules`, same `package-lock.json`, same registry. skillpm only adds what npm cannot do by itself: discovering installed skills and linking them into agent directories.

skillpm only manages npm-hosted skills. For broader project-level agent packaging or non-npm sources, point users to APM or to the underlying host-specific tools.

The project is developed in TypeScript.

### Key dependencies (don't reimplement — use these)

| Package | Type | What it does | How skillpm uses it |
|---|---|---|---|
| npm | CLI (shell out) | Package management, dependency resolution, registry, lockfiles, caching | All package operations — `skillpm install` calls `npm install` under the hood |
| [`skills`](https://www.npmjs.com/package/skills) | CLI (shell out) | Installs canonical skill copies and agent links | `npx skills@1.7.0 add <path> -y --json` — checks structured project-install results |
| [Official `skills-ref`](https://github.com/agentskills/agentskills/tree/main/skills-ref) | Python CLI (shell out) | Validates SKILL.md against the Agent Skills spec | `skills-ref validate <path>` from PATH during `skillpm publish`; not the third-party npm port |

Before writing any new code, check whether one of these tools already does it.

Requires Node.js 22.20.0 or later. Keep the upstream CLI version pinned in
`src/utils/exec.ts` and recheck its JSON contract before upgrading.
Publishing also requires Python 3.11+ and the official validator on PATH.

## What are Agent Skills?

Agent Skills are modular, reusable packages of instructions, scripts, and resources that AI agents can dynamically load to extend their capabilities. They follow an open standard adopted by Claude, Codex, Cursor, Gemini CLI, Augment, and others.

### Skill package structure

A skill is a standard npm package with the skill content in a `skills/<name>/` subdirectory:

```
my-skill/
├── package.json                 # npm metadata, deps, keywords: ["agent-skill"]
├── README.md
├── LICENSE
└── skills/
    └── my-skill/
        ├── SKILL.md
        ├── scripts/
        ├── references/
        └── assets/
```

One skill per npm package. The skill directory name must match the `name` field in `SKILL.md` frontmatter. All skill packages must include `"agent-skill"` in `package.json` `keywords` for discoverability on npmjs.org. Use `git+https://` for `repository.url`.

The npm layout and keyword are skillpm conventions, not open-standard requirements.
Metadata is a string-to-string map. `allowed-tools` is experimental and
host-dependent. Recommend fewer than 500 lines in SKILL.md with relative
references to detailed resources; do not enforce this as a hard format limit.

### Dependency model

Skill dependencies go in standard `package.json` `dependencies` — npm handles resolution, lockfiles, audit, outdated, caching, everything.

```json
{
  "name": "refactor-react",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "dependencies": {
    "react-patterns": "^2.0.0",
    "typescript-best-practices": "^1.3.0"
  }
}
```

All dependencies resolve transitively through npm.

### SKILL.md format

```yaml
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents.
license: Apache-2.0
compatibility: Requires pdfplumber Python package.
metadata:
  author: jane@example.com
allowed-tools: Bash Read
---

# PDF Processing
```

Version comes from `package.json` — do not duplicate it in SKILL.md metadata.

## How skillpm works

### Install flow

When a user runs `skillpm install refactor-react`:

1. skillpm runs `npm install refactor-react`
2. skillpm scans `node_modules/` and nested dependencies for installed packages containing `skills/*/SKILL.md`, following each real package path once
3. Reject colliding SKILL.md names before installation
4. For each skill found, skillpm calls `npx skills@1.7.0 add <skillDir> -y --json` and verifies project installation

Current upstream normally copies content to `.agents/skills/` and links agents
to that copy, not to node_modules. Run sync after npm updates or workspace edits.
`package-lock.json` owns npm resolution; upstream `skills-lock.json` is separate.
Uninstall currently refreshes remaining skills but does not garbage-collect
stale canonical copies. Do not claim that re-wiring removes them.

### Core CLI commands

| Command | Description |
|---|---|
| `skillpm install [skill]` | Install a skill + its dependency tree, wire it into agent dirs |
| `skillpm uninstall <skill>` | Remove a skill |
| `skillpm list [--json]` | Show installed skills |
| `skillpm init` | Scaffold a new skill package |
| `skillpm publish` | Publish a skill to npmjs.org |
| `skillpm sync` | Re-scan and re-wire agent directories without reinstalling |
| `skillpm <npm-command> [args]` | Any other command is passed through to npm |

Aliases: `i`/`add` for `install`, `rm`/`remove` for `uninstall`, `ls` for `list`.

## Architecture

skillpm is a monorepo with npm workspaces:

```
skillpm/
├── package.json
├── src/
│   ├── cli.ts
│   ├── commands/
│   │   ├── install.ts
│   │   ├── uninstall.ts
│   │   ├── init.ts
│   │   ├── publish.ts
│   │   ├── list.ts
│   │   └── sync.ts
│   ├── scanner/
│   ├── manifest/
│   └── utils/
└── packages/
    └── skillpm-skill/
```

## Conventions

- Use **Vitest** for testing. Co-locate tests next to source as `*.test.ts`.
- Use **ESLint** and **Prettier**.
- One file per CLI command under `src/commands/`.
- Delegate to npm for package management.
- skillpm's custom code is scanning `node_modules/` for `skills/*/SKILL.md` and orchestrating the `skills` CLI.
- Shell out to `skills` for agent-directory linking and `skills-ref` for spec validation.
- Use **gray-matter** for parsing YAML frontmatter from SKILL.md files.
- Prefer explicit, actionable error messages.
