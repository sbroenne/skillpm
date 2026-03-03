---
description: Full reference for all skillpm CLI commands — install, uninstall, list, init, publish, sync, and MCP server configuration.
---

# Commands

## `skillpm install [skill...]`

Install one or more skills and wire them into agent directories.

```bash
skillpm install my-skill                   # install a specific skill
skillpm install                            # install all deps from package.json
skillpm i skill-a skill-b                  # alias, multiple skills
skillpm add my-skill                       # alias (matches npm add)
```

**What happens:**

1. Runs `npm install` with the provided arguments
2. Scans `node_modules/` for packages containing `skills/*/SKILL.md`
3. Links each skill into agent directories via [`skills`](https://www.npmjs.com/package/skills)
4. Collects `skillpm.mcpServers` from all skills (transitively, deduplicated)
5. Configures each MCP server via [`add-mcp`](https://github.com/neondatabase/add-mcp)

---

## `skillpm uninstall <skill...>`

Remove one or more skills and clean up agent directories.

```bash
skillpm uninstall my-skill
skillpm rm old-skill             # alias
skillpm remove another-skill     # alias
```

Runs `npm uninstall`, then re-wires agent directories to remove stale links.

---

## `skillpm list [--json]`

List all installed skill packages.

```bash
skillpm list
skillpm ls          # alias
skillpm list --json # machine-readable JSON output
```

Shows each skill's name, version (from `package.json`), description (from SKILL.md), and MCP server requirements.

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
skillpm publish --access public    # for scoped packages
```

Validates that `"agent-skill"` is present in `package.json` `keywords`, runs [`skills-ref validate`](https://github.com/agentskills/agentskills/tree/main/skills-ref) against the [Agent Skills spec](https://agentskills.io/specification), then delegates to `npm publish`. Your skill will appear in the [Agent Skills Registry](registry.md) and on [npmjs.org](https://www.npmjs.com/search?q=keywords:agent-skill).

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
    my-skill → ../../skills/my-skill   ← npm workspace symlink
```

`skillpm sync` detects these symlinks automatically. Each symlinked package is treated as a **workspace package** — its `configs/` directory is copied into the workspace root, regenerating all deployed agent definitions, prompts, and rules. Workspace packages are tagged in output:

```
ℹ Linking workspace package @org/my-skill@1.0.0 into agent directories
ℹ Copying config files from workspace package @org/my-skill@1.0.0
```

**Contributor workflow for in-repo skill monorepos:**

1. Edit source files in `skills/<name>/configs/`
2. Run `skillpm sync` to regenerate deployed copies
3. Commit the regenerated files

---

## `skillpm mcp add <source...>`

Configure one or more MCP servers across agents.

```bash
skillpm mcp add @anthropic/mcp-server-filesystem
skillpm mcp add https://mcp.context7.com/mcp
```

Delegates to [`add-mcp`](https://github.com/neondatabase/add-mcp).

---

## `skillpm mcp list`

List configured MCP servers.

```bash
skillpm mcp list
```

!!! note
    This currently directs you to check agent config files directly (`.cursor/mcp.json`, etc.) as `add-mcp` doesn't yet support listing.

---

## npm passthrough

Any command not listed above is passed through to npm:

```bash
skillpm outdated          # → npm outdated
skillpm audit             # → npm audit
skillpm update            # → npm update
skillpm why my-skill      # → npm why my-skill
skillpm view my-skill     # → npm view my-skill
```

This means skillpm is a superset of npm — all npm commands work transparently.
