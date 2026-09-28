---
description: How to create, package, validate, and publish an agent skill to npm. Includes the SKILL.md format, package structure, and publishing checklist.
---

# Creating Skills

Skills follow the open [Agent Skills spec](https://agentskills.io/specification). `skillpm` adds npm packaging conventions on top.

## Package structure

A skill is a standard npm package with the skill content in a `skills/<name>/` subdirectory:

```
my-skill/
├── package.json                 # npm metadata, deps, keywords: ["agent-skill"]
├── README.md                    # for humans on npmjs.org
├── LICENSE
└── skills/
    └── my-skill/
        ├── SKILL.md             # skill definition (required)
        ├── scripts/             # optional executable scripts
        ├── references/          # optional reference docs
        └── assets/              # optional templates/data
```

One skill per npm package. The skill directory name must match the `name` field in `SKILL.md` frontmatter.
The npm layout and keyword are skillpm conventions; the open standard itself
only requires a skill directory containing `SKILL.md`. Additional directories
beyond `scripts/`, `references/`, and `assets/` are allowed.

## Scaffold a new skill

```bash
mkdir my-skill && cd my-skill
skillpm init
```

This creates `package.json` (with the `"agent-skill"` keyword) and `skills/<name>/SKILL.md`.
The scaffold strips npm scopes, normalizes dots and underscores to hyphens,
and limits the skill name to 64 characters without renaming the npm package.
Existing `SKILL.md` content is preserved. If `package.json` already has a `files`
allowlist, `skills` is added to it.

## SKILL.md format

The skill definition uses YAML frontmatter followed by Markdown instructions:

```yaml
---
name: my-skill
description: What this skill does and when to use it.
license: MIT
compatibility: Requires Python 3.10+.
allowed-tools: Bash Read
metadata:
  author: example-org
---

# My Skill

## When to use this skill

Use this skill when the user wants to...

## Instructions

Step-by-step guide for the agent...
```

!!! important
    Version comes from `package.json` — do not duplicate it in `SKILL.md`.

### Portable frontmatter

| Field | Requirement |
|---|---|
| `name` | Required, 1–64 characters; lowercase letters, numbers, and hyphens; no leading, trailing, or consecutive hyphens; matches the skill directory |
| `description` | Required, 1–1024 characters; describes both what the skill does and when to use it |
| `license` | Optional license name or reference to a bundled license file |
| `compatibility` | Optional, 1–500 characters; runtime, product, system-package, or network requirements |
| `metadata` | Optional map of string keys to string values; quote numeric-looking values |
| `allowed-tools` | Optional space-separated string; experimental, with support varying by host |

Host-specific keys are not part of the portable contract. Tool permissions are
still controlled by the host; `allowed-tools` is not a universal security boundary.
The official validator is the source of truth for detailed naming and field checks.

Keep the main `SKILL.md` under 500 lines (and roughly 5,000 tokens); these are
authoring recommendations, not hard validation limits. Move detailed guidance to
`references/`, executable helpers to `scripts/`, and templates to `assets/`.
Use relative links and avoid deeply nested reference chains.

## Adding dependencies

Instead of duplicating instructions, depend on other skills:

```json
{
  "name": "fullstack-react",
  "version": "1.0.0",
  "keywords": ["agent-skill"],
  "dependencies": {
    "react-patterns": "^2.0.0",
    "typescript-best-practices": "^1.3.0",
    "testing-with-vitest": "^1.0.0"
  }
}
```

Each skill stays small and focused. `skillpm install fullstack-react` resolves the full tree in one step, while npm handles lockfiles, audit, and caching.

## Publishing

```bash
skillpm publish
```

This validates the `"agent-skill"` keyword, requires exactly one skill under
`skills/`, and runs the official `skills-ref` executable on `PATH`, then delegates
to `npm publish`. It fails with installation guidance if the validator is missing.

Your skill will be discoverable on npmjs.org via [`keywords:agent-skill`](https://www.npmjs.com/search?q=keywords:agent-skill).

### Publishing checklist

- `package.json` has `"agent-skill"` in `keywords`
- `skills/<name>/SKILL.md` exists with valid frontmatter
- `SKILL.md` `name` matches the directory name
- Version is set in `package.json`
- `README.md` describes the skill for humans on npmjs.org
- `LICENSE` is included
- `npm pack --dry-run` includes the skill and all referenced resources (check `files` and `.npmignore`)

### Scoped packages

For scoped packages (`@org/my-skill`), use `--access public`:

```bash
skillpm publish --access public
```

The skill directory name should be the unscoped name (for example, `skills/my-skill/`).

## Validate before publishing

Use the official [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref)
Python reference validator. It requires Python 3.11 or later. Install it in an
isolated environment and activate that environment before publishing:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install "git+https://github.com/agentskills/agentskills.git#subdirectory=skills-ref"
skills-ref validate skills/<name>
```

On Windows PowerShell, activate with `.venv\Scripts\Activate.ps1` instead.
The Git installation also requires Git. Keep `.venv/` out of version control and
the npm tarball. Alternatively, use `uv tool install` with the same Git URL and
ensure its executable directory is on `PATH`.

`skillpm publish` runs `skills-ref validate` automatically. **Do not use
`npx skills-ref` as a substitute**: that npm package is a separately maintained
TypeScript port, not the official reference implementation.
Upstream labels the reference library as demonstration software; validation
checks format compliance, not whether skill instructions or scripts are safe.
Review skills before installing or executing them.

The integration was checked against the [official specification](https://agentskills.io/specification)
and reference revision `69ef37e9424c0a7ea9dd2293b559e43ec8176379`
on September 27, 2026. CI pins that revision for reproducibility; local publishing
uses the version you installed on `PATH`.

## Where APM fits

Use `skillpm` for reusable npm-distributed skills.

Use [APM](https://github.com/microsoft/apm) for full project agent configuration.

## Resources

- [Agent Skills spec](https://agentskills.io/specification)
- [Example skills](https://github.com/anthropics/skills)
- [Agent Skills Registry](registry.md)
- [skillpm Commands](commands.md)
