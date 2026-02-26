#!/usr/bin/env python3
"""Query npm registry for agent-skill packages and generate docs/registry.md."""

import json
import re
import urllib.request
from collections import Counter, OrderedDict
from datetime import datetime, timezone
from html import escape
from pathlib import Path

NPM_SEARCH_URL = "https://registry.npmjs.org/-/v1/search"
PAGE_SIZE = 250
OUTPUT_PATH = Path(__file__).parent.parent / "docs" / "registry.md"
EXCLUDED_KEYWORDS = {"agent-skill", "ai-skill", "oneskill", "skill", "skills"}

# Categories map a display name to a set of lowercase keyword/name tokens.
# Skills are assigned to the category with the most token matches.
CATEGORIES = OrderedDict([
    ("AI & Agents", {
        "icon": "🤖",
        "tokens": {
            "ai", "llm", "gpt", "claude", "openai", "chatbot", "nlp", "agent", "agents",
            "copilot", "machine-learning", "deep-learning", "neural", "transformer",
            "embedding", "rag", "generative-ai", "genai", "artificial-intelligence",
            "prompt", "prompting", "mcp", "langchain", "anthropic",
        },
    }),
    ("Code Quality", {
        "icon": "✨",
        "tokens": {
            "lint", "linter", "linting", "format", "formatter", "formatting", "prettier",
            "eslint", "code-review", "refactor", "refactoring", "clean-code",
            "code-quality", "style", "static-analysis", "code-style", "best-practices",
        },
    }),
    ("Testing", {
        "icon": "🧪",
        "tokens": {
            "test", "testing", "jest", "vitest", "mocha", "unittest", "unit-test",
            "e2e", "integration-test", "coverage", "tdd", "bdd", "cypress",
            "playwright", "selenium", "qa", "quality-assurance",
        },
    }),
    ("Documentation", {
        "icon": "📚",
        "tokens": {
            "docs", "documentation", "readme", "markdown", "jsdoc", "typedoc",
            "api-docs", "docstring", "wiki", "technical-writing", "changelog",
        },
    }),
    ("Web Development", {
        "icon": "🌐",
        "tokens": {
            "web", "react", "vue", "angular", "nextjs", "next", "frontend", "backend",
            "api", "rest", "graphql", "html", "css", "javascript", "typescript", "node",
            "nodejs", "express", "svelte", "tailwind", "webpack", "vite",
        },
    }),
    ("DevOps & CI/CD", {
        "icon": "🚀",
        "tokens": {
            "devops", "ci", "cd", "ci-cd", "cicd", "docker", "kubernetes", "k8s",
            "deploy", "deployment", "infrastructure", "terraform", "github-actions",
            "pipeline", "aws", "azure", "gcp", "cloud", "monitoring",
        },
    }),
    ("Security", {
        "icon": "🔒",
        "tokens": {
            "security", "vulnerability", "auth", "authentication", "authorization",
            "encryption", "secure", "owasp", "pentest", "penetration-testing",
            "cve", "audit", "compliance",
        },
    }),
    ("Data & Databases", {
        "icon": "📊",
        "tokens": {
            "data", "database", "sql", "nosql", "mongodb", "postgres", "postgresql",
            "mysql", "redis", "analytics", "etl", "data-science", "pandas",
            "visualization", "csv", "json", "xml", "parsing",
        },
    }),
    ("Productivity", {
        "icon": "⚡",
        "tokens": {
            "productivity", "automation", "workflow", "project-management", "tooling",
            "cli", "terminal", "shell", "git", "github", "vscode", "editor",
        },
    }),
])

OTHER_CATEGORY = {"name": "Other", "icon": "📦"}


def categorize_skill(obj):
    """Return the best-matching category name for a skill package."""
    pkg = obj["package"]
    # Collect tokens from keywords + name parts
    keywords = {kw.lower() for kw in pkg.get("keywords", [])}
    # Split package name on / @ - to get tokens (e.g. @scope/react-testing -> react, testing)
    name_parts = set(re.split(r"[@/\-_]", pkg.get("name", "").lower())) - {""}
    desc_lower = pkg.get("description", "").lower()
    tokens = keywords | name_parts

    best_cat = None
    best_score = 0

    for cat_name, cat_def in CATEGORIES.items():
        cat_tokens = cat_def["tokens"]
        # Count direct token matches
        score = len(tokens & cat_tokens)
        # Bonus: check if any category token appears in the description
        for t in cat_tokens:
            if len(t) > 2 and t in desc_lower:
                score += 0.5
        if score > best_score:
            best_score = score
            best_cat = cat_name

    return best_cat if best_cat else OTHER_CATEGORY["name"]


def fetch_packages():
    """Fetch all agent-skill packages, paginating through npm search API."""
    all_packages = []
    offset = 0
    total = None

    while True:
        url = f"{NPM_SEARCH_URL}?text=keywords:agent-skill&size={PAGE_SIZE}&from={offset}"
        req = urllib.request.Request(url, headers={"User-Agent": "skillpm-registry-generator"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())

        if total is None:
            total = data["total"]

        batch = data["objects"]
        if not batch:
            break

        all_packages.extend(batch)
        offset += len(batch)

        if offset >= total:
            break

    return all_packages, total


def format_downloads(n):
    if n >= 1000:
        return f"{n / 1000:.1f}k"
    return str(n)


def build_card(obj, category):
    pkg = obj["package"]
    name = escape(pkg["name"])
    desc = escape(pkg.get("description", ""))
    version = escape(pkg.get("version", ""))
    npm_url = pkg.get("links", {}).get("npm", f"https://www.npmjs.com/package/{pkg['name']}")
    publisher = escape(pkg.get("publisher", {}).get("username", ""))
    weekly = obj.get("downloads", {}).get("weekly", 0)
    score = obj.get("score", {}).get("final", 0)
    updated = pkg.get("date", "")

    keywords = [kw for kw in pkg.get("keywords", []) if kw.lower() not in EXCLUDED_KEYWORDS]
    keyword_html = ""
    if keywords:
        tags = "".join(
            f'<span class="registry-tag" data-keyword="{escape(kw)}">{escape(kw)}</span>'
            for kw in keywords[:8]
        )
        keyword_html = f'<div class="registry-tags">{tags}</div>'

    # Category badge
    cat_icon = CATEGORIES.get(category, {}).get("icon", OTHER_CATEGORY["icon"])
    cat_badge = f'<span class="registry-card-category" title="{escape(category)}">{cat_icon} {escape(category)}</span>'

    return f"""<div class="registry-card" data-name="{name}" data-description="{desc}" data-keywords="{escape(",".join(keywords))}" data-downloads="{weekly}" data-updated="{escape(updated)}" data-score="{score}" data-category="{escape(category)}">
  <div class="registry-card-header">
    <a href="{npm_url}" target="_blank" rel="noopener" class="registry-card-name">{name}</a>
    <span class="registry-card-version">v{version}</span>
  </div>
  {cat_badge}
  <p class="registry-card-desc">{desc}</p>
  {keyword_html}
  <div class="registry-card-meta">
    <span class="registry-card-downloads" title="Weekly downloads">⬇ {format_downloads(weekly)}/wk</span>
    <span class="registry-card-author" title="Publisher">{publisher}</span>
  </div>
</div>"""


def generate():
    packages, total = fetch_packages()
    # Keep npm's default sort order (search score: popularity + quality + maintenance)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Categorize each skill
    pkg_categories = []
    cat_counts = Counter()
    for obj in packages:
        cat = categorize_skill(obj)
        pkg_categories.append(cat)
        cat_counts[cat] += 1

    cards = "\n".join(build_card(obj, cat) for obj, cat in zip(packages, pkg_categories))

    # Build category filter buttons (only categories with skills, ordered by CATEGORIES)
    cat_buttons = '<button class="registry-category-btn active" data-category="all">All</button>'
    for cat_name in CATEGORIES:
        if cat_counts.get(cat_name, 0) > 0:
            icon = CATEGORIES[cat_name]["icon"]
            count = cat_counts[cat_name]
            cat_buttons += (
                f'<button class="registry-category-btn" data-category="{escape(cat_name)}">'
                f'{icon} {escape(cat_name)} <span class="registry-category-count">{count}</span></button>'
            )
    if cat_counts.get(OTHER_CATEGORY["name"], 0) > 0:
        count = cat_counts[OTHER_CATEGORY["name"]]
        cat_buttons += (
            f'<button class="registry-category-btn" data-category="{escape(OTHER_CATEGORY["name"])}">'
            f'{OTHER_CATEGORY["icon"]} {escape(OTHER_CATEGORY["name"])} '
            f'<span class="registry-category-count">{count}</span></button>'
        )

    # Collect top keywords for filter bar
    kw_counts = Counter()
    for obj in packages:
        for kw in obj["package"].get("keywords", []):
            if kw.lower() not in EXCLUDED_KEYWORDS:
                kw_counts[kw] += 1
    top_keywords = [kw for kw, _ in kw_counts.most_common(12) if kw_counts[kw] >= 2]
    filter_buttons = "".join(
        f'<button class="registry-filter-btn" data-keyword="{escape(kw)}">{escape(kw)}</button>'
        for kw in top_keywords
    )

    md = f"""---
hide:
  - navigation
description: Browse and search all agent skills published on npm. Find skills for Claude, Cursor, VS Code, Codex, and other AI agents.
---

# Agent Skills Registry

Browse agent skills published on npm with the `agent-skill` keyword.

<div class="registry-header">
  <div class="registry-controls">
    <div class="registry-search-bar">
      <input type="text" id="registry-search" placeholder="Search skills..." autocomplete="off" />
    </div>
    <div class="registry-sort">
      <select id="registry-sort-select">
        <option value="score">Relevance</option>
        <option value="downloads">Downloads</option>
        <option value="updated">Recently updated</option>
        <option value="name">Name</option>
      </select>
    </div>
  </div>
  <div class="registry-categories" id="registry-categories">
    {cat_buttons}
  </div>
  <div class="registry-filters" id="registry-filters">
    {filter_buttons}
  </div>
  <div class="registry-meta">
    <span id="registry-count">{len(packages)} skills</span> · Updated {now}
  </div>
</div>

<div class="registry-grid" id="registry-grid">
{cards}
</div>

<div class="registry-empty" id="registry-empty" style="display:none">
  No skills match your search.
</div>

<div class="registry-pagination" id="registry-pagination"></div>

!!! tip "Want to publish your own skill?"
    See the [Creating Skills](creating-skills.md) guide for the full packaging spec, or run `skillpm init` to scaffold a new skill package in seconds. Skills follow the open [Agent Skills spec](https://agentskills.io/specification).
"""

    OUTPUT_PATH.write_text(md, encoding="utf-8")
    print(f"Generated {OUTPUT_PATH} with {len(packages)} skills ({total} total on npm)")
    print(f"Categories: {dict(cat_counts.most_common())}")


if __name__ == "__main__":
    generate()
