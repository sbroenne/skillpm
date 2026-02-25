---
name: skillpm
description: Manage Agent Skill packages and their dependency trees using skillpm — npm for Agent Skills.
allowed-tools: Bash Read
---

# skillpm — Agent Skill Package Manager

## When to use this skill

Use this skill when the user wants to:

- Install, uninstall, or update Agent Skill packages
- Create (scaffold) a new Agent Skill package
- Publish an Agent Skill to npmjs.org
- List installed skills or check their dependency trees
- Configure MCP servers required by skills
- Re-wire agent directories after manual changes

## Key concepts

- **skillpm wraps npm.** All packages live on npmjs.org. Same `package.json`, same `node_modules/`, same `package-lock.json`.
- **One skill per npm package.** The skill lives in `skills/<name>/SKILL.md` inside the package.
- **Transitive dependency resolution.** skillpm walks the full dependency tree to discover all skills and MCP server requirements.
- **Agent directory wiring.** skillpm uses the `skills` CLI to link installed skills into 37+ agent directories (Claude, Cursor, VS Code, Codex, Gemini CLI, etc.).
- **MCP server configuration.** Skills can declare MCP servers in `package.json` under `skillpm.mcpServers[]`. skillpm configures them via `add-mcp`.

## Commands

### Install a skill

```bash
skillpm install <skill-name>
# Aliases: skillpm i
```

This runs `npm install`, scans `node_modules/` for skill packages, links them into agent directories, and configures any required MCP servers.

### Install all dependencies

```bash
skillpm install
```

Reads `package.json`, installs all dependencies, and wires discovered skills.

### Uninstall a skill

```bash
skillpm uninstall <skill-name>
# Aliases: skillpm rm, skillpm remove
```

### List installed skills

```bash
skillpm list
# Aliases: skillpm ls
```

Shows all installed skill packages with descriptions and MCP server requirements.

### Scaffold a new skill

```bash
skillpm init
```

Creates `package.json` (with `"agent-skill"` keyword) and `skills/<name>/SKILL.md`. Edit the SKILL.md to define the skill.

### Publish a skill

```bash
skillpm publish
```

Validates the `"agent-skill"` keyword is present in `package.json`, then delegates to `npm publish`.

### Re-wire agent directories

```bash
skillpm sync
```

Re-scans `node_modules/` and re-links all skills into agent directories without reinstalling. Useful after manual changes.

### Configure MCP servers

```bash
skillpm mcp add <source>    # Add an MCP server (delegates to add-mcp)
skillpm mcp list            # List configured MCP servers
```

## Skill package structure

When creating a skill package, use this structure:

```
my-skill/
├── package.json                 # keywords: ["agent-skill"], dependencies, skillpm.mcpServers
├── README.md
├── LICENSE
└── skills/
    └── my-skill/
        ├── SKILL.md             # Skill definition (YAML frontmatter + Markdown body)
        ├── scripts/             # Optional executable scripts
        ├── references/          # Optional reference docs
        └── assets/              # Optional templates/data
```

### package.json for a skill

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "dependencies": {
    "other-skill": "^1.0.0"
  },
  "skillpm": {
    "mcpServers": ["@anthropic/mcp-server-filesystem"]
  }
}
```

- Skill dependencies go in standard `dependencies` — npm handles resolution.
- The `skillpm.mcpServers` array lists MCP servers that agents need for this skill.
- The `"agent-skill"` keyword is required for publishing.

### SKILL.md frontmatter

```yaml
---
name: my-skill
description: What this skill does.
license: MIT
compatibility: Any requirements or constraints.
allowed-tools: Bash Read
---
```

Version comes from `package.json` — do not duplicate it in SKILL.md.

## Error handling

- If `skillpm install` fails, check that npm can resolve the package: `npm view <skill-name>`
- If `skillpm publish` fails with a keyword error, add `"agent-skill"` to the `keywords` array in `package.json`
- If skills aren't appearing in agent directories after install, run `skillpm sync` to re-wire
