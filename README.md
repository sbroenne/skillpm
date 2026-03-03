# skillpm — Package manager for Agent Skills. Built on npm.

[![npm](https://img.shields.io/npm/v/skillpm)](https://www.npmjs.com/package/skillpm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docs](https://img.shields.io/badge/docs-skillpm.dev-blue)](https://skillpm.dev)

The [Agent Skills spec](https://agentskills.io) defines what a skill is — but not how to publish, install, version, or share them. There's no registry, no dependency management, no way for one skill to build on another. Without dependencies, skills become monoliths — authors duplicate instructions because there's no way to reuse another skill.

**skillpm** fills that gap. It's a lightweight orchestration layer — ~630 lines of code, 3 runtime dependencies — that maps Agent Skills onto npm's ecosystem. Same `package.json`, same `node_modules/`, same registry. Skills become npm packages you can publish, install, version, and depend on — just like any other package. Small skills that compose, not monoliths that overlap.

## Quick start

```bash
# Install a skill (no global install needed)
npx skillpm install <skill-name>

# List installed skills
npx skillpm list

# Scaffold a new skill package
npx skillpm init
```

Or install the CLI globally:

```bash
npm install -g skillpm
```

> **Note:** Skills are always workspace-local. This installs the `skillpm` CLI — not skills.

## How it works

When you run `skillpm install <skill>`:

1. **npm install** — npm handles resolution, download, lockfile, `node_modules/`
2. **Scan** — skillpm scans `node_modules/` for packages containing `skills/*/SKILL.md`
3. **Link** — for each skill found, skillpm calls [`skills`](https://www.npmjs.com/package/skills) to wire it into agent directories (Claude, Cursor, VS Code, Codex, and many more)
4. **Configs** — for each skill with a `configs/` directory, skillpm copies agent definitions, rules, and prompts into the workspace (auto-prefixed to avoid conflicts)
5. **MCP config** — skillpm collects `skillpm.mcpServers` from all skills (transitively) and configures each via [`add-mcp`](https://github.com/neondatabase/add-mcp)

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
| Config files | Copies agent definitions, rules, and prompts from `configs/` into the workspace |
| MCP server config | Collects and configures MCP servers transitively via [`add-mcp`](https://github.com/neondatabase/add-mcp) |

## Commands

| Command | Description |
|---|---|
| `skillpm install [skill...]` | Install skill(s) + full dependency tree, wire into agent dirs |
| `skillpm uninstall <skill...>` | Remove skill(s) and clean up |
| `skillpm list [--json]` | List installed skill packages |
| `skillpm init` | Scaffold a new skill package |
| `skillpm publish` | Publish to npmjs.org (validates `"agent-skill"` keyword) |
| `skillpm sync` | Re-wire agent directories without reinstalling |
| `skillpm mcp add <source...>` | Configure MCP server(s) across agents |
| `skillpm mcp list` | List configured MCP servers |
| `skillpm <npm-command> [args]` | Any other command is passed through to npm |

Aliases: `i`/`add` for `install`, `rm`/`remove` for `uninstall`, `ls` for `list`.

## Monorepo / npm workspace support

If your repo is an **npm workspace monorepo** where each skill is a first-party package (e.g. `skills/<name>/` entries in the root `package.json` workspaces field), npm installs them as symlinks inside `node_modules/`:

```
node_modules/
  @org/
    my-skill → ../../skills/my-skill   ← symlink
```

`skillpm sync` (and `skillpm install`) automatically detects these symlinks and treats them as workspace packages:

- Configs are copied from the symlinked skill's `configs/` directory into the workspace root, exactly as for externally installed skills.
- Workspace packages are identified in log output: `Linking workspace package @org/my-skill@1.0.0`.

This lets contributors regenerate deployed copies (agent definitions, prompts, rules) by running:

```bash
skillpm sync
```

No manual copy steps needed. Commit the regenerated files as usual.

## Creating a skill

```bash
mkdir my-skill && cd my-skill
skillpm init
```

See the full [Creating Skills](https://skillpm.dev/creating-skills/) guide for package structure, SKILL.md format, dependencies, and publishing.

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
