# Stage 3 (v2): UI Integration

## Goal

Wire the filtering engine to existing filter UI so filter clicks, sort changes, active pills, and clear-all update instantly without page navigation.

## Prerequisites

- Stage 1 complete: item payload attributes are present and safe
- Stage 2 complete: engine filters and reorders DOM correctly

## Success Criteria

- Filter option clicks apply instantly (no page load)
- Sort dropdown reorders instantly (no navigation)
- Active filter pills are generated/updated client-side and stay accurate
- Remove-pill actions and clear-all work
- Infeasible filter options are hidden (zero results or same result set)
- Entire filter groups are hidden when all their options are hidden
- Behavior works on category pages
- Existing non-filter sort behavior remains unchanged elsewhere

---

## Implementation Steps

### 1. Add container and active-pill hooks

**File**: `/src/_includes/item-filter.html` (MODIFY)

Required updates:

- add `data-filter-container` on wrapper
- add `data-active-filters` on active filters list
- add `data-remove-filter` on remove links
- add `data-clear-filters` on clear-all link

Example shape:

```liquid
<div class="item-filter" data-filter-container>
  <ul class="filter-active" data-active-filters>
    ...
    <a href="{{ filter.removeUrl }}" data-remove-filter="{{ filter.removeFilterKey }}">x</a>
    ...
    <a href="{{ filterUI.clearAllUrl }}" data-clear-filters>Clear all</a>
  </ul>
</div>
```

### 2. Add richer option metadata

**File**: `/src/_includes/filter-options-list.html` (MODIFY)

Add these attributes on filter links:

- `data-filter-key`
- `data-filter-value`
- `data-filter-key-label`
- `data-filter-value-label`

This gives the client enough data to re-render active pills without server recompute.

### 3. Add sort key on dropdown options

**File**: `/src/_includes/filter-sort-dropdown.html` (MODIFY)

Keep URL value for progressive enhancement, add `data-sort-key`:

```liquid
<option value="{{ option.url }}" data-sort-key="{{ option.sortKey }}" ...>
```

### 4. Extend UI data in filter builder

**File**: `/src/_lib/filters/filter-ui.js` (MODIFY)

Add fields to option objects:

- in attribute options: `filterKey`, `filterValue`, `filterKeyLabel`, `filterValueLabel`
- in sort options: `sortKey`
- in active filters: `removeFilterKey`

### 5. Replace category-filter.js with full UI state wiring

**File**: `/src/_lib/public/ui/category-filter.js` (REPLACE Stage 2 version)

Core requirements:

- maintain state: `activeFilters`, `activeSortKey`
- render list via Stage 2 `applyFiltersAndSort`
- re-render active filter pills from current state (see section 6)
- toggle active classes on option list items
- update option visibility via feasibility check (see section 7)
- handle remove-pill and clear-all events
- handle sort change on container-scoped listener

Sort listener scoping:

```javascript
container.addEventListener("change", (e) => {
  const select = e.target.closest(".sort-select");
  if (!select) return;
  const option = select.options[select.selectedIndex];
  const sortKey = option.dataset.sortKey;
  if (!sortKey) return;
  e.stopPropagation();
  activeSortKey = sortKey;
  render();
});
```

The listener is on `container` (which is `[data-filter-container]`), not `.filtered-items`. Category pages do not use the `.filtered-items` wrapper. `e.stopPropagation()` prevents the document-level `sort-dropdown.js` from navigating.

### 6. Active pill management

Server-rendered pills remain until the first user interaction (filter click, sort change, or pill remove). On first interaction, JS takes over completely.

The `[data-active-filters]` element (the `.filter-active` `<ul>`) is cleared and rebuilt from `activeFilters` state:

```javascript
const rebuildPills = (pillContainer, activeFilters, labelLookup) => {
  pillContainer.innerHTML = "";

  for (const [key, value] of Object.entries(activeFilters)) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = `${labelLookup[key]}: ${labelLookup[value]}`;
    const a = document.createElement("a");
    a.href = "#";
    a.dataset.removeFilter = key;
    a.setAttribute("aria-label", `Remove ${labelLookup[key]} filter`);
    a.textContent = "×";
    li.append(span, a);
    pillContainer.append(li);
  }

  if (Object.keys(activeFilters).length > 0) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.dataset.clearFilters = "";
    a.textContent = "Clear all";
    li.append(a);
    pillContainer.append(li);
  }
};
```

The `labelLookup` is built on init by scanning `[data-filter-key-label]` and `[data-filter-value-label]` attributes from the filter option links.

When `activeFilters` is empty, the pill container is emptied (no pills, no clear-all).

### 7. Option feasibility check

After each render, evaluate every filter option link's viability:

```javascript
const updateOptionVisibility = (allItems, activeFilters, currentMatchCount) => {
  for (const group of container.querySelectorAll(".filter-groups > li")) {
    // Skip the sort group
    if (group.querySelector(".sort-select")) continue;

    let visibleOptions = 0;

    for (const link of group.querySelectorAll("[data-filter-key]")) {
      const key = link.dataset.filterKey;
      const value = link.dataset.filterValue;

      // Active option is always visible
      if (activeFilters[key] === value) {
        link.closest("li").style.display = "";
        visibleOptions++;
        continue;
      }

      // Compute hypothetical filter set
      const hypothetical = { ...activeFilters, [key]: value };
      const count = allItems.filter((item) => itemMatchesFilters(item, hypothetical)).length;

      // Hide if zero results OR same result set
      // When adding a cross-group filter, same count == same set (filters only restrict)
      // When replacing within same group, same count != same set, so don't hide
      const isReplacement = key in activeFilters;
      const show = count > 0 && (isReplacement || count !== currentMatchCount);

      link.closest("li").style.display = show ? "" : "none";
      if (show) visibleOptions++;
    }

    // Hide entire group if no viable options
    group.style.display = visibleOptions > 0 ? "" : "none";
  }
};
```

**Key logic:** For cross-group additions, `count === currentMatchCount` means the filter wouldn't change the result set (since adding a constraint can only keep or reduce results). For same-group replacements (where a different value replaces the current one), the same count could mean different items, so we always show those.

---

## Testing

### Unit updates

**File**: `/test/unit/ui/category-filter.test.js` (MODIFY)

Add tests for:

- active state toggling
- active pill rendering from state
- clear-all and remove-pill behavior
- sort-change interception not triggering navigation in filtered UI
- feasibility check: option hidden when hypothetical count is 0
- feasibility check: option hidden when cross-group count equals current count
- feasibility check: option shown when same-group replacement even if count matches
- group hidden when all options hidden

### Filter UI builder tests

**File**: `/test/unit/filters/filter-ui.test.js` (MODIFY)

Add assertions for new fields:

- `filterKey`, `filterValue`, `filterKeyLabel`, `filterValueLabel`
- `sortKey`
- `removeFilterKey`

### Manual verification

1. `bun run build && bun run serve`
2. Category page: click filter option and verify instant update
3. Add second filter and verify AND behavior
4. Verify infeasible options disappear after filtering
5. Verify entire groups disappear when all their options are infeasible
6. Remove a filter via pill and verify state/list/option visibility updates
7. Click clear-all and verify full reset
8. Change sort and verify instant reorder with no navigation
9. On non-filter contexts, existing `sort-dropdown.js` navigation still works
10. Server-rendered pills stay until first click, then JS renders them

---

## Files changed

- Modify: `/src/_lib/public/ui/category-filter.js`
- Modify: `/src/_includes/item-filter.html`
- Modify: `/src/_includes/filter-options-list.html`
- Modify: `/src/_includes/filter-sort-dropdown.html`
- Modify: `/src/_lib/filters/filter-ui.js`
- Modify: `/test/unit/ui/category-filter.test.js`
- Modify: `/test/unit/filters/filter-ui.test.js`

## Rollback

Restore Stage 2 `category-filter.js`, remove added data attributes, and keep server-driven navigation behavior.
