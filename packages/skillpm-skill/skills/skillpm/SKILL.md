---
name: skillpm
description: Manage Agent Skill packages and their dependency trees using skillpm — npm for Agent Skills.
license: MIT
allowed-tools: Bash Read Write Edit
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
- **Config files.** Skills can include a `configs/` directory to ship native agent config files (subagent definitions, rules, prompts). The directory mirrors the workspace layout — files are copied on install with an auto-prefix (de-scoped package name, or a shorter `skillpm.configPrefix` override) to prevent conflicts.
- **MCP server configuration.** Skills can declare MCP servers in `package.json` under `skillpm.mcpServers[]`. skillpm configures them via `add-mcp`.

## Commands

All commands can be run without global install via `npx skillpm <command>`.

### Install a skill

```bash
npx skillpm install <skill-name>
# Aliases: skillpm i
```

This runs `npm install`, scans `node_modules/` for skill packages, links them into agent directories, copies config files, and configures any required MCP servers.

### Install all dependencies

```bash
npx skillpm install
```

Reads `package.json`, installs all dependencies, and wires discovered skills.

### Uninstall a skill

```bash
npx skillpm uninstall <skill-name>
# Aliases: skillpm rm, skillpm remove
```

### List installed skills

```bash
npx skillpm list
# Aliases: skillpm ls
```

Shows all installed skill packages with descriptions and MCP server requirements.

### Scaffold a new skill

```bash
npx skillpm init
```

Creates `package.json` (with `"agent-skill"` keyword) and `skills/<name>/SKILL.md` in the current directory. Edit the SKILL.md to define the skill.

### Publish a skill

```bash
npx skillpm publish
```

Validates the package structure and SKILL.md against the Agent Skills spec (via `skills-ref validate`), then delegates to `npm publish`.

### Re-wire agent directories

```bash
npx skillpm sync
```

Re-scans `node_modules/` and re-links all skills into agent directories without reinstalling. Useful after manual changes.

### Configure MCP servers

```bash
npx skillpm mcp add <source>    # Add an MCP server (delegates to add-mcp)
npx skillpm mcp list            # List configured MCP servers
```

## Creating a skill package

### Package structure

```
my-skill/
├── package.json                 # keywords: ["agent-skill"], dependencies, skillpm.mcpServers
├── README.md
├── LICENSE
├── skills/
│   └── my-skill/
│       ├── SKILL.md             # Skill definition (YAML frontmatter + Markdown body)
│       ├── scripts/             # Optional executable scripts
│       ├── references/          # Optional reference docs
│       └── assets/              # Optional templates/data
└── configs/                      # Optional — mirrors workspace layout
    ├── .claude/
    │   ├── agents/reviewer.md   # Claude subagent
    │   └── rules/conventions.md # Claude rules
    ├── .cursor/
    │   ├── agents/reviewer.md   # Cursor agent
    │   └── rules/conventions.md # Cursor rules
    └── .github/
        ├── agents/reviewer.md   # Copilot agent
        └── instructions/conventions.instructions.md
```

### package.json for a skill

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/user/repo.git"
  },
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
- Use `git+https://` prefix for `repository.url` (npm requires this format).

### Bundling agent configs, rules, and prompts

`SKILL.md` teaches agents *what to do* — instructions read at runtime. The `configs/` directory lets you also ship **config files** (subagent definitions, rules, instructions) in the native format of each agent system. It mirrors the workspace layout — files get copied to the workspace root on install, auto-prefixed to avoid conflicts.

The prefix used is: `configPrefix` (if set in `skillpm` field) → de-scoped package name (e.g. `@acme/fullstack-react` → `fullstack-react`). Set `configPrefix` to a short name when the package name is long.

Each agent system uses different names and directories:

| Agent system | Agents | Agent directory | Rules/Prompts | Rules directory |
|---|---|---|---|---|
| Claude Code | Subagents | `.claude/agents/*.md` | Rules | `.claude/rules/*.md` |
| Cursor | Custom agents | `.cursor/agents/*.md` | Rules | `.cursor/rules/*.md` |
| GitHub Copilot | Custom agents | `.github/agents/*.md` | Instructions | `.github/instructions/*.md` |
| Codex | — | `AGENTS.md` | — | `AGENTS.md` |
| Gemini CLI | — | `GEMINI.md` | — | `GEMINI.md` |

To ship config files, create a `configs/` directory that mirrors the workspace layout for each target system:

| Source in package | Destination in workspace |
|---|---|
| `configs/.claude/agents/reviewer.md` | `.claude/agents/my-skill-reviewer.md` |
| `configs/.cursor/rules/conventions.md` | `.cursor/rules/my-skill-conventions.md` |
| `configs/.github/instructions/help.instructions.md` | `.github/instructions/my-skill-help.instructions.md` |

On uninstall, all copied files are removed automatically (tracked via `.skillpm/manifest.json`).

Not every skill needs `configs/` — only use it when you want to ship native agent config files. Since `configs/` contains dotfile directories, add them to `package.json` `files`:

```json
{
  "files": ["skills/", "configs/"]
}
```

### SKILL.md frontmatter

```yaml
---
name: my-skill
description: What this skill does.
license: MIT
allowed-tools: Bash Read
---
```

Version comes from `package.json` — do not duplicate it in SKILL.md.

## Creating a skill package

### Scaffold from scratch

```bash
mkdir my-skill && cd my-skill
npx skillpm init
# Edit skills/my-skill/SKILL.md with instructions
# Edit package.json to add dependencies and MCP servers
npx skillpm publish
```

### Wrap an existing skill for npm

If you already have a `skills/<name>/SKILL.md` (e.g. from `npx skills add`), add a `package.json` to make it publishable:

```bash
cd my-existing-skill/
npm init -y
```

Then edit `package.json` to add the required keyword and optional MCP servers:

```json
{
  "name": "my-existing-skill",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "skillpm": {
    "mcpServers": ["@some/mcp-server"]
  }
}
```

Ensure the directory structure matches:

```
my-existing-skill/
├── package.json                 # Must have "agent-skill" in keywords
└── skills/
    └── my-existing-skill/
        └── SKILL.md             # Must have name and description in frontmatter
```

Then validate and publish:

```bash
npx skillpm publish
```

`skillpm publish` validates before publishing:
- `package.json` exists with `"agent-skill"` keyword
- `skills/<name>/SKILL.md` exists
- SKILL.md validates against the Agent Skills spec (`skills-ref validate`): name format, required fields, directory naming

## Error handling

- If `skillpm install` fails, check that npm can resolve the package: `npm view <skill-name>`
- If `skillpm publish` fails with a keyword error, add `"agent-skill"` to the `keywords` array in `package.json`
- If skills aren't appearing in agent directories after install, run `npx skillpm sync` to re-wire
