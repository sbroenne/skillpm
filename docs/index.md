# skillpm

**The package manager for Agent Skills.**

Install skills with a single command — skillpm resolves the full dependency tree, wires everything into your agent directories (Claude, Cursor, VS Code, Codex, and more), and configures any required MCP servers.

<div class="grid cards" markdown>

- :material-download: **Install skills** — `skillpm install <skill>` handles npm, agent linking, and MCP config in one step
- :material-tree: **Transitive deps** — skill dependencies resolve automatically through the full tree
- :material-link: **Agent wiring** — links skills into 37+ agent directories (Claude, Cursor, VS Code, Codex, etc.)
- :material-server: **MCP servers** — collects and configures MCP servers declared by skills

</div>

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

## How it works

When you run `skillpm install refactor-react`:

1. **npm install** — npm handles resolution, download, lockfile, `node_modules/`
2. **Scan** — skillpm scans `node_modules/` for packages containing `skills/*/SKILL.md`
3. **Link** — for each skill found, skillpm calls [`skills`](https://www.npmjs.com/package/skills) to wire it into agent directories
4. **MCP config** — skillpm collects `skillpm.mcpServers` from all skills (transitively) and configures each via [`add-mcp`](https://github.com/neondatabase/add-mcp)

That's it. Agents see the full skill tree with MCP servers configured.

## Why skillpm?

Existing tools handle parts of the problem:

| Tool | What it does | What it doesn't do |
|---|---|---|
| **npm** | Package management | Doesn't know about skills or agent directories |
| **[skills](https://www.npmjs.com/package/skills)** | Wires skills into agent dirs | Doesn't manage dependencies |
| **[add-mcp](https://github.com/neondatabase/add-mcp)** | Configures MCP servers | Isn't connected to skill packages |

**skillpm** is the glue — it orchestrates all three so you get transitive skill dependency resolution with a single command.
