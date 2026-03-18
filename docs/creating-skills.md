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

## Scaffold a new skill

```bash
mkdir my-skill && cd my-skill
skillpm init
```

This creates `package.json` (with the `"agent-skill"` keyword) and `skills/<name>/SKILL.md`.

## SKILL.md format

The skill definition uses YAML frontmatter followed by Markdown instructions:

```yaml
---
name: my-skill
description: What this skill does and when to use it.
license: MIT
compatibility: Requires Python 3.10+.
allowed-tools: Bash Read
---

# My Skill

## When to use this skill

Use this skill when the user wants to...

## Instructions

Step-by-step guide for the agent...
```

!!! important
    Version comes from `package.json` — do not duplicate it in `SKILL.md`.

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

This validates the `"agent-skill"` keyword and `SKILL.md`, then delegates to `npm publish`.

Your skill will be discoverable on npmjs.org via [`keywords:agent-skill`](https://www.npmjs.com/search?q=keywords:agent-skill).

### Publishing checklist

- `package.json` has `"agent-skill"` in `keywords`
- `skills/<name>/SKILL.md` exists with valid frontmatter
- `SKILL.md` `name` matches the directory name
- Version is set in `package.json`
- `README.md` describes the skill for humans on npmjs.org
- `LICENSE` is included

### Scoped packages

For scoped packages (`@org/my-skill`), use `--access public`:

```bash
skillpm publish --access public
```

The skill directory name should be the unscoped name (for example, `skills/my-skill/`).

## Validate before publishing

Use the [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref) validator to check your `SKILL.md` against the spec:

```bash
npx skills-ref validate skills/<name>
```

`skillpm publish` runs this automatically.

## Where APM fits

Use `skillpm` for reusable npm-distributed skills.

Use [APM](https://github.com/microsoft/apm) for full project agent configuration.

## Resources

- [Agent Skills spec](https://agentskills.io/specification)
- [Example skills](https://github.com/anthropics/skills)
- [Agent Skills Registry](registry.md)
- [skillpm Commands](commands.md)
