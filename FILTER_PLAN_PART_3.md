# Stage 3: UI Integration

## Goal

Connect the filtering engine to the existing filter UI. Make filter buttons, sort dropdowns, and "clear filters" links actually work via JavaScript instead of navigation.

## Prerequisites

- Stage 1 completed: `data-filter-item` attributes exist
- Stage 2 completed: Filtering engine works via console API

## Success Criteria

✅ Clicking filter options filters products instantly (no page load)
✅ Sort dropdown changes order without navigation
✅ Active filter pills appear and have working remove buttons
✅ "Clear all filters" link works
✅ No-results state shows when no products match
✅ Filter UI shows active state correctly
✅ Integration tests pass

## Implementation Steps

### 1. Update Filter UI Data Generation

**File**: `/src/_lib/filters/filter-ui.js` (MODIFY)

**In `buildAttributeGroups()` function (lines 92-111)**:

```javascript
// Line 98-102 - ADD filterKey and filterValue
return {
  value: ctx.filterData.displayLookup[value],
  url: searchUrl(ctx.baseUrl, toSortedPath(newFilters, combo.sortKey)),
  active: isActive,
  filterKey: attrName,      // ADD THIS
  filterValue: value,        // ADD THIS
};
```

**In `buildSortGroup()` function (lines 70-78)**:

```javascript
// Line 73-77 - ADD sortKey to each option
options: SORT_OPTIONS.map((sortOption) => ({
  value: sortOption.label,
  url: searchUrl(ctx.baseUrl, toSortedPath(combo.filters, sortOption.key)),
  active: combo.sortKey === sortOption.key,
  sortKey: sortOption.key,  // ADD THIS
})),
```

**In `buildActiveFilters()` function (lines 81-89)**:

```javascript
// Line 82-88 - ADD removeFilterKey
mapEntries((key, value) => ({
  key: ctx.filterData.displayLookup[key],
  value: ctx.filterData.displayLookup[value],
  removeUrl: searchUrl(
    ctx.baseUrl,
    toSortedPath(omit([key])(combo.filters), combo.sortKey),
  ),
  removeFilterKey: key,  // ADD THIS
}))(combo.filters);
```

### 2. Update Category Filter JS with Event Handlers

**File**: `/src/_lib/public/ui/category-filter.js` (MODIFY)

Replace the Stage 2 debug code with real event handlers:

```javascript
// REMOVE the window.__categoryFilter debug API

// ADD event handlers
const attachEventListeners = (container) => {
  // Filter option clicks (event delegation)
  container.addEventListener('click', (e) => {
    const filterLink = e.target.closest('a[data-filter-key]');
    if (filterLink) {
      e.preventDefault();
      const key = filterLink.dataset.filterKey;
      const value = filterLink.dataset.filterValue;
      activeFilters = { ...activeFilters, [key]: value };
      applyFiltersAndSort();
    }

    // Remove filter pill clicks
    const removeLink = e.target.closest('.filter-active a[data-remove-filter-key]');
    if (removeLink) {
      e.preventDefault();
      const key = removeLink.dataset.removeFilterKey;
      const { [key]: _, ...remaining } = activeFilters;
      activeFilters = remaining;
      applyFiltersAndSort();
    }

    // Clear all filters
    if (e.target.closest('.clear-filters-link')) {
      e.preventDefault();
      activeFilters = {};
      applyFiltersAndSort();
    }
  });

  // Sort dropdown changes
  document.addEventListener('change', (e) => {
    if (e.target.matches('.sort-select')) {
      e.preventDefault();
      activeSortKey = e.target.value;
      applyFiltersAndSort();
    }
  });
};

// ADD UI update functions
const updateFilterUIActiveStates = () => {
  // Update active state on filter options
  const allOptions = document.querySelectorAll('a[data-filter-key]');
  for (const option of allOptions) {
    const key = option.dataset.filterKey;
    const value = option.dataset.filterValue;
    const isActive = activeFilters[key] === value;
    option.closest('li')?.classList.toggle('active', isActive);
  }
};

const updateNoResultsState = (isEmpty) => {
  const noResults = document.querySelector('[data-empty-state]');
  const itemsList = document.querySelector('.items');

  if (noResults && itemsList) {
    if (isEmpty) {
      noResults.style.display = 'block';
      itemsList.style.display = 'none';
    } else {
      noResults.style.display = 'none';
      itemsList.style.display = '';
    }
  }
};

// UPDATE applyFiltersAndSort to call UI updates
const applyFiltersAndSort = () => {
  // ... existing filter and sort logic ...

  updateFilterUIActiveStates();
  updateNoResultsState(matchedItems.length === 0);
};

// UPDATE onReady to attach event listeners
onReady(() => {
  const filterContainer = document.querySelector('.item-filter');
  if (!filterContainer) return;

  allItems = parseItemsFromDOM();
  attachEventListeners(filterContainer);
  applyFiltersAndSort();
});
```

### 3. Update Filter Templates

**File**: `/src/_includes/filter-options-list.html` (CHECK/MODIFY if needed)

Verify filter option links have data attributes (should be auto-populated from filter-ui.js changes):

```liquid
<ul class="filter-options-list">
  {%- for option in options -%}
  <li{% if option.active %} class="active"{% endif %}>
    {%- if option.active -%}
    <span>{{ option.value }}</span>
    {%- else -%}
    <a href="{{ option.url }}"
       data-filter-key="{{ option.filterKey }}"
       data-filter-value="{{ option.filterValue }}">
      {{ option.value }}
    </a>
    {%- endif -%}
  </li>
  {%- endfor -%}
</ul>
```

**File**: `/src/_includes/filter-sort-dropdown.html` or similar (CHECK/MODIFY if needed)

Verify sort dropdown uses `sortKey` as value:

```liquid
<select class="sort-select">
  {%- for option in group.options -%}
  <option value="{{ option.sortKey }}"{% if option.active %} selected{% endif %}>
    {{ option.value }}
  </option>
  {%- endfor -%}
</select>
```

**File**: Active filter pills template (CHECK/MODIFY if needed)

Verify remove links have `data-remove-filter-key`:

```liquid
{%- for filter in filterUI.activeFilters -%}
<span class="filter-active">
  {{ filter.key }}: {{ filter.value }}
  <a href="{{ filter.removeUrl }}" data-remove-filter-key="{{ filter.removeFilterKey }}">✕</a>
</span>
{%- endfor -%}
```

### 4. Add No-Results Element

**File**: `/src/_includes/filtered-items-section.html` (MODIFY)

Add no-results message after the items list:

```liquid
<div class="filtered-items">
  <div class="filtered-content">
    {{- content -}}
    {%- include "items.html", items: items -%}
    <p data-empty-state style="display: none;">
      No products match your filters.
      <a href="#" class="clear-filters-link">Clear filters</a>
    </p>
  </div>
</div>
```

**Note**: Uses `data-empty-state` instead of a CSS class. All styling via existing classes + inline `style.display`.

## Testing

### Integration Tests

**File**: `/test/integration/category-filtering.test.js` (NEW)

```javascript
import { describe, expect, test } from "bun:test";
import { buildFilterUIData } from "#filters/filter-ui.js";

describe("filter UI data attributes integration", () => {
  test("filter options include filterKey and filterValue for JS handlers", () => {
    const filterData = {
      attributes: { size: ["small", "large"], type: ["basic", "premium"] },
      displayLookup: {
        size: "Size",
        small: "Small",
        large: "Large",
        type: "Type",
        basic: "Basic",
        premium: "Premium",
      },
    };

    const validPages = [
      { path: "size/small" },
      { path: "size/large" },
      { path: "type/basic" },
    ];

    const uiData = buildFilterUIData(
      filterData,
      {}, // current filters
      validPages,
      "/products",
      "default",
      10 // count
    );

    const sizeGroup = uiData.groups.find(g => g.name === "size");
    expect(sizeGroup).toBeDefined();

    const smallOption = sizeGroup.options.find(o => o.value === "Small");
    expect(smallOption.filterKey).toBe("size");
    expect(smallOption.filterValue).toBe("small");
    expect(smallOption.url).toBeDefined(); // Still has URL for progressive enhancement
  });

  test("sort options include sortKey for dropdown value", () => {
    const filterData = {
      attributes: {},
      displayLookup: {},
    };

    const uiData = buildFilterUIData(
      filterData,
      {},
      [],
      "/products",
      "default",
      10
    );

    const sortGroup = uiData.groups.find(g => g.name === "sort");
    expect(sortGroup).toBeDefined();

    const priceAscOption = sortGroup.options.find(o => o.value === "Price: Low to High");
    expect(priceAscOption.sortKey).toBe("price-asc");
  });

  test("active filters include removeFilterKey for pill removal", () => {
    const filterData = {
      attributes: { size: ["small", "large"] },
      displayLookup: {
        size: "Size",
        small: "Small",
      },
    };

    const validPages = [{ path: "size/small" }];

    const uiData = buildFilterUIData(
      filterData,
      { size: "small" }, // active filter
      validPages,
      "/products",
      "default",
      5
    );

    expect(uiData.hasActiveFilters).toBe(true);
    expect(uiData.activeFilters).toHaveLength(1);
    expect(uiData.activeFilters[0].removeFilterKey).toBe("size");
    expect(uiData.activeFilters[0].removeUrl).toBeDefined();
  });
});
```

### Manual Testing Checklist

1. **Build and serve**:
   ```bash
   bun run build
   bun run serve
   ```

2. **Navigate to category page**: `/categories/widgets/`

3. **Test filter clicks**:
   - ✅ Click a filter option (e.g., "Small")
   - ✅ Products filter instantly (no page load)
   - ✅ Filter option shows active state
   - ✅ URL does NOT change yet (Stage 4 adds URL management)

4. **Test multiple filters**:
   - ✅ Click another filter (e.g., "Premium")
   - ✅ Only products matching BOTH filters show
   - ✅ Both filters show active state

5. **Test sort dropdown**:
   - ✅ Select "Price: Low to High"
   - ✅ Products reorder instantly
   - ✅ No page load

6. **Test active filter pills**:
   - ✅ Active filters appear as pills/chips
   - ✅ Click ✕ on a pill
   - ✅ That filter removes, products update

7. **Test "Clear all"**:
   - ✅ Apply multiple filters
   - ✅ Click "Clear all filters" link
   - ✅ All products show again

8. **Test no-results state**:
   - ✅ Apply filters that match zero products
   - ✅ "No products match" message appears (uses existing markup + inline styles)
   - ✅ Product list hidden
   - ✅ Click "Clear filters" in message
   - ✅ All products show again

9. **Test browser console**:
   - ✅ No JavaScript errors
   - ✅ No 404s or network errors

## Verification Checklist

- ✅ Filter buttons work without page navigation
- ✅ Sort dropdown works without page navigation
- ✅ Active filter pills display correctly
- ✅ Remove filter buttons work
- ✅ Clear all filters works
- ✅ No-results state appears when appropriate
- ✅ No-results "clear filters" link works
- ✅ No JavaScript errors in console
- ✅ Integration tests pass: `bun test test/integration/category-filtering.test.js`
- ✅ Unit tests still pass: `bun test test/unit/ui/category-filter.test.js`

## Files Changed

- ✅ Modified: `/src/_lib/public/ui/category-filter.js` (~100 lines added)
- ✅ Modified: `/src/_lib/filters/filter-ui.js` (~6 lines added across 3 functions)
- ✅ Modified: `/src/_includes/filtered-items-section.html` (~5 lines added)
- ✅ Created: `/test/integration/category-filtering.test.js` (~80 lines)
- ✅ Check/modify: Filter templates if data attributes not auto-populated

## Known Limitations (Fixed in Stage 4)

⚠️ URL does not update when filters applied (no bookmarking/sharing yet)
⚠️ Browser back/forward buttons don't work yet
⚠️ Cannot load page with filters from URL
⚠️ Old filter pages still generated (build time not improved yet)

These are intentional - Stage 4 adds URL management and migration.

## Rollback Plan

If issues arise:
1. Revert changes to `category-filter.js` (keep Stage 2 version with `window.__categoryFilter`)
2. Revert changes to `filter-ui.js`
3. Remove no-results element
4. Run `bun run build`

## Next Stage

Stage 4 will add:
- URL management (History API)
- Feature flag to disable old prerendered pages
- Redirects for old URLs
- Build time improvements
