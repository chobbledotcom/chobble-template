import { applyFiltersAndSort } from "#public/ui/category-filter-engine.js";
import {
  buildLabelLookup,
  readInitialFilters,
  readInitialSort,
  rebuildPills,
  updateOptionActiveStates,
  updateOptionVisibility,
} from "#public/ui/category-filter-ui.js";
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

  const state = {
    activeFilters: readInitialFilters(container),
    activeSortKey: readInitialSort(container),
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
  });

  container.addEventListener("click", (e) => {
    if (!e.target.closest("[data-clear-filters]")) return;

    e.preventDefault();
    takeOver();
    state.activeFilters = {};
    renderFilterState();
  });

  container.addEventListener("change", (e) => {
    const select = e.target.closest(".sort-select");
    if (!select) return;

    if (!select.options[select.selectedIndex]?.dataset.sortKey) return;

    e.stopPropagation();
    takeOver();
    state.activeSortKey = select.options[select.selectedIndex].dataset.sortKey;
    renderFilterState();
  });

  renderFilterState();
});
