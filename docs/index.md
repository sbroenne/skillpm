---
description: "skillpm — Package manager for Agent Skills. Built on npm. ~630 lines of code, 3 dependencies, zero reinvention."
---

# skillpm

**Package manager for Agent Skills. Built on npm.**

Without dependency management, skills become monoliths. Authors duplicate instructions because there's no way to say "just depend on that other skill." The [Agent Skills spec](https://agentskills.io) defines what a skill *is* — but not how to publish, install, version, or share them.

**skillpm** fills that gap. It's a lightweight orchestration layer — ~630 lines of code, 3 runtime dependencies — that maps Agent Skills onto npm's ecosystem. Small skills that compose, not monoliths that overlap.

| What's missing from the spec | What skillpm adds |
|---|---|
| No dependency management | Standard `package.json` `dependencies` — npm handles semver, lockfiles, audit |
| No registry | Publish to npmjs.org with `skillpm publish` |
| No install command | `skillpm install` resolves the full dependency tree |
| No versioning | npm semver, `package-lock.json`, reproducible installs |
| No agent wiring | Links skills into agent directories via [`skills`](https://www.npmjs.com/package/skills) |
| No MCP server config | Configures MCP servers transitively via [`add-mcp`](https://github.com/neondatabase/add-mcp) |

## Quick start

```bash
# Install a skill (no global install needed)
npx skillpm install <skill-name>

# List installed skills
npx skillpm list

# Scaffold a new skill package
npx skillpm init
```

Or install globally for convenience:

```bash
npm install -g skillpm
```

## How it works

When you run `skillpm install <skill>`:

1. **npm install** — npm handles resolution, download, lockfile, `node_modules/`
2. **Scan** — skillpm scans `node_modules/` for packages containing `skills/*/SKILL.md`
3. **Link** — for each skill found, skillpm calls [`skills`](https://www.npmjs.com/package/skills) to wire it into agent directories
4. **MCP config** — skillpm collects `skillpm.mcpServers` from all skills (transitively) and configures each via [`add-mcp`](https://github.com/neondatabase/add-mcp)

That's it. Agents see the full skill tree with MCP servers configured.

## Browse skills

Explore available skills in the [Agent Skills Registry](registry.md), or search directly on [npmjs.org](https://www.npmjs.com/search?q=keywords:agent-skill).

## Create your own skill

Ready to build and share a skill? See the [Creating Skills](creating-skills.md) guide — or just run:

```bash
mkdir my-skill && cd my-skill
skillpm init
```
