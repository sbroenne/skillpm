/* Skill Registry — client-side search and keyword filtering */
(function () {
  "use strict";

  var search = document.getElementById("registry-search");
  var grid = document.getElementById("registry-grid");
  var empty = document.getElementById("registry-empty");
  var countEl = document.getElementById("registry-count");

  if (!search || !grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".registry-card"));
  var activeKeyword = null;

  function applyFilters() {
    var query = search.value.toLowerCase().trim();
    var visible = 0;

    cards.forEach(function (card) {
      var name = (card.getAttribute("data-name") || "").toLowerCase();
      var desc = (card.getAttribute("data-description") || "").toLowerCase();
      var keywords = (card.getAttribute("data-keywords") || "").toLowerCase();

      var matchesSearch = !query || name.indexOf(query) !== -1 || desc.indexOf(query) !== -1;
      var matchesKeyword =
        !activeKeyword || keywords.split(",").indexOf(activeKeyword) !== -1;

      if (matchesSearch && matchesKeyword) {
        card.style.display = "";
        visible++;
      } else {
        card.style.display = "none";
      }
    });

    if (countEl) countEl.textContent = visible + " skill" + (visible !== 1 ? "s" : "");
    if (empty) empty.style.display = visible === 0 ? "" : "none";
  }

  function setActiveKeyword(kw) {
    activeKeyword = activeKeyword === kw ? null : kw;

    // Update filter buttons
    var btns = document.querySelectorAll(".registry-filter-btn");
    btns.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-keyword") === activeKeyword);
    });

    // Update card tags
    var tags = document.querySelectorAll(".registry-tag");
    tags.forEach(function (tag) {
      tag.classList.toggle("active", tag.getAttribute("data-keyword") === activeKeyword);
    });

    applyFilters();
  }

  // Search input
  search.addEventListener("input", applyFilters);

  // Filter button clicks
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".registry-filter-btn");
    if (btn) {
      setActiveKeyword(btn.getAttribute("data-keyword"));
      return;
    }

    var tag = e.target.closest(".registry-tag");
    if (tag) {
      setActiveKeyword(tag.getAttribute("data-keyword"));
    }
  });
})();
