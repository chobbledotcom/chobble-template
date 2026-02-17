# Stage 2 (v2): Client-Side Filtering Engine

## Goal

Create the core client-side engine that reads `data-filter-item`, filters items, sorts items, and visibly reorders the DOM. No full UI wiring yet.

## Prerequisites

- Stage 1 complete: product/property `<li>` elements include safe `data-filter-item`

## Success Criteria

- Engine parses filterable item data from DOM at page load
- Filter matching works with AND logic
- Sort works for default/price/name variants
- Sort visibly reorders list items in the DOM
- Non-matching items are hidden with `display: none`
- Unit tests pass for pure logic (plus focused DOM reorder test)

---

## Implementation Steps

### 1. Create filtering module

**File**: `/src/_lib/public/ui/category-filter.js` (NEW)

```javascript
import { onReady } from "#public/utils/on-ready.js";

const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

const filterToPath = (filters) => {
  const keys = Object.keys(filters).sort();
  if (keys.length === 0) return "";
  return keys
    .flatMap((k) => [encodeURIComponent(k), encodeURIComponent(filters[k])])
    .join("/");
};

const SORT_KEYS = {
  default: (a, b) => a.originalIndex - b.originalIndex,
  "price-asc": (a, b) => a.data.price - b.data.price,
  "price-desc": (a, b) => b.data.price - a.data.price,
  "name-asc": (a, b) => a.data.title.localeCompare(b.data.title),
  "name-desc": (a, b) => b.data.title.localeCompare(a.data.title),
};

const parseItemsFromDOM = (container) => {
  const list = container.closest(".products-layout")?.querySelector(".items");
  if (!list) return { list: null, items: [] };

  const items = [];
  for (const li of list.querySelectorAll("li[data-filter-item]")) {
    const data = JSON.parse(li.dataset.filterItem);
    items.push({ element: li, data, originalIndex: items.length });
  }

  return { list, items };
};

const itemMatchesFilters = (item, filters) => {
  for (const [key, value] of Object.entries(filters)) {
    if (item.data.filters[key] !== value) return false;
  }
  return true;
};

const applyFiltersAndSort = (allItems, itemsList, activeFilters, activeSortKey) => {
  const matched = allItems.filter((item) => itemMatchesFilters(item, activeFilters));
  const comparator = SORT_KEYS[activeSortKey] || SORT_KEYS.default;
  matched.sort(comparator);

  const matchedSet = new Set(matched);
  for (const item of allItems) {
    item.element.style.display = matchedSet.has(item) ? "" : "none";
  }

  if (itemsList) {
    for (const item of matched) {
      itemsList.append(item.element);
    }
  }

  return matched.length;
};

onReady(() => {
  const container = document.querySelector("[data-filter-container]");
  if (!container) return;

  const { list, items } = parseItemsFromDOM(container);

  window.__filter = {
    apply: (filters, sort) =>
      applyFiltersAndSort(items, list, filters || {}, sort || "default"),
    reset: () => applyFiltersAndSort(items, list, {}, "default"),
    items,
  };
});

export {
  normalize,
  filterToPath,
  parseItemsFromDOM,
  itemMatchesFilters,
  applyFiltersAndSort,
  SORT_KEYS,
};
```

**Key decisions:**

- Parsing is scoped to the active filter area, not global `document`.
- Sorting reorders DOM nodes (`append`) instead of only sorting arrays.
- `JSON.parse` stays fail-fast (invalid build output should throw visibly).

### 2. Add to bundle

**File**: `/src/_lib/public/bundle.js` (MODIFY)

```javascript
import "#public/ui/category-filter.js";
```

---

## Testing

### Unit tests

**File**: `/test/unit/ui/category-filter.test.js` (NEW)

Cover:

- `normalize`
- `filterToPath`
- `itemMatchesFilters`
- `SORT_KEYS`
- one DOM-focused test for `applyFiltersAndSort` confirming list order changes in the document

### Manual verification

1. `bun run build && bun run serve`
2. Open a category page and run `window.__filter.items` in console
3. Run `window.__filter.apply({ size: "small" })` and verify filtering
4. Run `window.__filter.apply({}, "price-asc")` and verify visible reorder
5. Run `window.__filter.apply({}, "default")` and verify original order restoration
6. Run `window.__filter.reset()` and verify all items visible

---

## Files changed

- Create: `/src/_lib/public/ui/category-filter.js`
- Create: `/test/unit/ui/category-filter.test.js`
- Modify: `/src/_lib/public/bundle.js`

## Rollback

Remove import from `bundle.js`, remove `category-filter.js`, remove its tests.
