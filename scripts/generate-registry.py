#!/usr/bin/env python3
"""Query npm registry for agent-skill packages and generate docs/registry.md.

Usage:
  # Fetch packages from npm and write JSON (for agentic workflow):
  python generate-registry.py --fetch-only > packages.json

  # Build registry.md using AI-generated categories:
  python generate-registry.py --categories categories.json

  # Build registry.md without categories (fallback):
  python generate-registry.py
"""

import argparse
import json
import sys
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from html import escape
from pathlib import Path

NPM_SEARCH_URL = "https://registry.npmjs.org/-/v1/search"
PAGE_SIZE = 250
OUTPUT_PATH = Path(__file__).parent.parent / "docs" / "registry.md"
EXCLUDED_KEYWORDS = {"agent-skill", "ai-skill", "oneskill", "skill", "skills"}

CATEGORY_ICONS = {
    "AI & Agents": "🤖",
    "Code Quality": "✨",
    "Testing": "🧪",
    "Documentation": "📚",
    "Web Development": "🌐",
    "DevOps & CI/CD": "🚀",
    "Security": "🔒",
    "Data & Databases": "📊",
    "Productivity": "⚡",
    "Other": "📦",
}

CATEGORY_ORDER = list(CATEGORY_ICONS.keys())


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


def build_card(obj, category=None):
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

    # Category badge and data attribute
    cat_attr = ""
    cat_badge = ""
    if category:
        cat_icon = CATEGORY_ICONS.get(category, "📦")
        cat_badge = f'<span class="registry-card-category" title="{escape(category)}">{cat_icon} {escape(category)}</span>'
        cat_attr = f' data-category="{escape(category)}"'

    return f"""<div class="registry-card" data-name="{name}" data-description="{desc}" data-keywords="{escape(",".join(keywords))}" data-downloads="{weekly}" data-updated="{escape(updated)}" data-score="{score}"{cat_attr}>
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


def build_category_buttons(cat_counts):
    """Build HTML for category filter buttons."""
    buttons = '<button class="registry-category-btn active" data-category="all">All</button>'
    for cat_name in CATEGORY_ORDER:
        count = cat_counts.get(cat_name, 0)
        if count > 0:
            icon = CATEGORY_ICONS[cat_name]
            buttons += (
                f'<button class="registry-category-btn" data-category="{escape(cat_name)}">'
                f'{icon} {escape(cat_name)} <span class="registry-category-count">{count}</span></button>'
            )
    return buttons


def generate(packages, categories=None):
    """Generate registry.md from packages and optional category mapping."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Build cards with optional categories
    has_categories = bool(categories)
    cat_counts = Counter()

    card_list = []
    for obj in packages:
        pkg_name = obj["package"]["name"]
        cat = categories.get(pkg_name) if categories else None
        if cat:
            cat_counts[cat] += 1
        card_list.append(build_card(obj, cat))

    cards = "\n".join(card_list)

    # Category filter bar (only if categories are provided)
    cat_section = ""
    if has_categories and cat_counts:
        cat_buttons = build_category_buttons(cat_counts)
        cat_section = f"""  <div class="registry-categories" id="registry-categories">
    {cat_buttons}
  </div>"""

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
{cat_section}
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
    cat_info = f" Categories: {dict(cat_counts.most_common())}" if cat_counts else ""
    print(f"Generated {OUTPUT_PATH} with {len(packages)} skills.{cat_info}")


def main():
    parser = argparse.ArgumentParser(description="Generate the Agent Skills Registry page.")
    parser.add_argument(
        "--fetch-only",
        action="store_true",
        help="Fetch packages from npm and print JSON to stdout (for agentic workflow).",
    )
    parser.add_argument(
        "--packages",
        type=str,
        help="Path to a JSON file with pre-fetched packages (skip npm fetch).",
    )
    parser.add_argument(
        "--categories",
        type=str,
        help="Path to a JSON file mapping package names to categories.",
    )
    args = parser.parse_args()

    if args.fetch_only:
        packages, total = fetch_packages()
        # Output compact JSON: list of {name, description, keywords, version}
        summary = []
        for obj in packages:
            pkg = obj["package"]
            summary.append({
                "name": pkg["name"],
                "description": pkg.get("description", ""),
                "keywords": pkg.get("keywords", []),
                "version": pkg.get("version", ""),
            })
        json.dump(summary, sys.stdout, indent=2)
        sys.stdout.flush()
        print(f"{len(packages)} packages fetched ({total} total on npm)", file=sys.stderr)
        return

    # Load packages
    if args.packages:
        with open(args.packages, encoding="utf-8") as f:
            raw = json.load(f)
        # raw can be either the full npm objects or our summary format
        # If it's full npm objects, use as-is; otherwise we need to re-fetch
        if raw and isinstance(raw[0], dict) and "package" in raw[0]:
            packages = raw
        else:
            # Summary format or empty — need full data for card building
            packages, _ = fetch_packages()
    else:
        packages, _ = fetch_packages()

    # Load categories
    categories = None
    if args.categories:
        with open(args.categories, encoding="utf-8") as f:
            categories = json.load(f)

    generate(packages, categories)


if __name__ == "__main__":
    main()
