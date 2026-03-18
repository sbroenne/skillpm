---
description: Install skillpm and start using reusable Agent Skills in your projects.
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

skillpm runs `npm install`, scans for installed skills, and links discovered skills into agent directories.

## Verify it worked

```bash
skillpm list
```

You should see the installed skills with their descriptions.

## Using skills in a project

Skills behave like npm dependencies:

```bash
mkdir my-project && cd my-project
npm init -y
skillpm install <skill-a> <skill-b>
```

This adds the skills as standard npm dependencies in `package.json`. Anyone who clones the project can run `skillpm install` to get the same skill set installed and linked.

## Where APM fits

If you need full project agent configuration, use [APM](https://github.com/microsoft/apm). `skillpm` stays focused on npm-distributed skills.

## What's next?

- [Agent Skills Registry](registry.md) — browse available skills
- [Commands](commands.md) — full reference for all skillpm commands
- [Creating Skills](creating-skills.md) — build and publish your own skill package
