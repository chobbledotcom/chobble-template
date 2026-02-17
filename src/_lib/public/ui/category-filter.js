import { applyFiltersAndSort } from "#public/ui/category-filter-engine.js";
import {
  buildLabelLookup,
  readInitialFilters,
  readInitialSort,
  rebuildPills,
  updateOptionActiveStates,
  updateOptionVisibility,
} from "#public/ui/category-filter-ui.js";
import {
  buildFilterURL,
  parseFiltersFromPath,
} from "#public/ui/category-filter-url.js";
import { onReady } from "#public/utils/on-ready.js";
import { omit } from "#toolkit/fp/object.js";

onReady(() => {
  const container = document.querySelector("[data-filter-container]");
  if (!container) return;

  const list = container.closest(".products-layout")?.querySelector(".items");
  if (!list) return;

  const lis = list.querySelectorAll("li[data-filter-item]");
  if (lis.length === 0) return;

  const allItems = Array.from(lis, (li, index) => ({
    element: li,
    data: JSON.parse(li.dataset.filterItem),
    originalIndex: index,
  }));

  const labelLookup = buildLabelLookup(container);
  const pillContainer = container.querySelector("[data-active-filters]");

  // Parse initial state from URL if present, else fall back to server-rendered state
  const urlState = parseFiltersFromPath(window.location.pathname);
  const hasUrlFilters =
    Object.keys(urlState.filters).length > 0 || urlState.sortKey !== "default";

  const state = {
    activeFilters: hasUrlFilters
      ? urlState.filters
      : readInitialFilters(container),
    activeSortKey: hasUrlFilters
      ? urlState.sortKey
      : readInitialSort(container),
    jsHasTakenOver: false,
  };

  const renderFilterState = () => {
    const matchCount = applyFiltersAndSort(
      allItems,
      list,
      state.activeFilters,
      state.activeSortKey,
    );

    if (state.jsHasTakenOver && pillContainer) {
      rebuildPills(pillContainer, state.activeFilters, labelLookup);
    }

    updateOptionActiveStates(container, state.activeFilters);
    updateOptionVisibility(
      container,
      allItems,
      state.activeFilters,
      matchCount,
    );
  };

  const pushURL = () => {
    const url = buildFilterURL(
      window.location.pathname,
      state.activeFilters,
      state.activeSortKey,
    );
    window.history.pushState(
      { filters: state.activeFilters, sortKey: state.activeSortKey },
      "",
      url,
    );
  };

  const takeOver = () => {
    if (!state.jsHasTakenOver) {
      state.jsHasTakenOver = true;
      if (!pillContainer) {
        const ul = document.createElement("ul");
        ul.className = "filter-active";
        ul.dataset.activeFilters = "";
        container.prepend(ul);
      }
    }
  };

  container.addEventListener("click", (e) => {
    const link = e.target.closest("[data-filter-key]");
    if (!link || link.tagName !== "A") return;

    e.preventDefault();
    takeOver();

    if (
      state.activeFilters[link.dataset.filterKey] === link.dataset.filterValue
    ) {
      state.activeFilters = omit([link.dataset.filterKey])(state.activeFilters);
    } else {
      state.activeFilters = {
        ...state.activeFilters,
        [link.dataset.filterKey]: link.dataset.filterValue,
      };
    }

    renderFilterState();
    pushURL();
  });

  container.addEventListener("click", (e) => {
    const removeLink = e.target.closest("[data-remove-filter]");
    if (!removeLink) return;

    e.preventDefault();
    takeOver();
    state.activeFilters = omit([removeLink.dataset.removeFilter])(
      state.activeFilters,
    );
    renderFilterState();
    pushURL();
  });

  container.addEventListener("click", (e) => {
    if (!e.target.closest("[data-clear-filters]")) return;

    e.preventDefault();
    takeOver();
    state.activeFilters = {};
    renderFilterState();
    pushURL();
  });

  container.addEventListener("change", (e) => {
    const select = e.target.closest(".sort-select");
    if (!select) return;

    if (!select.options[select.selectedIndex]?.dataset.sortKey) return;

    e.stopPropagation();
    takeOver();
    state.activeSortKey = select.options[select.selectedIndex].dataset.sortKey;
    renderFilterState();
    pushURL();
  });

  // Restore state on browser back/forward
  window.addEventListener("popstate", (e) => {
    takeOver();
    if (e.state?.filters) {
      state.activeFilters = e.state.filters;
      state.activeSortKey = e.state.sortKey || "default";
    } else {
      const parsed = parseFiltersFromPath(window.location.pathname);
      state.activeFilters = parsed.filters;
      state.activeSortKey = parsed.sortKey;
    }
    renderFilterState();
  });

  // Initial render
  renderFilterState();

  // Replace current history entry with state so back/forward works from the start
  window.history.replaceState(
    { filters: state.activeFilters, sortKey: state.activeSortKey },
    "",
    window.location.pathname,
  );
});
