---
description: How to create, package, validate, and publish an agent skill to npm. Includes the SKILL.md format, package structure, and publishing checklist.
---

# Creating Skills

Skills follow the open [Agent Skills spec](https://agentskills.io/specification). skillpm adds npm packaging conventions on top.

## Package structure

A skill is a standard npm package with the skill content in a `skills/<name>/` subdirectory:

```
my-skill/
├── package.json                 # npm metadata, deps, keywords: ["agent-skill"]
├── README.md                    # for humans on npmjs.org
├── LICENSE
├── skills/
│   └── my-skill/                # spec-compliant skill directory
│       ├── SKILL.md             # skill definition (required)
│       ├── scripts/             # optional executable scripts
│       ├── references/          # optional reference docs
│       └── assets/              # optional templates/data
└── configs/                      # optional — mirrors workspace layout
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

One skill per npm package. The skill directory name must match the `name` field in SKILL.md frontmatter.

## Scaffold a new skill

```bash
mkdir my-skill && cd my-skill
skillpm init
```

This creates `package.json` (with the `"agent-skill"` keyword) and `skills/<name>/SKILL.md`.

## SKILL.md format

The skill definition uses YAML frontmatter followed by Markdown instructions:

```yaml
---
name: my-skill
description: What this skill does and when to use it.
license: MIT                               # optional
compatibility: Requires Python 3.10+.      # optional, max 500 chars
allowed-tools: Bash Read                   # optional, space-delimited
---

# My Skill

## When to use this skill

Use this skill when the user wants to...

## Instructions

Step-by-step guide for the agent...
```

!!! important
    Version comes from `package.json` — do not duplicate it in SKILL.md.

## Adding dependencies

Instead of duplicating instructions, depend on other skills. A fullstack React skill doesn't need 200 lines about TypeScript best practices — it just depends on one:

```json
{
  "name": "fullstack-react",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "dependencies": {
    "react-patterns": "^2.0.0",
    "typescript-best-practices": "^1.3.0",
    "testing-with-vitest": "^1.0.0"
  }
}
```

Each skill stays small and focused. `skillpm install fullstack-react` resolves the entire tree in one step. npm handles resolution, lockfile, audit, and caching — just like any npm package.

## Bundling agent configs, rules, and prompts

A `SKILL.md` teaches agents *what to do* — it contains instructions that agents read at runtime. But some agent systems also use **config files** in specific directories: subagent definitions in `.claude/agents/`, rules in `.cursor/rules/`, instructions in `.github/instructions/`, etc.

The `configs/` directory lets you bundle these config files with your skill. It mirrors the workspace layout — whatever directory structure you put inside `configs/` gets copied to the workspace root on install.

```
my-skill/
├── package.json
├── skills/
│   └── my-skill/
│       └── SKILL.md             # Instructions agents read at runtime
└── configs/                      # Config files copied to workspace on install
    ├── .claude/
    │   ├── agents/reviewer.md       # Claude subagent
    │   └── rules/conventions.md     # Claude rules
    ├── .cursor/
    │   ├── agents/reviewer.md       # Cursor agent
    │   └── rules/conventions.md     # Cursor rules
    └── .github/
        ├── agents/reviewer.md       # Copilot agent
        └── instructions/conventions.instructions.md
```

!!! tip
    Not every skill needs `configs/`. If your skill is just instructions (SKILL.md), you don't need it. Use `configs/` when you want to ship subagent definitions, rules, or instructions in the native format of each agent system.

### How it works

On `skillpm install`, files from `configs/` are copied to the workspace root with an auto-prefix to prevent conflicts between skills.

The prefix is determined in this order:

1. **`skillpm.configPrefix`** in `package.json` — explicit short name (e.g. `react`)
2. **De-scoped package name** — `@scope/` is stripped automatically (e.g. `@acme/fullstack-react` → `fullstack-react`)

| Source | Destination |
|--------|-------------|
| `configs/.claude/agents/reviewer.md` | `.claude/agents/my-skill-reviewer.md` |
| `configs/.cursor/rules/conventions.md` | `.cursor/rules/my-skill-conventions.md` |
| `configs/.github/instructions/help.instructions.md` | `.github/instructions/my-skill-help.instructions.md` |

On `skillpm uninstall`, all copied files are removed automatically using the manifest at `.skillpm/manifest.json`.

### Shortening the prefix with `configPrefix`

For scoped packages or packages with long names, set `configPrefix` in the `skillpm` field to use a shorter prefix:

```json
{
  "name": "@acme/fullstack-react",
  "skillpm": {
    "configPrefix": "react"
  }
}
```

This gives `react-reviewer.md` instead of `fullstack-react-reviewer.md`.

### Supported targets

Only include targets your skill supports — you don't need to support every agent system.

| Directory | Agent System |
|-----------|-------------|
| `.claude/agents/` | Claude Code subagents |
| `.claude/rules/` | Claude Code rules |
| `.cursor/agents/` | Cursor agents |
| `.cursor/rules/` | Cursor rules |
| `.github/agents/` | GitHub Copilot agents |
| `.github/instructions/` | GitHub Copilot instructions |

### Including dotfiles in npm packages

Since `configs/` contains directories starting with `.`, you must list them in your `package.json` `files` field:

```json
{
  "files": [
    "skills/",
    "configs/"
  ]
}
```

## Declaring MCP servers

If your skill requires MCP servers, declare them in the `skillpm` field:

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "skillpm": {
    "mcpServers": [
      "@anthropic/mcp-server-filesystem",
      "https://mcp.context7.com/mcp"
    ]
  }
}
```

The `skillpm` field supports these options:

| Field | Type | Description |
|-------|------|-------------|
| `mcpServers` | `string[]` | MCP servers to configure via `add-mcp` on install |
| `configPrefix` | `string` | Override the prefix used for deployed `configs/` filenames. Defaults to the de-scoped package name. |

skillpm collects MCP server requirements from the entire dependency tree (transitively, deduplicated) and configures them via [`add-mcp`](https://github.com/neondatabase/add-mcp).

## Publishing

```bash
skillpm publish
```

This validates the `"agent-skill"` keyword is present, then delegates to `npm publish`.

Your skill will be discoverable on npmjs.org via [`keywords:agent-skill`](https://www.npmjs.com/search?q=keywords:agent-skill).

### Publishing checklist

- [ ] `package.json` has `"agent-skill"` in `keywords`
- [ ] `skills/<name>/SKILL.md` exists with valid frontmatter
- [ ] SKILL.md `name` field matches the directory name
- [ ] Version is set in `package.json` (not in SKILL.md)
- [ ] README.md describes the skill for humans on npmjs.org
- [ ] LICENSE file is included

### Scoped packages

For scoped packages (`@org/my-skill`), use `--access public`:

```bash
skillpm publish --access public
```

The skill directory name should be the unscoped name (e.g., `skills/my-skill/`).

## Validate before publishing

Use the [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref) validator to check your SKILL.md against the spec:

```bash
npx skills-ref validate skills/<name>
```

`skillpm publish` runs this automatically.

## Resources

- [Agent Skills spec](https://agentskills.io/specification) — the open standard for SKILL.md format
- [Example skills](https://github.com/anthropics/skills) — official examples from Anthropic
- [Agent Skills Registry](registry.md) — browse published skills for inspiration
- [skillpm Commands](commands.md) — full CLI reference
