import { applyFiltersAndSort } from "#public/ui/category-filter-engine.js";
import { onReady } from "#public/utils/on-ready.js";

onReady(() => {
  const container = document.querySelector("[data-filter-container]");
  if (!container) return;

  const list = container.closest(".products-layout")?.querySelector(".items");
  if (!list) return;

  const lis = list.querySelectorAll("li[data-filter-item]");
  const items = Array.from(lis, (li, index) => ({
    element: li,
    data: JSON.parse(li.dataset.filterItem),
    originalIndex: index,
  }));

  window.__filter = {
    apply: (filters, sort) =>
      applyFiltersAndSort(items, list, filters || {}, sort || "default"),
    reset: () => applyFiltersAndSort(items, list, {}, "default"),
    items,
  };
});
