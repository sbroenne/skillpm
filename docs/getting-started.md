---
description: Install skillpm and start using agent skills in your projects. Works with npx or as a global install.
---

# Getting Started

## Installation

You can use skillpm directly with `npx` (no install required):

```bash
npx skillpm install <skill-name>
```

Or install globally for convenience:

```bash
npm install -g skillpm
```

Requires Node.js 18 or later.

## Install a skill

```bash
skillpm install <skill-name>
```

This will:

1. Install the skill (and all its dependencies) via npm
2. Scan for skill packages in `node_modules/`
3. Link each skill into agent directories via [`skills`](https://www.npmjs.com/package/skills) (Claude, Cursor, VS Code, Codex, and many more)
4. Configure any MCP servers declared by the skills via [`add-mcp`](https://github.com/neondatabase/add-mcp)

## Verify it worked

```bash
skillpm list
```

You should see the installed skills with their descriptions and MCP server requirements.

## Using skills in a project

Skills can be project-local (like npm dependencies):

```bash
mkdir my-project && cd my-project
npm init -y
skillpm install <skill-a> <skill-b>
```

This adds the skills as standard npm dependencies in `package.json`. Anyone who clones the project can run `skillpm install` to get the same skill set wired into their agents.

## What's next?

- [Agent Skills Registry](registry.md) — browse available skills
- [Commands](commands.md) — full reference for all skillpm commands
- [Creating Skills](creating-skills.md) — build and publish your own skill package
