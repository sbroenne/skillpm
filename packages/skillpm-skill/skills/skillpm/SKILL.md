---
name: skillpm
description: Install, list, update, scaffold, publish, and sync npm-distributed Agent Skills with skillpm. Use when managing skill dependencies, packaging skills for npm, or refreshing agent directories after dependency or local skill changes.
license: MIT
compatibility: Requires Node.js 22.20.0 or later and npm. Publishing also requires the official Python skills-ref executable on PATH.
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
- **Agent directory wiring.** skillpm uses `skills@1.7.0`; it normally copies to `.agents/skills/` and links agent directories to that copy. Run sync after npm updates or source edits.
- **Portable spec vs packaging.** The standard requires a directory with SKILL.md; npm metadata, `skills/<name>/`, and one skill per package are skillpm conventions.
- **Separate lockfiles.** `package-lock.json` resolves npm dependencies. Upstream `skills-lock.json` describes agent installations; do not use `skills update` to update npm-managed skills.
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

This removes the npm package and refreshes remaining skills, but does not delete
stale canonical copies. Review targets before using upstream `skills remove`
with the SKILL.md name, especially when source skills live under `skills/`.

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

Requires exactly one skill under `skills/`, validates the package structure and
SKILL.md using the official Python `skills-ref validate` executable on PATH,
then delegates to `npm publish`. The npm package named `skills-ref` is a
third-party port, not the official validator. See the
[validator setup guide](https://skillpm.dev/creating-skills/#validate-before-publishing).
Run `npm pack --dry-run` to check that skill resources will be published.

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
npx skillpm sync  # Refresh copied agent skills after updating npm dependencies
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
- SKILL.md requires a directory-matching lowercase name (1–64 characters, letters/numbers/hyphens, no repeated or edge hyphens) and description (1–1024 characters).
- Optional portable fields are `license`, `compatibility` (1–500 characters), string-valued `metadata`, and experimental space-separated `allowed-tools`.
- Keep SKILL.md under 500 lines; move details to referenced files. Spec validation is not a safety review.
- Keep the version in `package.json`; do not duplicate it in SKILL.md.

### Scaffold from scratch

```bash
mkdir my-skill && cd my-skill
npx skillpm init
# Replace the template instructions and install the official validator first
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
For Git/URL sources or global skill installs, use the upstream `skills` CLI or
host tooling rather than extending skillpm beyond npm-hosted packages.
