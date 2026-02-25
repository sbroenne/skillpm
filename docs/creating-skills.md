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
├── agents/                      # optional custom agent definitions
│   └── reviewer.md
└── prompts/                     # optional prompt/instruction files
    └── conventions.md
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

## Bundling agents

Skill packages can include custom agent definitions in an `agents/` directory. When installed, skillpm wires them into supported agent systems via [`add-agent`](https://github.com/sbroenne/add-agent).

```
my-skill/
├── package.json
├── skills/
│   └── my-skill/
│       └── SKILL.md
└── agents/
    └── code-reviewer.md         # agent definition
```

Agent files use YAML frontmatter (compatible with Claude Code and Cursor):

```yaml
---
name: code-reviewer
description: Reviews code for quality and security.
---

# Code Reviewer

## When to activate
Trigger when the user asks for code review...
```

`skillpm install` detects `agents/*.md` and runs `npx add-agent` to copy them into `.claude/agents/` and `.cursor/agents/`. `skillpm uninstall` cleans them up automatically.

## Bundling prompts

Skill packages can include prompt/instruction files in a `prompts/` directory. When installed, skillpm wires them into supported agent systems via [`add-prompt`](https://github.com/sbroenne/add-prompt).

```
my-skill/
├── package.json
├── skills/
│   └── my-skill/
│       └── SKILL.md
└── prompts/
    └── conventions.md           # prompt/instruction file
```

Prompt files are distributed to agents using two strategies:

| Agent System | Method |
|-------------|--------|
| GitHub Copilot (`.github/instructions/`) | File copy |
| Cursor (`.cursor/rules/`) | File copy |
| Claude Code (`CLAUDE.md`) | Section markers |
| Codex (`AGENTS.md`) | Section markers |
| Gemini CLI (`GEMINI.md`) | Section markers |

For single-file targets like `CLAUDE.md`, prompts are injected using HTML comment markers that allow clean updates and removal without disturbing existing content.

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
