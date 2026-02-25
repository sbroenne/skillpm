# skillpm — Package manager for Agent Skills. Built on npm.

[![npm](https://img.shields.io/npm/v/skillpm)](https://www.npmjs.com/package/skillpm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docs](https://img.shields.io/badge/docs-skillpm.dev-blue)](https://skillpm.dev)

The [Agent Skills spec](https://agentskills.io) defines what a skill is — but not how to publish, install, version, or share them. There's no registry, no dependency management, no way for one skill to build on another.

**skillpm** fills that gap. It's a lightweight orchestration layer — ~630 lines of code, 3 runtime dependencies — that maps Agent Skills onto npm's ecosystem. Same `package.json`, same `node_modules/`, same registry. Skills become npm packages you can publish, install, version, and depend on — just like any other package.

## Quick start

```bash
# Install a skill (no global install needed)
npx skillpm install <skill-name>

# List installed skills
npx skillpm list

# Scaffold a new skill package
npx skillpm init
```

Or install globally for convenience:

```bash
npm install -g skillpm
```

## How it works

When you run `skillpm install <skill>`:

1. **npm install** — npm handles resolution, download, lockfile, `node_modules/`
2. **Scan** — skillpm scans `node_modules/` for packages containing `skills/*/SKILL.md`
3. **Link** — for each skill found, skillpm calls [`skills`](https://www.npmjs.com/package/skills) to wire it into agent directories (Claude, Cursor, VS Code, Codex, and many more)
4. **MCP config** — skillpm collects `skillpm.mcpServers` from all skills (transitively) and configures each via [`add-mcp`](https://github.com/neondatabase/add-mcp)

That's it. Agents see the full skill tree with MCP servers configured.

## What's missing from the spec — and what skillpm adds

skillpm doesn't reinvent anything. It orchestrates three battle-tested tools: npm, [`skills`](https://www.npmjs.com/package/skills), and [`add-mcp`](https://github.com/neondatabase/add-mcp).

| The spec doesn't define... | skillpm adds... |
|---|---|
| A registry | Publish to npmjs.org with `skillpm publish` |
| An install command | `skillpm install` resolves the full dependency tree |
| Dependency management | Standard `package.json` `dependencies` — npm handles semver, lockfiles, audit |
| Versioning | npm semver, `package-lock.json`, reproducible installs |
| Agent wiring | Links skills into agent directories via [`skills`](https://www.npmjs.com/package/skills) |
| MCP server config | Collects and configures MCP servers transitively via [`add-mcp`](https://github.com/neondatabase/add-mcp) |

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

## Creating a skill

```bash
mkdir my-skill && cd my-skill
skillpm init
```

This creates a `package.json` (with the `"agent-skill"` keyword) and `skills/<name>/SKILL.md`. Edit the SKILL.md to define your skill.

A skill is just an npm package with a `SKILL.md` inside a `skills/<name>/` subdirectory:

```
my-skill/
├── package.json                 # keywords: ["agent-skill"], deps, skillpm.mcpServers
├── README.md
└── skills/
    └── my-skill/
        ├── SKILL.md             # Skill definition
        ├── scripts/             # Optional scripts
        ├── references/          # Optional docs
        └── assets/              # Optional templates/data
```

### Skill dependencies

Skill dependencies go in standard `package.json` `dependencies` — npm handles everything:

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "dependencies": {
    "some-other-skill": "^1.0.0"
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
name: my-skill
description: What this skill does and when to use it.
license: MIT
allowed-tools: Bash Read
---

# My Skill

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

## What are Agent Skills?

Agent Skills are modular, reusable packages of instructions, scripts, and resources that AI agents can dynamically load to extend their capabilities. They follow an [open standard](https://agentskills.io) adopted by Claude, Codex, Cursor, Gemini CLI, Augment, and others.

## Development

```bash
npm install           # install dependencies
npm run build         # compile TypeScript
npm test              # run tests
npm run lint          # lint
```

## License

MIT
