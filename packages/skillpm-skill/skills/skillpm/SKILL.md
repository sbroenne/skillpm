---
name: skillpm
description: Manage npm-distributed Agent Skill packages with skillpm.
license: MIT
allowed-tools: Bash Read Write Edit
---

# skillpm — Agent Skill Package Manager

## When to use this skill

Use this skill when the user wants to:

- Install, uninstall, or update Agent Skill packages
- Create a new Agent Skill package
- Publish an Agent Skill to npmjs.org
- List installed skills
- Re-wire agent directories after dependency or workspace changes

## Key concepts

- **skillpm wraps npm.** Skills live in `package.json`, `node_modules`, and `package-lock.json` like any other npm package.
- **One skill per npm package.** The skill itself lives in `skills/<name>/SKILL.md` inside the package.
- **Agent directory wiring.** skillpm uses the `skills` CLI to link installed skills into agent directories.
- **Focused scope.** skillpm manages reusable npm-distributed skills. For full project configuration, point users to APM.

## Commands

All commands can be run without global install via `npx skillpm <command>`.

### Install a skill

```bash
npx skillpm install <skill-name>
# Aliases: skillpm i, skillpm add
```

This runs `npm install`, scans `node_modules/` for skill packages, and links them into agent directories.

### Install all dependencies

```bash
npx skillpm install
```

Reads `package.json`, installs all dependencies, and wires discovered skills.

### Uninstall a skill

```bash
npx skillpm uninstall <skill-name>
# Aliases: skillpm rm, skillpm remove
```

### List installed skills

```bash
npx skillpm list
npx skillpm list --json
```

Shows installed skill packages with descriptions. Use `--json` for scripting.

### Scaffold a new skill

```bash
npx skillpm init
```

Creates `package.json` (with `"agent-skill"` in keywords) and `skills/<name>/SKILL.md` in the current directory.

### Publish a skill

```bash
npx skillpm publish
```

Validates the package structure and SKILL.md against the Agent Skills spec (via `skills-ref validate`), then delegates to `npm publish`.

### Re-wire agent directories

```bash
npx skillpm sync
```

Re-scans `node_modules/` and re-links all skills into agent directories without reinstalling.

### npm passthrough

Any command not handled by skillpm is passed through to npm:

```bash
npx skillpm outdated
npx skillpm audit
npx skillpm update
npx skillpm why <skill>
```

## Creating a skill package

### Package structure

```
my-skill/
├── package.json                 # keywords: ["agent-skill"], dependencies
├── README.md
├── LICENSE
└── skills/
    └── my-skill/
        ├── SKILL.md
        ├── scripts/
        ├── references/
        └── assets/
```

### package.json for a skill

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/acme/my-skill.git"
  },
  "dependencies": {
    "other-skill": "^1.0.0"
  }
}
```

- Skill dependencies go in standard `dependencies`.
- The `"agent-skill"` keyword is required for publishing.
- Use `git+https://` for `repository.url`.

### Scaffold from scratch

```bash
mkdir my-skill && cd my-skill
npx skillpm init
npx skillpm publish
```

### Wrap an existing skill for npm

If you already have `skills/<name>/SKILL.md`, add a `package.json` to make it publishable:

```bash
cd my-existing-skill/
npm init -y
```

Then edit `package.json` to add the required keyword:

```json
{
  "name": "my-existing-skill",
  "version": "1.0.0",
  "keywords": ["agent-skill"]
}
```

## Where APM fits

Use `skillpm` for reusable npm-distributed skills.

Use [APM](https://github.com/microsoft/apm) for full project agent configuration.
