---
description: >
  Fetch agent-skill packages from npm, use AI to categorize each skill,
  and generate the registry page with categories for skillpm.dev.

on:
  schedule:
    - cron: daily
  workflow_dispatch:

permissions:
  contents: read

tools:
  edit:
  bash: [":*"]
  web-fetch:

network:
  allowed:
    - defaults
    - node
    - python
    - github

timeout-minutes: 15

steps:
  - uses: actions/setup-python@v5
    with:
      python-version: "3.12"
  - run: pip install mkdocs-material

safe-outputs:
  create-pull-request:
    expires: 1d
    title-prefix: "[registry] "
    labels: [documentation, automation]
    draft: false
---

# Generate Agent Skills Registry

You are an AI agent that generates the Agent Skills Registry page for [skillpm.dev](https://skillpm.dev).
Your job is to fetch skill packages from npm, intelligently categorize each one, and generate
the final registry page with categories.

## Step 1: Fetch packages from npm

Run the fetch script to get all packages with the `agent-skill` keyword from npm:

```bash
python scripts/generate-registry.py --fetch-only > /tmp/packages.json 2>/tmp/fetch.log
cat /tmp/fetch.log
```

This outputs a JSON array of packages with `name`, `description`, `keywords`, and `version` fields.

## Step 2: Read packages and categorize them

Read `/tmp/packages.json`. For **each** package, assign it to exactly **one** category from this list:

| Category | Icon | What belongs here |
|---|---|---|
| AI & Agents | 🤖 | Skills about AI, LLMs, agents, prompts, MCP, embeddings, RAG, chatbots |
| Code Quality | ✨ | Linting, formatting, code review, refactoring, style enforcement |
| Testing | 🧪 | Test frameworks, coverage, TDD, E2E testing, test utilities |
| Documentation | 📚 | Doc generation, README tools, API docs, changelog automation |
| Web Development | 🌐 | Web frameworks (React, Vue, Angular), frontend, backend, APIs |
| DevOps & CI/CD | 🚀 | Docker, Kubernetes, deployment, CI pipelines, cloud infrastructure |
| Security | 🔒 | Security scanning, authentication, encryption, vulnerability detection |
| Data & Databases | 📊 | Databases, data processing, analytics, SQL, parsing, ETL |
| Productivity | ⚡ | General automation, CLI tools, git workflows, editor extensions |
| Other | 📦 | Anything that doesn't clearly fit the categories above |

### How to categorize

For each package, analyze:
1. **Package name** — often the strongest signal (e.g., `react-testing-skill` → Testing)
2. **Description** — read it carefully for domain hints
3. **Keywords** — check for category-related terms

Rules:
- If a package fits multiple categories, pick the **most specific** one (e.g., "React testing" → Testing, not Web Development)
- When in doubt, prefer the category that best serves a user browsing the registry
- Use "Other" only when no category is a reasonable fit
- Ignore generic keywords like "agent-skill", "ai-skill", "skill", "skills", "oneskill"

## Step 3: Write categories JSON

Write the categorization as a JSON object mapping package name → category name to `/tmp/categories.json`:

```json
{
  "package-name-1": "AI & Agents",
  "package-name-2": "Testing",
  "@scope/package": "Web Development"
}
```

Use the `edit` tool or bash to write this file. Make sure every package from Step 1 is included.

## Step 4: Generate the registry page

Run the build script with the categories file:

```bash
python scripts/generate-registry.py --categories /tmp/categories.json
```

This generates `docs/registry.md` with category badges on cards and category filter buttons.

## Step 5: Build and deploy docs

Build and deploy the documentation site:

```bash
mkdocs gh-deploy --force
```

## Step 6: Create a PR with updated registry

If the generated `docs/registry.md` has changed compared to what's in the repository,
use safe-outputs to create a pull request with the updated file so changes are tracked.

Only create a PR if the content has actually changed. Check with:

```bash
git diff --stat docs/registry.md
```
