/* Skill Registry — client-side search, keyword filtering, and pagination */
(function () {
  "use strict";

  var CARDS_PER_PAGE = 24;

  var search = document.getElementById("registry-search");
  var grid = document.getElementById("registry-grid");
  var empty = document.getElementById("registry-empty");
  var countEl = document.getElementById("registry-count");
  var paginationEl = document.getElementById("registry-pagination");

  if (!search || !grid) return;

  var allCards = Array.prototype.slice.call(grid.querySelectorAll(".registry-card"));
  var activeKeyword = null;
  var currentPage = 1;
  var filteredCards = allCards;

  function getFilteredCards() {
    var query = search.value.toLowerCase().trim();
    return allCards.filter(function (card) {
      var name = (card.getAttribute("data-name") || "").toLowerCase();
      var desc = (card.getAttribute("data-description") || "").toLowerCase();
      var keywords = (card.getAttribute("data-keywords") || "").toLowerCase();
      var matchesSearch = !query || name.indexOf(query) !== -1 || desc.indexOf(query) !== -1;
      var matchesKeyword = !activeKeyword || keywords.split(",").indexOf(activeKeyword) !== -1;
      return matchesSearch && matchesKeyword;
    });
  }

  function renderPage() {
    var totalPages = Math.max(1, Math.ceil(filteredCards.length / CARDS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * CARDS_PER_PAGE;
    var end = start + CARDS_PER_PAGE;
    var pageCards = new Set(filteredCards.slice(start, end));

    allCards.forEach(function (card) {
      card.style.display = pageCards.has(card) ? "" : "none";
    });

    if (countEl) countEl.textContent = filteredCards.length + " skill" + (filteredCards.length !== 1 ? "s" : "");
    if (empty) empty.style.display = filteredCards.length === 0 ? "" : "none";

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (!paginationEl) return;
    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }

    var html = '<button class="registry-page-btn" data-page="prev" ' +
      (currentPage <= 1 ? "disabled" : "") + '>&laquo; Prev</button>';

    // Show page numbers with ellipsis for large ranges
    var pages = getPageRange(currentPage, totalPages);
    pages.forEach(function (p) {
      if (p === "...") {
        html += '<span class="registry-page-ellipsis">…</span>';
      } else {
        html += '<button class="registry-page-btn' +
          (p === currentPage ? " active" : "") +
          '" data-page="' + p + '">' + p + '</button>';
      }
    });

    html += '<button class="registry-page-btn" data-page="next" ' +
      (currentPage >= totalPages ? "disabled" : "") + '>Next &raquo;</button>';

    paginationEl.innerHTML = html;
  }

  function getPageRange(current, total) {
    if (total <= 7) {
      var all = [];
      for (var i = 1; i <= total; i++) all.push(i);
      return all;
    }
    var pages = [1];
    if (current > 3) pages.push("...");
    for (var j = Math.max(2, current - 1); j <= Math.min(total - 1, current + 1); j++) {
      pages.push(j);
    }
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  }

  function applyFilters() {
    currentPage = 1;
    filteredCards = getFilteredCards();
    renderPage();
  }

  function setActiveKeyword(kw) {
    activeKeyword = activeKeyword === kw ? null : kw;

    document.querySelectorAll(".registry-filter-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-keyword") === activeKeyword);
    });
    document.querySelectorAll(".registry-tag").forEach(function (tag) {
      tag.classList.toggle("active", tag.getAttribute("data-keyword") === activeKeyword);
    });

    applyFilters();
  }

  // Search input
  search.addEventListener("input", applyFilters);

  // Click delegation for filter buttons, tags, and pagination
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".registry-filter-btn");
    if (btn) {
      setActiveKeyword(btn.getAttribute("data-keyword"));
      return;
    }

    var tag = e.target.closest(".registry-tag");
    if (tag) {
      setActiveKeyword(tag.getAttribute("data-keyword"));
      return;
    }

    var pageBtn = e.target.closest(".registry-page-btn");
    if (pageBtn && !pageBtn.disabled) {
      var page = pageBtn.getAttribute("data-page");
      var totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);
      if (page === "prev") currentPage = Math.max(1, currentPage - 1);
      else if (page === "next") currentPage = Math.min(totalPages, currentPage + 1);
      else currentPage = parseInt(page, 10);
      renderPage();
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // Initial render
  applyFilters();
})();
