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
- Empty state appears for zero matches
- Behavior works on category pages and filtered-products pages
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
- re-render active filter pills from current state
- toggle active classes on option list items
- handle remove-pill and clear-all events
- handle sort change on container-scoped listener

Important listener scope fix:

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

Do not scope this to `.filtered-items`; category pages do not use that wrapper.

### 6. Add empty-state element

**File**: `/src/_includes/filtered-items-section.html` (MODIFY)

Add:

```liquid
<p data-empty-state style="display: none">No items match your filters.</p>
```

And toggle visibility from JS when `matched.length === 0`.

---

## Testing

### Unit updates

**File**: `/test/unit/ui/category-filter.test.js` (MODIFY)

Add tests for:

- active state toggling
- active pill rendering from state
- clear-all and remove-pill behavior
- sort-change interception not triggering navigation in filtered UI

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
4. Remove a filter via pill and verify state/list updates
5. Click clear-all and verify full reset
6. Change sort and verify instant reorder with no navigation
7. Force zero results and verify empty-state message
8. On non-filter contexts, existing `sort-dropdown.js` navigation still works

---

## Files changed

- Modify: `/src/_lib/public/ui/category-filter.js`
- Modify: `/src/_includes/item-filter.html`
- Modify: `/src/_includes/filter-options-list.html`
- Modify: `/src/_includes/filter-sort-dropdown.html`
- Modify: `/src/_lib/filters/filter-ui.js`
- Modify: `/src/_includes/filtered-items-section.html`
- Modify: `/test/unit/ui/category-filter.test.js`
- Modify: `/test/unit/filters/filter-ui.test.js`

## Rollback

Restore Stage 2 `category-filter.js`, remove added data attributes, and keep server-driven navigation behavior.
