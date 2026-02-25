# skillpm — Agent Skill Package Manager

[![npm](https://img.shields.io/npm/v/skillpm)](https://www.npmjs.com/package/skillpm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docs](https://img.shields.io/badge/docs-skillpm.dev-blue)](https://skillpm.dev)

**skillpm** is the package manager for [Agent Skills](https://agentskills.io). Install skills with a single command — skillpm resolves the full dependency tree, wires everything into your agent directories, and configures any required MCP servers.

skillpm works exactly like npm — same `package.json`, same `node_modules/`, same `package-lock.json`, same registry. skillpm only adds what npm can't do: scanning for skills, wiring them into agent directories, and configuring MCP servers.

## Quick start

```bash
# Install a skill (no global install needed)
npx skillpm install refactor-react

# List installed skills
npx skillpm list
```

Or install globally for convenience:

```bash
npm install -g skillpm
skillpm install refactor-react
```

## What are Agent Skills?

Agent Skills are modular, reusable packages of instructions, scripts, and resources that AI agents can dynamically load to extend their capabilities. They follow an [open standard](https://agentskills.io) adopted by Claude, Codex, Cursor, Gemini CLI, Augment, and others.

A skill is just an npm package with a `SKILL.md` inside a `skills/<name>/` subdirectory:

```
refactor-react/
├── package.json                 # keywords: ["agent-skill"], deps, skillpm.mcpServers
├── README.md
└── skills/
    └── refactor-react/
        ├── SKILL.md             # Skill definition
        ├── scripts/             # Optional scripts
        ├── references/          # Optional docs
        └── assets/              # Optional templates/data
```

## Commands

| Command | Description |
|---|---|
| `skillpm install [skill...]` | Install skill(s) + full dependency tree, wire into agent dirs |
| `skillpm uninstall <skill...>` | Remove skill(s) and clean up |
| `skillpm list` | List installed skill packages |
| `skillpm init` | Scaffold a new skill package |
| `skillpm publish` | Publish to npmjs.org (validates `"agent-skill"` keyword) |
| `skillpm sync` | Re-wire agent directories without reinstalling |
| `skillpm mcp add <source...>` | Configure MCP server(s) across agents |
| `skillpm mcp list` | List configured MCP servers |

Aliases: `i` for `install`, `rm`/`remove` for `uninstall`, `ls` for `list`.

## How it works

When you run `skillpm install refactor-react`:

1. **npm install** — npm handles resolution, download, lockfile, `node_modules/`
2. **Scan** — skillpm scans `node_modules/` for packages containing `skills/*/SKILL.md`
3. **Link** — for each skill found, skillpm calls [`skills`](https://www.npmjs.com/package/skills) to wire it into 37+ agent directories (Claude, Cursor, VS Code, Codex, etc.)
4. **MCP config** — skillpm collects `skillpm.mcpServers` from all skills (transitively) and configures each via [`add-mcp`](https://github.com/neondatabase/add-mcp)

That's it. Agents see the full skill tree with MCP servers configured.

## Creating a skill

```bash
mkdir my-skill && cd my-skill
skillpm init
```

This creates a `package.json` (with the `"agent-skill"` keyword) and `skills/<name>/SKILL.md`. Edit the SKILL.md to define your skill.

### Skill dependencies

Skill dependencies go in standard `package.json` `dependencies` — npm handles everything:

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
    "mcpServers": ["@anthropic/mcp-server-filesystem"]
  }
}
```

| Field | Purpose | Resolved by |
|---|---|---|
| `dependencies` | Skill packages on npm | npm (semver, lockfile, `node_modules/`) |
| `skillpm.mcpServers[]` | MCP servers to configure | `add-mcp` |

### SKILL.md format

```yaml
---
name: refactor-react
description: Refactor React components using modern patterns.
license: MIT
allowed-tools: Bash Read
---

# Refactor React

## When to use this skill
...

## Instructions
...
```

Version comes from `package.json` — don't duplicate it in SKILL.md.

### Publishing

```bash
skillpm publish
```

This validates the `"agent-skill"` keyword is present, then delegates to `npm publish`. Your skill will be discoverable on npmjs.org via [`keywords:agent-skill`](https://www.npmjs.com/search?q=keywords:agent-skill).

## Why skillpm?

Existing tools handle parts of the problem:

- **npm** manages packages but doesn't know about skills or agent directories
- **[`skills`](https://www.npmjs.com/package/skills)** wires skills into agent dirs but doesn't manage dependencies
- **[`add-mcp`](https://github.com/neondatabase/add-mcp)** configures MCP servers but isn't connected to skill packages

**skillpm** is the glue — it orchestrates all three so you get transitive skill dependency resolution with a single `skillpm install`.

## Development

```bash
npm install           # install dependencies
npm run build         # compile TypeScript
npm test              # run tests
npm run lint          # lint
```

## License

MIT
