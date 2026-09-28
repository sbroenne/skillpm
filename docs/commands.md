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
2. Scans `node_modules/`, including nested dependencies, for packages containing `skills/*/SKILL.md`
3. Links each discovered skill into agent directories via [`skills@1.7.0`](https://github.com/vercel-labs/skills/releases/tag/v1.7.0)

Linking uses `skills add <path> -y --json`, leaving agent detection to upstream
rather than installing to all agents. A failed or unconfirmed installation
causes a nonzero exit. Conflicting `SKILL.md` names are rejected before linking;
use unique skill names or resolve duplicate npm versions first.

---

## `skillpm uninstall <skill...>`

Remove one or more skills.

```bash
skillpm uninstall my-skill
skillpm rm old-skill
skillpm remove another-skill
```

Runs `npm uninstall`, then refreshes the remaining skills. **It does not remove
the canonical copies of removed skills**: current upstream installs are copies,
not live links to `node_modules`. Review and remove stale agent installations
with the upstream `skills remove` command, using the `SKILL.md` name rather than
the npm package name. Check its targets carefully in repositories that keep
source skills in agent-discovery directories such as `skills/`.

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

Npm scopes are stripped and names normalized to the portable skill-name format.
An existing skill file is never overwritten. An existing npm `files` allowlist
is extended with `skills` so the scaffold can be included in the tarball.

---

## `skillpm publish`

Publish a skill package to npmjs.org.

```bash
skillpm publish
skillpm publish --access public
```

Validates that `"agent-skill"` is present in `package.json` `keywords` and exactly
one skill exists under `skills/`, runs the official Python
[`skills-ref validate`](https://github.com/agentskills/agentskills/tree/main/skills-ref)
from `PATH`, then delegates to `npm publish`.
See [validator setup](creating-skills.md#validate-before-publishing).
The npm package named `skills-ref` is not the official validator.

---

## `skillpm sync`

Re-scan and re-wire agent directories without reinstalling.

```bash
skillpm sync
```

Useful after `npm ci`, `npm update`, manual changes to `node_modules/`, or local
skill edits. Upstream normally copies into `.agents/skills/` and links agent
directories to that copy; edits in the npm source are not reflected until sync.
Sync refreshes installed skills but does not garbage-collect removed ones.

### Monorepo / npm workspace support

When your repo uses **npm workspaces**, npm creates symlinks inside `node_modules/` that point to your first-party skill packages:

```
node_modules/
  @org/
    my-skill → ../../skills/my-skill
```

`skillpm sync` detects these symlinks automatically. Each symlinked package is
treated as a **workspace package** and its current content is copied through the
upstream installer. Symlink targets are scanned once, even with dependency cycles.

---

## npm passthrough

Any command not listed above is passed through to npm:

```bash
skillpm outdated
skillpm audit
skillpm update
skillpm sync          # Refresh agent copies after the npm update
skillpm why my-skill
skillpm view my-skill
```

This lets `skillpm` feel like a focused npm companion instead of a separate package manager.
`package-lock.json` remains the source of truth for npm dependencies; upstream
`skills-lock.json` tracks agent installations separately. Use npm, not
`skills update`, to update npm-managed packages. Non-npm sources and global
skill installation belong to the upstream CLI or host-specific tools.
