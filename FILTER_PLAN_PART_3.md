# Stage 3: UI Integration

## Goal

Wire the filtering engine to the existing filter UI. Filter clicks, sort changes, and "clear all" work via JavaScript instead of page navigation.

## Prerequisites

- Stage 1 complete: data attributes on items
- Stage 2 complete: filtering engine works via console API

## Success Criteria

- Clicking a filter option shows/hides products instantly (no page load)
- Sort dropdown reorders products without navigation
- Active filter pills have working remove buttons
- "Clear all" link resets to all products
- Empty-state message appears when zero items match
- No new CSS classes needed
- Unit and integration tests pass

---

## Implementation Steps

### 1. Add `data-filter-container` to item-filter.html

**File**: `/src/_includes/item-filter.html` (MODIFY)

The filtering engine (Stage 2) looks for `[data-filter-container]` to initialise. Add the attribute to the existing wrapper:

**Before (line 8):**
```liquid
<div class="item-filter">
```

**After:**
```liquid
<div class="item-filter" data-filter-container>
```

No CSS class added - uses a data attribute as the semantic hook for JS.

### 2. Add data attributes to filter option links

**File**: `/src/_includes/filter-options-list.html` (MODIFY)

The current template (line 12) renders plain links:
```liquid
<a href="{{ option.url }}">{{ option.value }}</a>
```

Add data attributes so JS can intercept clicks:

```liquid
<a href="{{ option.url }}"{% if option.filterKey %} data-filter-key="{{ option.filterKey }}" data-filter-value="{{ option.filterValue }}"{% endif %}>{{ option.value }}</a>
```

The `{% if option.filterKey %}` guard means this is backwards-compatible: sort options (which don't have `filterKey`) and pages without client-side filtering are unaffected.

### 3. Add data attributes to active filter pills

**File**: `/src/_includes/item-filter.html` (MODIFY)

The current template (line 14) renders remove links:
```liquid
<a href="{{ filter.removeUrl }}" aria-label="Remove {{ filter.key }} filter">×</a>
```

Add a data attribute for JS interception:
```liquid
<a href="{{ filter.removeUrl }}" aria-label="Remove {{ filter.key }} filter" data-remove-filter="{{ filter.removeFilterKey }}">×</a>
```

### 4. Provide the data attributes from filter-ui.js

**File**: `/src/_lib/filters/filter-ui.js` (MODIFY)

Three small additions to existing return objects:

**In `buildAttributeGroups` (line 98-102)** - add `filterKey` and `filterValue`:
```javascript
return {
  value: ctx.filterData.displayLookup[value],
  url: searchUrl(ctx.baseUrl, toSortedPath(newFilters, combo.sortKey)),
  active: isActive,
  filterKey: attrName,
  filterValue: value,
};
```

**In `buildSortGroup` (line 73-77)** - add `sortKey`:
```javascript
options: SORT_OPTIONS.map((sortOption) => ({
  value: sortOption.label,
  url: searchUrl(ctx.baseUrl, toSortedPath(combo.filters, sortOption.key)),
  active: combo.sortKey === sortOption.key,
  sortKey: sortOption.key,
})),
```

**In `buildActiveFilters` (line 82-88)** - add `removeFilterKey`:
```javascript
mapEntries((key, value) => ({
  key: ctx.filterData.displayLookup[key],
  value: ctx.filterData.displayLookup[value],
  removeUrl: searchUrl(
    ctx.baseUrl,
    toSortedPath(omit([key])(combo.filters), combo.sortKey),
  ),
  removeFilterKey: key,
}))(combo.filters);
```

### 5. Handle the sort-dropdown.js conflict

**Critical issue:** The existing `sort-dropdown.js` (line 6) does `window.location.href = event.target.value`. The sort `<option>` values are currently full URLs. We need client-side filtering to intercept sort changes instead.

**Solution:** Keep the `<option value>` as the URL (for progressive enhancement), but add `data-sort-key` so our JS can read the sort key without parsing the URL:

**File**: `/src/_includes/filter-sort-dropdown.html` (MODIFY)

**Before (line 10):**
```liquid
<option value="{{ option.url }}"{% if option.active %} selected{% endif %}>{{ option.value }}</option>
```

**After:**
```liquid
<option value="{{ option.url }}"{% if option.sortKey %} data-sort-key="{{ option.sortKey }}"{% endif %}{% if option.active %} selected{% endif %}>{{ option.value }}</option>
```

Then in `category-filter.js`, we intercept the `change` event _before_ `sort-dropdown.js` can navigate:

```javascript
// In category-filter.js event setup (runs before sort-dropdown.js via import order)
container.closest(".filtered-items")?.addEventListener("change", (e) => {
  const select = e.target.closest(".sort-select");
  if (!select) return;
  const option = select.options[select.selectedIndex];
  const sortKey = option.dataset.sortKey;
  if (!sortKey) return; // Let sort-dropdown.js handle it (non-filter pages)
  e.stopPropagation(); // Prevent sort-dropdown.js from navigating
  // ... apply sort
});
```

**Why this works:** By scoping the listener to `.filtered-items` and calling `e.stopPropagation()`, the existing `sort-dropdown.js` (which listens on `document`) never sees the event on filter pages. On non-filter pages, `sort-dropdown.js` works as before.

### 6. Rewrite category-filter.js with full UI wiring

**File**: `/src/_lib/public/ui/category-filter.js` (REPLACE Stage 2 version)

```javascript
import { onReady } from "#public/utils/on-ready.js";

// ── Pure functions (inlined, see Stage 2 notes) ──

const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

const filterToPath = (filters) => {
  const keys = Object.keys(filters).sort();
  if (keys.length === 0) return "";
  return keys.flatMap((k) => [encodeURIComponent(k), encodeURIComponent(filters[k])]).join("/");
};

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

// ── State + rendering ──

const init = (container) => {
  const allItems = parseItemsFromDOM();
  const itemsList = allItems[0]?.element.closest(".items");
  const emptyState = container.closest(".filtered-items")?.querySelector("[data-empty-state]");
  let activeFilters = {};
  let activeSortKey = "default";

  const render = () => {
    const matched = allItems.filter((item) => itemMatchesFilters(item, activeFilters));
    matched.sort(SORT_KEYS[activeSortKey] || SORT_KEYS.default);

    for (const item of allItems) {
      item.element.style.display = matched.includes(item) ? "" : "none";
    }

    if (emptyState) emptyState.style.display = matched.length === 0 ? "" : "none";
    if (itemsList) itemsList.style.display = matched.length === 0 ? "none" : "";

    // Update active states on filter option links
    for (const link of container.querySelectorAll("[data-filter-key]")) {
      const isActive = activeFilters[link.dataset.filterKey] === link.dataset.filterValue;
      link.closest("li")?.classList.toggle("active", isActive);
    }
  };

  // ── Event delegation ──

  container.addEventListener("click", (e) => {
    // Filter option click
    const filterLink = e.target.closest("[data-filter-key]");
    if (filterLink) {
      e.preventDefault();
      activeFilters = { ...activeFilters, [filterLink.dataset.filterKey]: filterLink.dataset.filterValue };
      render();
      return;
    }

    // Remove active filter pill
    const removeLink = e.target.closest("[data-remove-filter]");
    if (removeLink) {
      e.preventDefault();
      const { [removeLink.dataset.removeFilter]: _, ...rest } = activeFilters;
      activeFilters = rest;
      render();
      return;
    }
  });

  // Clear all (the "Clear all" link is inside .filter-active ul)
  container.querySelector(".filter-active")?.addEventListener("click", (e) => {
    const clearLink = e.target.closest("a[href$='#content']");
    // The "Clear all" link href ends with the base category URL + #content
    // and does NOT have data-remove-filter (that's individual pills)
    if (clearLink && !clearLink.dataset.removeFilter) {
      e.preventDefault();
      activeFilters = {};
      render();
    }
  });

  // Sort dropdown (intercept before sort-dropdown.js can navigate)
  container.closest(".filtered-items")?.addEventListener("change", (e) => {
    const select = e.target.closest(".sort-select");
    if (!select) return;
    const option = select.options[select.selectedIndex];
    const sortKey = option.dataset.sortKey;
    if (!sortKey) return;
    e.stopPropagation();
    activeSortKey = sortKey;
    render();
  });

  render(); // Initial render (shows all, default sort)
};

// ── Bootstrap ──

onReady(() => {
  const container = document.querySelector("[data-filter-container]");
  if (!container) return;
  init(container);
});

export { normalize, filterToPath, parseItemsFromDOM, itemMatchesFilters, SORT_KEYS };
```

### 7. Add empty-state element

**File**: `/src/_includes/filtered-items-section.html` (MODIFY)

**Before:**
```liquid
<div class="filtered-items">
  {{ "icons/spinner.svg" | inline_asset }}
  <div class="filtered-content">
    {{- content -}}
    {%- include "items.html", items: items -%}
  </div>
</div>
```

**After:**
```liquid
<div class="filtered-items">
  {{ "icons/spinner.svg" | inline_asset }}
  <div class="filtered-content">
    {{- content -}}
    {%- include "items.html", items: items -%}
    <p data-empty-state style="display: none">No items match your filters.</p>
  </div>
</div>
```

**Notes:**
- Uses `data-empty-state` attribute, not a CSS class
- Says "items" not "products" - works for properties too
- Hidden by default via inline style
- No "clear filters" link needed here - the active filter pills already have "Clear all"

---

## Testing

### Updated unit tests

**File**: `/test/unit/ui/category-filter.test.js` (same as Stage 2, pure function tests unchanged)

### Integration tests

**File**: `/test/unit/filters/filter-ui.test.js` (ADD to existing)

```javascript
test("buildAttributeGroups includes filterKey and filterValue", () => {
  // ... setup ctx and combo with real filter data ...
  const groups = buildAttributeGroups(ctx, combo);
  const option = groups[0].options[0];
  expect(option).toHaveProperty("filterKey");
  expect(option).toHaveProperty("filterValue");
});

test("buildSortGroup includes sortKey on each option", () => {
  // ... setup ...
  const group = buildSortGroup(ctx, combo);
  expect(group.options[0].sortKey).toBe("default");
  expect(group.options[1].sortKey).toBe("price-asc");
});

test("buildActiveFilters includes removeFilterKey", () => {
  // ... setup with active filters ...
  const active = buildActiveFilters(ctx, combo);
  expect(active[0]).toHaveProperty("removeFilterKey");
});
```

### Manual verification

1. `bun run build && bun run serve`
2. Navigate to a category page with filters
3. Click a filter option - products filter instantly, no page load
4. Click a second filter - AND logic, fewer products shown
5. Click x on an active filter pill - that filter removed
6. Click "Clear all" - all products shown
7. Change sort dropdown - products reorder, no page load
8. Apply filters that match zero items - "No items match" message appears
9. On a non-filter page (e.g. news), sort dropdown still navigates (sort-dropdown.js)
10. No JavaScript errors in console

---

## Files changed

| Action | File | Change |
|--------|------|--------|
| Modify | `/src/_lib/public/ui/category-filter.js` | Replace Stage 2 version (~110 lines) |
| Modify | `/src/_includes/item-filter.html` | +1 data attribute on wrapper, +1 on remove links |
| Modify | `/src/_includes/filter-options-list.html` | +1 data attributes on links |
| Modify | `/src/_includes/filter-sort-dropdown.html` | +1 data attribute on options |
| Modify | `/src/_lib/filters/filter-ui.js` | +3 fields across 3 functions |
| Modify | `/src/_includes/filtered-items-section.html` | +1 empty-state `<p>` |

Zero new CSS classes. All JS hooks use data attributes. All selectors target existing markup structure.

## Rollback

Revert `category-filter.js` to Stage 2 version, remove data attributes from templates, revert filter-ui.js additions. Existing sort-dropdown.js and filter navigation continue working.
