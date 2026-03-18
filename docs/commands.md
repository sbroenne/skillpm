---
description: Full reference for skillpm CLI commands — install, uninstall, list, init, publish, and sync.
---

# Commands

## `skillpm install [skill...]`

Install one or more skills and wire them into agent directories.

```bash
skillpm install my-skill
skillpm install
skillpm i skill-a skill-b
skillpm add my-skill
```

**What happens:**

1. Runs `npm install` with the provided arguments
2. Scans `node_modules/` for packages containing `skills/*/SKILL.md`
3. Links each discovered skill into agent directories via [`skills`](https://www.npmjs.com/package/skills)

---

## `skillpm uninstall <skill...>`

Remove one or more skills.

```bash
skillpm uninstall my-skill
skillpm rm old-skill
skillpm remove another-skill
```

Runs `npm uninstall`, then re-wires agent directories to remove stale links.

---

## `skillpm list [--json]`

List all installed skill packages.

```bash
skillpm list
skillpm ls
skillpm list --json
```

Shows each skill's name, version (from `package.json`), description (from `SKILL.md`), and optional `legacy` / `workspace` flags.

Use `--json` for machine-readable output suitable for scripting and tooling.

---

## `skillpm init`

Scaffold a new skill package.

```bash
mkdir my-skill && cd my-skill
skillpm init
```

This will:

1. Run `npm init -y`
2. Add `"agent-skill"` to `keywords` in `package.json`
3. Create `skills/<name>/SKILL.md` with a template

---

## `skillpm publish`

Publish a skill package to npmjs.org.

```bash
skillpm publish
skillpm publish --access public
```

Validates that `"agent-skill"` is present in `package.json` `keywords`, runs [`skills-ref validate`](https://github.com/agentskills/agentskills/tree/main/skills-ref) against the [Agent Skills spec](https://agentskills.io/specification), then delegates to `npm publish`.

---

## `skillpm sync`

Re-scan and re-wire agent directories without reinstalling.

```bash
skillpm sync
```

Useful after manual changes to `node_modules/` or when agent directories need refreshing.

### Monorepo / npm workspace support

When your repo uses **npm workspaces**, npm creates symlinks inside `node_modules/` that point to your first-party skill packages:

```
node_modules/
  @org/
    my-skill → ../../skills/my-skill
```

`skillpm sync` detects these symlinks automatically. Each symlinked package is treated as a **workspace package** and linked from its workspace source.

---

## npm passthrough

Any command not listed above is passed through to npm:

```bash
skillpm outdated
skillpm audit
skillpm update
skillpm why my-skill
skillpm view my-skill
```

This lets `skillpm` feel like a focused npm companion instead of a separate package manager.
