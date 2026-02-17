# Stage 2: Client-Side Filtering Engine

## Goal

Create the core JavaScript module that reads data attributes, filters items, sorts them, and shows/hides via `display: none`. No UI wiring yet - just the engine with a temporary console API for manual testing.

## Prerequisites

- Stage 1 complete: `data-filter-item` attributes present on filterable `<li>` elements

## Success Criteria

- JS parses all product data from DOM on page load
- Filtering correctly matches items against filter criteria
- Sorting correctly orders by price/name/DOM-position
- Show/hide works via `style.display`
- Unit tests pass for all pure functions
- No console errors

---

## Implementation Steps

### 1. Create the filtering module

**File**: `/src/_lib/public/ui/category-filter.js` (NEW)

```javascript
import { onReady } from "#public/utils/on-ready.js";

// ── Pure functions (inlined to avoid pulling server-side modules into bundle) ──

// Mirrors filter-core.js normalize(), but we inline it here because
// filter-core.js imports #toolkit/fp/array.js, #toolkit/fp/memoize.js, etc.
// which are server-only modules that would bloat or break the client bundle.
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

// Mirrors filter-core.js filterToPath() - sorted key/value pairs joined by /
const filterToPath = (filters) => {
  const keys = Object.keys(filters).sort();
  if (keys.length === 0) return "";
  return keys.flatMap((k) => [encodeURIComponent(k), encodeURIComponent(filters[k])]).join("/");
};

// ── Sort comparators ──

const SORT_KEYS = {
  "default": (a, b) => a.order - b.order,
  "price-asc": (a, b) => a.data.price - b.data.price,
  "price-desc": (a, b) => b.data.price - a.data.price,
  "name-asc": (a, b) => a.data.title.localeCompare(b.data.title),
  "name-desc": (a, b) => b.data.title.localeCompare(a.data.title),
};

// ── Core logic ──

const parseItemsFromDOM = () => {
  const items = [];
  for (const li of document.querySelectorAll("li[data-filter-item]")) {
    const data = JSON.parse(li.dataset.filterItem);
    items.push({ element: li, data, order: items.length });
  }
  return items;
};

const itemMatchesFilters = (item, filters) => {
  for (const [key, value] of Object.entries(filters)) {
    if (item.data.filters[key] !== value) return false;
  }
  return true;
};

const applyFiltersAndSort = (allItems, activeFilters, activeSortKey) => {
  const matched = allItems.filter((item) => itemMatchesFilters(item, activeFilters));
  const comparator = SORT_KEYS[activeSortKey] || SORT_KEYS.default;
  matched.sort(comparator);

  for (const item of allItems) {
    item.element.style.display = matched.includes(item) ? "" : "none";
  }

  return matched.length;
};

// ── Initialisation ──

onReady(() => {
  const container = document.querySelector("[data-filter-container]");
  if (!container) return;

  const allItems = parseItemsFromDOM();

  // Temporary console API for Stage 2 manual testing (removed in Stage 3)
  window.__filter = {
    apply: (filters, sort) => applyFiltersAndSort(allItems, filters, sort || "default"),
    reset: () => applyFiltersAndSort(allItems, {}, "default"),
    items: allItems,
  };
});

export { normalize, filterToPath, parseItemsFromDOM, itemMatchesFilters, applyFiltersAndSort, SORT_KEYS };
```

**Key decisions:**

- **`normalize` and `filterToPath` are inlined**, not imported from `#filters/filter-core.js`. The server-side module imports `#toolkit/fp/array.js`, `#toolkit/fp/memoize.js`, `#toolkit/fp/grouping.js` and more. Pulling that dependency tree into the client bundle would bloat it or break it. These two functions are 3 lines each - inlining is the right call.

- **No runtime normalisation needed on filter matching.** Both the data-attribute values (slugified at build time by `parseFilterAttributes` via `slugify()`) and the filter option values in the UI (also slugified at build time) are already normalised. A simple `===` comparison works. `normalize` is only needed for URL parsing (Stage 4).

- **DOM position as default sort order.** `items.push({ ..., order: items.length })` captures the render order. This replaces the `forloop.index0` approach that would have broken inside `cachedBlock`.

- **`[data-filter-container]` instead of `.item-filter`.** Uses a data attribute on the filter container instead of relying on a CSS class. We add this attribute to `item-filter.html` in Stage 3. For now, the init function just bails out.

- **Pure functions are exported for testing.** The module's side effects (DOM manipulation) only run inside `onReady`. The pure functions can be imported and tested in isolation.

- **No `console.warn` on parse failure.** The `JSON.parse` call has no try/catch - if the server generates invalid JSON, it should fail loudly so the developer notices. This follows the project's "fail fast, never mask" principle.

### 2. Add to bundle

**File**: `/src/_lib/public/bundle.js` (MODIFY)

Add after line 18 (after sort-dropdown.js):

```javascript
import "#public/ui/category-filter.js";
```

---

## Testing

### Unit tests

**File**: `/test/unit/ui/category-filter.test.js` (NEW)

```javascript
import { describe, expect, test } from "bun:test";
import {
  normalize,
  filterToPath,
  itemMatchesFilters,
  SORT_KEYS,
} from "#public/ui/category-filter.js";

describe("normalize", () => {
  test("lowercases and strips non-alphanumeric characters", () => {
    expect(normalize("Hello World!")).toBe("helloworld");
    expect(normalize("Price: £50")).toBe("price50");
  });

  test("matches server-side normalize for slugified values", () => {
    // Slugified values are already lowercase alphanumeric + hyphens
    // normalize strips the hyphens, which is fine for comparison
    expect(normalize("extra-large")).toBe("extralarge");
  });
});

describe("filterToPath", () => {
  test("sorts keys alphabetically", () => {
    expect(filterToPath({ size: "small", color: "red" })).toBe("color/red/size/small");
  });

  test("returns empty string for no filters", () => {
    expect(filterToPath({})).toBe("");
  });

  test("encodes special characters", () => {
    expect(filterToPath({ "a&b": "c/d" })).toBe("a%26b/c%2Fd");
  });
});

describe("itemMatchesFilters", () => {
  const item = { data: { filters: { size: "small", type: "premium" } } };

  test("matches when all filters match", () => {
    expect(itemMatchesFilters(item, { size: "small" })).toBe(true);
    expect(itemMatchesFilters(item, { size: "small", type: "premium" })).toBe(true);
  });

  test("rejects when any filter does not match", () => {
    expect(itemMatchesFilters(item, { size: "large" })).toBe(false);
    expect(itemMatchesFilters(item, { size: "small", type: "basic" })).toBe(false);
  });

  test("matches everything when filter set is empty", () => {
    expect(itemMatchesFilters(item, {})).toBe(true);
  });

  test("rejects when item lacks the filter attribute entirely", () => {
    expect(itemMatchesFilters(item, { color: "red" })).toBe(false);
  });
});

describe("SORT_KEYS", () => {
  test("default sorts by order (DOM position)", () => {
    const items = [{ order: 2 }, { order: 0 }, { order: 1 }];
    items.sort(SORT_KEYS.default);
    expect(items.map((i) => i.order)).toEqual([0, 1, 2]);
  });

  test("price-asc sorts cheapest first", () => {
    const items = [{ data: { price: 99 } }, { data: { price: 10 } }, { data: { price: 50 } }];
    items.sort(SORT_KEYS["price-asc"]);
    expect(items.map((i) => i.data.price)).toEqual([10, 50, 99]);
  });

  test("name-desc sorts Z to A", () => {
    const items = [{ data: { title: "apple" } }, { data: { title: "zebra" } }];
    items.sort(SORT_KEYS["name-desc"]);
    expect(items.map((i) => i.data.title)).toEqual(["zebra", "apple"]);
  });
});
```

**Test quality:**
- Tests pure exported functions, not DOM setup
- Not tautological: `filterToPath` tests verify key sorting, `itemMatchesFilters` tests verify rejection logic
- Each test has one reason to fail

### Manual verification

1. `bun run build && bun run serve`
2. Open a category page, open browser console
3. `window.__filter.items` - should list parsed products
4. `window.__filter.apply({ size: "small" })` - products filter (check DOM)
5. `window.__filter.apply({}, "price-asc")` - products reorder
6. `window.__filter.reset()` - all products visible again
7. No console errors

---

## Files changed

| Action | File | Lines |
|--------|------|-------|
| Create | `/src/_lib/public/ui/category-filter.js` | ~70 |
| Create | `/test/unit/ui/category-filter.test.js` | ~80 |
| Modify | `/src/_lib/public/bundle.js` | +1 |

## Rollback

Remove import from `bundle.js`, delete `category-filter.js`. No template or config changes.
