# Commands

## `skillpm install [skill...]`

Install one or more skills and wire them into agent directories.

```bash
skillpm install my-skill                   # install a specific skill
skillpm install                            # install all deps from package.json
skillpm i skill-a skill-b                  # alias, multiple skills
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

## `skillpm list`

List all installed skill packages.

```bash
skillpm list
skillpm ls      # alias
```

Shows each skill's name, version (from `package.json`), description (from SKILL.md), and MCP server requirements.

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

Validates that `"agent-skill"` is present in `package.json` `keywords`, runs [`skills-ref validate`](https://github.com/agentskills/agentskills/tree/main/skills-ref) against the [Agent Skills spec](https://agentskills.io/specification), then delegates to `npm publish`. Your skill will appear in the [Skill Registry](registry.md) and on [npmjs.org](https://www.npmjs.com/search?q=keywords:agent-skill).

---

## `skillpm sync`

Re-scan and re-wire agent directories without reinstalling.

```bash
skillpm sync
```

Useful after manual changes to `node_modules/` or when agent directories need refreshing.

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
