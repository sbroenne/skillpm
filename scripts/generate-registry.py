#!/usr/bin/env python3
"""Query npm registry for agent-skill packages and generate docs/registry.md."""

import json
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from html import escape
from pathlib import Path

NPM_SEARCH_URL = "https://registry.npmjs.org/-/v1/search"
PAGE_SIZE = 250
OUTPUT_PATH = Path(__file__).parent.parent / "docs" / "registry.md"
EXCLUDED_KEYWORDS = {"agent-skill", "ai-skill", "oneskill", "skill", "skills"}


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


def build_card(obj):
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

    return f"""<div class="registry-card" data-name="{name}" data-description="{desc}" data-keywords="{escape(",".join(keywords))}" data-downloads="{weekly}" data-updated="{escape(updated)}" data-score="{score}">
  <div class="registry-card-header">
    <a href="{npm_url}" target="_blank" rel="noopener" class="registry-card-name">{name}</a>
    <span class="registry-card-version">v{version}</span>
  </div>
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

    cards = "\n".join(build_card(obj) for obj in packages)

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
---

# Skill Registry

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


if __name__ == "__main__":
    generate()
