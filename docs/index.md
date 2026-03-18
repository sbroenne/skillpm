---
description: "skillpm — npm-native package manager for reusable Agent Skills."
---

# skillpm

**npm-native package manager for Agent Skills.**

The [Agent Skills spec](https://agentskills.io) defines what a skill *is* — but not how to publish, install, version, or share it through npm. `skillpm` fills that gap by mapping reusable Agent Skills onto the npm ecosystem.

| What's missing from the spec | What skillpm adds |
|---|---|
| No dependency management | Standard `package.json` `dependencies` — npm handles semver, lockfiles, audit |
| No registry | Publish to npmjs.org with `skillpm publish` |
| No install command | `skillpm install` resolves the skill dependency tree |
| No versioning | npm semver, `package-lock.json`, reproducible installs |
| No agent wiring | Links skills into agent directories via [`skills`](https://www.npmjs.com/package/skills) |

## Quick start

```bash
# Install a skill (no global install needed)
npx skillpm install <skill-name>

# List installed skills
npx skillpm list

# Scaffold a new skill package
npx skillpm init
```

Or install the CLI globally:

```bash
npm install -g skillpm
```

> **Note:** Skills are always workspace-local. This installs the `skillpm` CLI — not skills.

## How it works

When you run `skillpm install <skill>`:

1. **npm install** — npm handles resolution, download, lockfile, `node_modules/`
2. **Scan** — skillpm scans `node_modules/` for packages containing `skills/*/SKILL.md`
3. **Link** — for each skill found, skillpm calls [`skills`](https://www.npmjs.com/package/skills) to wire it into agent directories

That is the whole scope: package, install, publish, and link reusable skills.

## Browse skills

Explore available skills in the [Agent Skills Registry](registry.md), or search directly on [npmjs.org](https://www.npmjs.com/search?q=keywords:agent-skill).

## Where APM fits

- Use **skillpm** for reusable npm-distributed skills.
- Use **[APM](https://github.com/microsoft/apm)** for full project agent configuration.

## Create your own skill

Ready to build and share a skill? See the [Creating Skills](creating-skills.md) guide — or just run:

```bash
mkdir my-skill && cd my-skill
skillpm init
```
