/**
 * Client-side filter UI helpers for category pages.
 *
 * Pure DOM-manipulation functions used by category-filter.js.
 * Extracted into a separate module for testability.
 */

import { itemMatchesFilters } from "#public/ui/category-filter-engine.js";
import { flatMap, pipe } from "#toolkit/fp/array.js";
import { fromPairs } from "#toolkit/fp/object.js";

/** Build a new filter object with the given link's filter key/value added */
export const addFilter = (filters, link) => ({
  ...filters,
  [link.dataset.filterKey]: link.dataset.filterValue,
});

/**
 * Build a lookup from filter key/value slugs to their display labels
 * by scanning data attributes on filter option links/spans.
 * @param {Element} container - The filter container element
 * @returns {Record<string, string>} Slug to display label map
 */
export const buildLabelLookup = (container) =>
  pipe(
    (el) => Array.from(el.querySelectorAll("[data-filter-key-label]")),
    flatMap((el) => [
      [el.dataset.filterKey, el.dataset.filterKeyLabel],
      [el.dataset.filterValue, el.dataset.filterValueLabel],
    ]),
    fromPairs,
  )(container);

const createPillLink = ({ text, dataset, ariaLabel }) => {
  const link = document.createElement("a");
  link.href = "#";
  Object.assign(link.dataset, dataset);
  if (ariaLabel) link.setAttribute("aria-label", ariaLabel);
  link.textContent = text;
  return link;
};

/**
 * Read active filters from server-rendered active filter pills.
 * Scans remove-filter links and finds corresponding active options.
 * @param {Element} container - The filter container element
 * @returns {Record<string, string>} Filter key to value map
 */
export const readInitialFilters = (container) =>
  Array.from(container.querySelectorAll("[data-remove-filter]")).reduce(
    (filters, el) => {
      const activeOption = container.querySelector(
        `[data-filter-key="${el.dataset.removeFilter}"].active, .active [data-filter-key="${el.dataset.removeFilter}"]`,
      );
      return activeOption
        ? Object.assign(filters, {
            [el.dataset.removeFilter]: activeOption.dataset.filterValue,
          })
        : filters;
    },
    {},
  );

/**
 * Read the initial sort key from the sort dropdown.
 * @param {Element} container - The filter container element
 * @returns {string} Current sort key or "default"
 */
export const readInitialSort = (container) => {
  const select = container.querySelector(".sort-select");
  if (!select) return "default";
  return select.options[select.selectedIndex]?.dataset.sortKey || "default";
};

/**
 * Rebuild active filter pills from current state.
 * @param {Element} pillContainer - The [data-active-filters] element
 * @param {Record<string, string>} activeFilters - Current active filters
 * @param {Record<string, string>} labelLookup - Slug to label lookup
 */
export const rebuildPills = (pillContainer, activeFilters, labelLookup) => {
  pillContainer.innerHTML = "";

  for (const [filterKey, filterValue] of Object.entries(activeFilters)) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = `${labelLookup[filterKey]}: ${labelLookup[filterValue]}`;
    const removeLink = createPillLink({
      text: "\u00d7",
      dataset: { removeFilter: filterKey },
      ariaLabel: `Remove ${labelLookup[filterKey]} filter`,
    });
    li.append(span, removeLink);
    pillContainer.append(li);
  }

  if (Object.keys(activeFilters).length > 0) {
    const li = document.createElement("li");
    const clearLink = createPillLink({
      text: "Clear all",
      dataset: { clearFilters: "" },
    });
    li.append(clearLink);
    pillContainer.append(li);
  }
};

/**
 * Toggle active class on filter option list items to reflect current state.
 * @param {Element} container - The filter container element
 * @param {Record<string, string>} activeFilters - Current active filters
 */
export const updateOptionActiveStates = (container, activeFilters) => {
  for (const el of container.querySelectorAll("[data-filter-key]")) {
    const li = el.closest("li");
    if (li) {
      li.classList.toggle(
        "active",
        activeFilters[el.dataset.filterKey] === el.dataset.filterValue,
      );
    }
  }
};

/**
 * Check if a single filter option should be visible.
 * Active options are always visible. Others are visible if they would
 * narrow or change the result set.
 * @param {Element} link - The option link element with data-filter-key/value
 * @param {Array} allItems - All filter items
 * @param {Record<string, string>} activeFilters - Current active filters
 * @param {number} currentMatchCount - Count of currently matching items
 * @returns {boolean} Whether the option should be visible
 */
export const isOptionVisible = (
  link,
  allItems,
  activeFilters,
  currentMatchCount,
) => {
  if (activeFilters[link.dataset.filterKey] === link.dataset.filterValue) {
    return true;
  }

  const hypothetical = addFilter(activeFilters, link);
  const count = allItems.filter((item) =>
    itemMatchesFilters(item, hypothetical),
  ).length;
  return (
    count > 0 &&
    (link.dataset.filterKey in activeFilters || count !== currentMatchCount)
  );
};

/**
 * Update visibility for all options in a single filter group.
 * @param {Element} group - The filter group element
 * @param {Array} allItems - All filter items
 * @param {Record<string, string>} activeFilters - Current active filters
 * @param {number} currentMatchCount - Count of currently matching items
 * @returns {number} Count of visible options
 */
export const updateGroupOptions = (
  group,
  allItems,
  activeFilters,
  currentMatchCount,
) =>
  Array.from(group.querySelectorAll("[data-filter-key]")).reduce(
    (count, link) => {
      const show = isOptionVisible(
        link,
        allItems,
        activeFilters,
        currentMatchCount,
      );
      link.closest("li").style.display = show ? "" : "none";
      return show ? count + 1 : count;
    },
    0,
  );

/**
 * Replay the loading spinner and content-fade animations.
 * Resets the CSS animations on .filter-spinner and .filtered-content
 * so the brief loading effect plays again on filter changes.
 * @param {Element|null} filteredItems - The .filtered-items container
 */
export const replayLoadingAnimation = (filteredItems) => {
  if (!filteredItems) return;
  const spinner = filteredItems.querySelector(".filter-spinner");
  const content = filteredItems.querySelector(".filtered-content");
  if (!spinner || !content) return;
  for (const el of [spinner, content]) {
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "";
  }
};

/**
 * Update option visibility based on feasibility.
 * Hides options that would produce zero results or the same result set.
 * Hides entire groups when all their options are hidden.
 * @param {Element} container - The filter container element
 * @param {Array} allItems - All filter items with data
 * @param {Record<string, string>} activeFilters - Current active filters
 * @param {number} currentMatchCount - Number of currently matching items
 */
export const updateOptionVisibility = (
  container,
  allItems,
  activeFilters,
  currentMatchCount,
) => {
  for (const group of container.querySelectorAll(".filter-groups > li")) {
    if (group.querySelector(".sort-select")) continue;
    const visible = updateGroupOptions(
      group,
      allItems,
      activeFilters,
      currentMatchCount,
    );
    group.style.display = visible > 0 ? "" : "none";
  }
};
