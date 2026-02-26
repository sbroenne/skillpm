---
description: Install skillpm and start using agent skills in your projects.
---

# Getting Started

## Installation

You can use skillpm directly with `npx` (no install required):

```bash
npx skillpm install <skill-name>
```

Or install the CLI globally:

```bash
npm install -g skillpm
```

> **Note:** Skills themselves are always workspace-local (per-project). The `-g` flag above installs the `skillpm` CLI tool globally — not skills.

Requires Node.js 18 or later.

## Install a skill

```bash
skillpm install <skill-name>
```

skillpm handles everything: npm resolution, scanning for skills, wiring into agent directories, and configuring MCP servers. See [How it works](index.md#how-it-works) for details.

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
