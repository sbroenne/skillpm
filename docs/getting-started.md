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

Requires Node.js **22.20.0 or later** and npm. Publishing additionally requires
the official Python `skills-ref` validator on `PATH`; see
[validator setup](creating-skills.md#validate-before-publishing).

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

After `npm ci`, `npm update`, or editing a local workspace skill, run `skillpm sync`.
The upstream installer normally copies to `.agents/skills/` and links agent
directories to that canonical copy, so source edits do not appear automatically.

## Where APM fits

If you need full project agent configuration, use [APM](https://github.com/microsoft/apm). `skillpm` stays focused on npm-distributed skills.

## What's next?

- [Agent Skills Registry](registry.md) — browse available skills
- [Commands](commands.md) — full reference for all skillpm commands
- [Creating Skills](creating-skills.md) — build and publish your own skill package
