# Getting Started

## Installation

You can use skillpm directly with `npx` (no install required):

```bash
npx skillpm install refactor-react
```

Or install globally for convenience:

```bash
npm install -g skillpm
```

Requires Node.js 18 or later.

## Install your first skill

```bash
skillpm install refactor-react
```

This will:

1. Install `refactor-react` (and all its dependencies) via npm
2. Scan for skill packages in `node_modules/`
3. Link each skill into your agent directories (Claude, Cursor, VS Code, Codex, etc.)
4. Configure any MCP servers declared by the skills

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
skillpm install react-patterns typescript-best-practices
```

This adds the skills as standard npm dependencies in `package.json`. Anyone who clones the project can run `skillpm install` to get the same skill set wired into their agents.

## What's next?

- [Commands](commands.md) — full reference for all skillpm commands
- [Creating Skills](creating-skills.md) — build and publish your own skill package
