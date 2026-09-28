# skillpm — npm-native package manager for Agent Skills

[![npm](https://img.shields.io/npm/v/skillpm)](https://www.npmjs.com/package/skillpm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docs](https://img.shields.io/badge/docs-skillpm.dev-blue)](https://skillpm.dev)

The [Agent Skills spec](https://agentskills.io) defines what a skill is, but not how to publish, install, version, or share it through npm. `skillpm` fills that gap.

**skillpm** keeps Agent Skills inside the normal npm model: `package.json`, `node_modules`, lockfiles, semver, and the npm registry.

For full project-wide agent configuration, use [APM](https://github.com/microsoft/apm).

## Quick start

Requires **Node.js 22.20.0 or later** and npm. Publishing also requires the
[official Python `skills-ref` validator](https://skillpm.dev/creating-skills/#validate-before-publishing)
on `PATH`; installing and syncing skills do not require Python.

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

1. **npm install** — npm handles resolution, download, lockfile, and `node_modules/`
2. **Scan** — skillpm scans `node_modules/`, including nested dependencies, for packages containing `skills/*/SKILL.md`
3. **Link** — for each skill found, skillpm calls [`skills`](https://www.npmjs.com/package/skills) to wire it into supported agent directories

That is the whole scope: package, install, publish, and link reusable skills.

The linking integration uses **`skills@1.7.0`**, verified against the upstream
[release](https://github.com/vercel-labs/skills/releases/tag/v1.7.0).
It normally copies skill content into `.agents/skills/` and links agent-specific
directories to that canonical copy. These are not live links to `node_modules`:
run `skillpm sync` after `npm update`, `npm ci`, or local skill edits.
Agent discovery and installation paths remain the responsibility of `skills`;
skillpm does not install to every agent with `--all`.

`package-lock.json` remains authoritative for npm package versions. Any
`skills-lock.json` written by the upstream CLI describes agent installations,
not npm dependency resolution. Use npm to update npm-distributed skills, then
sync; do not substitute `skills update` for npm updates.

Linking failures now cause a nonzero exit. Packages with colliding `SKILL.md`
names are rejected before linking so nested versions cannot overwrite each other.

## What skillpm adds

| The spec doesn't define... | skillpm adds... |
|---|---|
| A registry | Publish to npmjs.org with `skillpm publish` |
| An install command | `skillpm install` resolves the skill dependency tree |
| Dependency management | Standard `package.json` `dependencies` — npm handles semver, lockfiles, audit |
| Versioning | npm semver, `package-lock.json`, reproducible installs |
| Agent wiring | Links installed skills into agent directories via [`skills`](https://www.npmjs.com/package/skills) |

## Commands

| Command | Description |
|---|---|
| `skillpm install [skill...]` | Install skill(s) + dependency tree, then wire them into agent dirs |
| `skillpm uninstall <skill...>` | Remove skill(s) |
| `skillpm list [--json]` | List installed skill packages |
| `skillpm init` | Scaffold a new skill package |
| `skillpm publish` | Publish to npmjs.org (validates the Agent Skills spec) |
| `skillpm sync` | Re-wire agent directories without reinstalling |
| `skillpm <npm-command> [args]` | Any other command is passed through to npm |

Aliases: `i`/`add` for `install`, `rm`/`remove` for `uninstall`, `ls` for `list`.

## Monorepo / npm workspace support

If your repo is an **npm workspace monorepo** where each skill is a first-party package, npm installs them as symlinks inside `node_modules/`.

```text
node_modules/
  @org/
    my-skill → ../../skills/my-skill
```

`skillpm sync` (and `skillpm install`) detects these symlinks and treats them as workspace packages, so contributors can regenerate linked skills after editing local packages.

## Creating a skill

```bash
mkdir my-skill && cd my-skill
skillpm init
```

See the full [Creating Skills](https://skillpm.dev/creating-skills/) guide for package structure, SKILL.md format, dependencies, and publishing.

## What are Agent Skills?

Agent Skills are modular, reusable packages of instructions, scripts, and resources that AI agents can dynamically load to extend their capabilities. They follow an [open standard](https://agentskills.io) adopted by Claude, Codex, Cursor, Gemini CLI, Augment, and others.

The portable format is a directory containing `SKILL.md`. The `skills/<name>/`
layout, npm keyword, and one-skill-per-package rule are **skillpm conventions**,
not requirements imposed by the open standard. Host-specific frontmatter and
tool permissions are not universally portable; see the [specification](https://agentskills.io/specification).

For Git repositories, direct-download URLs, global installation, and other
non-npm sources, use the [upstream `skills` CLI](https://github.com/vercel-labs/skills)
or the host's own tooling. These are not new package sources for skillpm.

## Where APM fits

- Use `skillpm` for reusable npm-distributed skills.
- Use [APM](https://github.com/microsoft/apm) for full project agent configuration.

## Development

```bash
npm install
npm run build
npm test
npm run lint
```

## License

MIT
