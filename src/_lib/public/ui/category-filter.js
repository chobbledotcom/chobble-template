import { applyFiltersAndSort } from "#public/ui/category-filter-engine.js";
import {
  buildLabelLookup,
  readInitialFilters,
  readInitialSort,
  rebuildPills,
  replayLoadingAnimation,
  updateOptionActiveStates,
  updateOptionVisibility,
} from "#public/ui/category-filter-ui.js";
import {
  buildFilterHash,
  parseFiltersFromHash,
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
  const filteredItems = list.closest(".filtered-items");

  const pillContainer =
    container.querySelector("[data-active-filters]") ||
    (() => {
      const ul = document.createElement("ul");
      ul.className = "filter-active";
      ul.dataset.activeFilters = "";
      container.prepend(ul);
      return ul;
    })();

  // Parse initial state from hash if present, else fall back to server-rendered state
  const hashState = parseFiltersFromHash(window.location.hash);
  const hasHashState =
    Object.keys(hashState.filters).length > 0 ||
    hashState.sortKey !== "default";

  const state = {
    activeFilters: hasHashState
      ? hashState.filters
      : readInitialFilters(container),
    activeSortKey: hasHashState
      ? hashState.sortKey
      : readInitialSort(container),
  };

  const renderFilterState = () => {
    const matchCount = applyFiltersAndSort(
      allItems,
      list,
      state.activeFilters,
      state.activeSortKey,
    );

    rebuildPills(pillContainer, state.activeFilters, labelLookup);
    updateOptionActiveStates(container, state.activeFilters);
    updateOptionVisibility(
      container,
      allItems,
      state.activeFilters,
      matchCount,
    );
  };

  // Track whether the current hash change was triggered by us
  // to avoid re-rendering on our own updates
  const hashGuard = { ours: false };

  const updateHash = () => {
    hashGuard.ours = true;
    window.location.hash = buildFilterHash(
      state.activeFilters,
      state.activeSortKey,
    );
  };

  const commitChange = () => {
    replayLoadingAnimation(filteredItems);
    renderFilterState();
    updateHash();
  };

  container.addEventListener("click", (e) => {
    const link = e.target.closest("[data-filter-key]");
    if (!link) return;

    e.preventDefault();

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

    commitChange();
  });

  container.addEventListener("click", (e) => {
    const removeLink = e.target.closest("[data-remove-filter]");
    if (!removeLink) return;

    e.preventDefault();
    state.activeFilters = omit([removeLink.dataset.removeFilter])(
      state.activeFilters,
    );
    commitChange();
  });

  container.addEventListener("click", (e) => {
    if (!e.target.closest("[data-clear-filters]")) return;

    e.preventDefault();
    state.activeFilters = {};
    state.activeSortKey = "default";
    commitChange();
  });

  container.addEventListener("change", (e) => {
    const select = e.target.closest(".sort-select");
    if (!select) return;

    if (!select.options[select.selectedIndex]?.dataset.sortKey) return;

    e.stopPropagation();
    state.activeSortKey = select.options[select.selectedIndex].dataset.sortKey;
    commitChange();
  });

  // Restore state on browser back/forward (hash changes)
  window.addEventListener("hashchange", () => {
    if (hashGuard.ours) {
      hashGuard.ours = false;
      return;
    }
    const parsed = parseFiltersFromHash(window.location.hash);
    state.activeFilters = parsed.filters;
    state.activeSortKey = parsed.sortKey;
    renderFilterState();
  });

  // Initial render
  renderFilterState();
});
