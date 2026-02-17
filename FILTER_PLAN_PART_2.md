# Stage 2: Client-Side Filtering Engine

## Goal

Create the core JavaScript filtering and sorting engine that reads data attributes and shows/hides products. No UI integration yet - just the core logic.

## Prerequisites

- Stage 1 completed: `data-filter-item` attributes exist on all list items

## Success Criteria

✅ JavaScript parses all product data from DOM on page load
✅ Filtering logic correctly matches products against filter criteria
✅ Sorting logic correctly orders products by price/name/order
✅ Show/hide logic works (display: none)
✅ Unit tests pass for all core functions
✅ No errors in browser console

## Implementation Steps

### 1. Create Core Filtering Engine

**File**: `/src/_lib/public/ui/category-filter.js` (NEW)

```javascript
import { onReady } from "#public/utils/on-ready.js";
import { normalize } from "#filters/filter-core.js";

// State (scoped to module)
let allItems = [];
let activeFilters = {};
let activeSortKey = "default";

// Sort comparators (mirror filter-core.js SORT_OPTIONS)
const SORT_COMPARATORS = {
  'default': (a, b) => a.data.order - b.data.order,
  'price-asc': (a, b) => a.data.price - b.data.price,
  'price-desc': (a, b) => b.data.price - a.data.price,
  'name-asc': (a, b) => a.data.title.localeCompare(b.data.title),
  'name-desc': (a, b) => b.data.title.localeCompare(a.data.title),
};

// Parse all li[data-filter-item] once on page load
const parseItemsFromDOM = () => {
  const items = [];
  const elements = document.querySelectorAll('li[data-filter-item]');

  for (const li of elements) {
    try {
      const data = JSON.parse(li.dataset.filterItem);
      items.push({ element: li, data });
    } catch (e) {
      console.warn('Failed to parse filter data:', li, e);
    }
  }

  return items;
};

// Check if item matches all active filters
const itemMatchesFilters = (item, filters) => {
  for (const [key, value] of Object.entries(filters)) {
    const itemValue = item.data.filters[key];
    if (!itemValue || normalize(itemValue) !== normalize(value)) {
      return false;
    }
  }
  return true;
};

// Main filtering and sorting logic
const applyFiltersAndSort = () => {
  // Filter items
  let matchedItems = allItems.filter(item =>
    itemMatchesFilters(item, activeFilters)
  );

  // Sort items
  const comparator = SORT_COMPARATORS[activeSortKey] || SORT_COMPARATORS.default;
  matchedItems.sort(comparator);

  // Show/hide items (O(n) operation, fast for hundreds of items)
  for (const item of allItems) {
    item.element.style.display =
      matchedItems.includes(item) ? '' : 'none';
  }

  // Log for testing/debugging (Stage 2 only)
  console.log(`Filtered: ${matchedItems.length} of ${allItems.length} items`);
  console.log('Active filters:', activeFilters);
  console.log('Sort key:', activeSortKey);
};

// Initialize on page load
onReady(() => {
  const filterContainer = document.querySelector('.item-filter');
  if (!filterContainer) return; // No filters on this page

  allItems = parseItemsFromDOM();
  console.log(`Parsed ${allItems.length} items from DOM`);

  // Stage 2: Manual testing via browser console
  // Expose functions globally for testing
  window.__categoryFilter = {
    allItems,
    setFilters: (filters) => {
      activeFilters = filters;
      applyFiltersAndSort();
    },
    setSort: (sortKey) => {
      activeSortKey = sortKey;
      applyFiltersAndSort();
    },
    reset: () => {
      activeFilters = {};
      activeSortKey = 'default';
      applyFiltersAndSort();
    },
  };

  console.log('Category filter initialized. Test via window.__categoryFilter');
  applyFiltersAndSort(); // Initial render (shows all)
});

// Export for testing
export { parseItemsFromDOM, itemMatchesFilters, SORT_COMPARATORS };
```

### 2. Add to Bundle

**File**: `/src/_lib/public/bundle.js` (MODIFY)

```javascript
// Add after line 18 (with other UI imports)
import "#public/ui/category-filter.js";
```

## Testing

### Unit Tests

**File**: `/test/unit/ui/category-filter.test.js` (NEW)

```javascript
import { describe, expect, test, beforeEach } from "bun:test";
import { parseItemsFromDOM, itemMatchesFilters, SORT_COMPARATORS } from "#public/ui/category-filter.js";
import { JSDOM } from "jsdom";

describe("category-filter parsing", () => {
  test("parseItemsFromDOM extracts all products with valid JSON", () => {
    const dom = new JSDOM(`
      <ul class="items">
        <li data-filter-item='{"slug":"a","title":"product a","price":10,"order":0,"filters":{"size":"small"}}'>A</li>
        <li data-filter-item='{"slug":"b","title":"product b","price":20,"order":1,"filters":{"size":"large"}}'>B</li>
      </ul>
    `);
    global.document = dom.window.document;

    const items = parseItemsFromDOM();

    expect(items).toHaveLength(2);
    expect(items[0].data.slug).toBe("a");
    expect(items[0].data.price).toBe(10);
    expect(items[0].element.tagName).toBe("LI");
    expect(items[1].data.slug).toBe("b");
  });

  test("parseItemsFromDOM handles malformed JSON gracefully", () => {
    const dom = new JSDOM(`
      <ul class="items">
        <li data-filter-item='{"slug":"valid","price":10,"order":0,"filters":{}}'>Valid</li>
        <li data-filter-item='invalid json here'>Invalid</li>
        <li data-filter-item='{"slug":"also-valid","price":20,"order":1,"filters":{}}'>Also Valid</li>
      </ul>
    `);
    global.document = dom.window.document;

    const items = parseItemsFromDOM();

    // Should skip invalid JSON but parse valid items
    expect(items).toHaveLength(2);
    expect(items[0].data.slug).toBe("valid");
    expect(items[1].data.slug).toBe("also-valid");
  });
});

describe("category-filter matching", () => {
  test("itemMatchesFilters returns true when all filters match", () => {
    const item = {
      data: {
        filters: { size: "small", type: "premium" }
      }
    };

    expect(itemMatchesFilters(item, { size: "small" })).toBe(true);
    expect(itemMatchesFilters(item, { type: "premium" })).toBe(true);
    expect(itemMatchesFilters(item, { size: "small", type: "premium" })).toBe(true);
  });

  test("itemMatchesFilters returns false when any filter doesn't match", () => {
    const item = {
      data: {
        filters: { size: "small", type: "premium" }
      }
    };

    expect(itemMatchesFilters(item, { size: "large" })).toBe(false);
    expect(itemMatchesFilters(item, { size: "small", type: "basic" })).toBe(false);
  });

  test("itemMatchesFilters returns true for empty filter set", () => {
    const item = {
      data: {
        filters: { size: "small" }
      }
    };

    expect(itemMatchesFilters(item, {})).toBe(true);
  });

  test("itemMatchesFilters handles missing filter attributes", () => {
    const item = {
      data: {
        filters: { size: "small" }
      }
    };

    // Item doesn't have 'color' attribute
    expect(itemMatchesFilters(item, { color: "blue" })).toBe(false);
  });
});

describe("category-filter sorting", () => {
  test("default sort uses order index", () => {
    const items = [
      { data: { order: 2 } },
      { data: { order: 0 } },
      { data: { order: 1 } },
    ];

    items.sort(SORT_COMPARATORS.default);

    expect(items[0].data.order).toBe(0);
    expect(items[1].data.order).toBe(1);
    expect(items[2].data.order).toBe(2);
  });

  test("price-asc sorts by price ascending", () => {
    const items = [
      { data: { price: 100 } },
      { data: { price: 50 } },
      { data: { price: 75 } },
    ];

    items.sort(SORT_COMPARATORS['price-asc']);

    expect(items[0].data.price).toBe(50);
    expect(items[1].data.price).toBe(75);
    expect(items[2].data.price).toBe(100);
  });

  test("price-desc sorts by price descending", () => {
    const items = [
      { data: { price: 50 } },
      { data: { price: 100 } },
      { data: { price: 75 } },
    ];

    items.sort(SORT_COMPARATORS['price-desc']);

    expect(items[0].data.price).toBe(100);
    expect(items[1].data.price).toBe(75);
    expect(items[2].data.price).toBe(50);
  });

  test("name-asc sorts alphabetically", () => {
    const items = [
      { data: { title: "zebra" } },
      { data: { title: "apple" } },
      { data: { title: "mango" } },
    ];

    items.sort(SORT_COMPARATORS['name-asc']);

    expect(items[0].data.title).toBe("apple");
    expect(items[1].data.title).toBe("mango");
    expect(items[2].data.title).toBe("zebra");
  });

  test("name-desc sorts reverse alphabetically", () => {
    const items = [
      { data: { title: "apple" } },
      { data: { title: "zebra" } },
      { data: { title: "mango" } },
    ];

    items.sort(SORT_COMPARATORS['name-desc']);

    expect(items[0].data.title).toBe("zebra");
    expect(items[1].data.title).toBe("mango");
    expect(items[2].data.title).toBe("apple");
  });
});
```

**Run tests**:
```bash
bun test test/unit/ui/category-filter.test.js
```

### Manual Browser Testing

1. **Build and serve**:
   ```bash
   bun run build
   bun run serve
   ```

2. **Open category page**: Navigate to `/categories/widgets/`

3. **Open browser console** and test the exposed API:

   ```javascript
   // Check initialization
   window.__categoryFilter
   // Should show: { allItems: [...], setFilters: f, setSort: f, reset: f }

   // Test filtering by size
   window.__categoryFilter.setFilters({ size: "small" })
   // Check: Only "small" products visible on page

   // Test multiple filters
   window.__categoryFilter.setFilters({ size: "small", type: "premium" })
   // Check: Only products matching BOTH filters visible

   // Test sorting by price
   window.__categoryFilter.setSort("price-asc")
   // Check: Products reorder (cheapest first)

   // Test sorting by name
   window.__categoryFilter.setSort("name-asc")
   // Check: Products reorder alphabetically

   // Reset to default
   window.__categoryFilter.reset()
   // Check: All products visible, default order
   ```

4. **Verify in DevTools**:
   - Elements tab: Check `style="display: none"` on hidden items
   - Console: No errors
   - Network tab: No page loads when filtering

## Verification Checklist

- ✅ Console shows "Parsed N items from DOM"
- ✅ Console shows "Category filter initialized"
- ✅ `window.__categoryFilter` is available in console
- ✅ `setFilters({ size: "small" })` hides non-matching products
- ✅ `setSort("price-asc")` reorders products by price
- ✅ `reset()` shows all products again
- ✅ No JavaScript errors in console
- ✅ Unit tests pass: `bun test test/unit/ui/category-filter.test.js`

## Files Changed

- ✅ Created: `/src/_lib/public/ui/category-filter.js` (~120 lines)
- ✅ Created: `/test/unit/ui/category-filter.test.js` (~150 lines)
- ✅ Modified: `/src/_lib/public/bundle.js` (+1 line)

## Rollback Plan

If issues arise:
1. Remove import from `bundle.js`
2. Delete `category-filter.js`
3. Run `bun run build`

No changes to templates or existing functionality.

## Next Stage

Stage 3 will connect this engine to the filter UI (buttons, dropdowns) and remove the `window.__categoryFilter` debug API.
