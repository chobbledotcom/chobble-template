# Stage 4: Migration & URL Management

## Goal

Add URL management for bookmarking/sharing, enable the feature flag to stop generating prerendered filter pages, and clean up.

## Prerequisites

- Stages 1-3 complete: filtering works end-to-end via UI clicks

## Success Criteria

- URLs update when filters/sort applied (bookmarkable, shareable)
- Direct URLs with filters work on page load
- Browser back/forward restores filter state
- Feature flag stops prerendered page generation
- Build time reduced
- Old filter URLs handled gracefully
- Full test suite passes

---

## Implementation Steps

### 1. Add URL management to category-filter.js

**File**: `/src/_lib/public/ui/category-filter.js` (MODIFY)

Add three functions and wire them into `init()`:

```javascript
// ── URL management ──

const buildFilterURL = (filters, sortKey) => {
  const basePath = window.location.pathname.split("/search/")[0];
  const path = filterToPath(filters);
  const sortSuffix = sortKey && sortKey !== "default" ? sortKey : "";
  const searchPart = [path, sortSuffix].filter(Boolean).join("/");
  return searchPart ? `${basePath}/search/${searchPart}/` : `${basePath}/`;
};

const parseFiltersFromURL = () => {
  const path = window.location.pathname;
  const searchMatch = path.match(/\/search\/(.+?)\/?\s*$/);
  if (!searchMatch) return { filters: {}, sortKey: "default" };

  const parts = searchMatch[1].split("/").filter(Boolean);
  let sortKey = "default";

  // Check if last segment is a known sort key
  if (parts.length > 0 && SORT_KEYS[parts[parts.length - 1]]) {
    sortKey = parts.pop();
  }

  // Remaining segments are key/value pairs
  const filters = {};
  for (let i = 0; i + 1 < parts.length; i += 2) {
    filters[decodeURIComponent(parts[i])] = decodeURIComponent(parts[i + 1]);
  }

  return { filters, sortKey };
};
```

**Wire into `init()`** - modify the bootstrap section:

```javascript
const init = (container) => {
  const allItems = parseItemsFromDOM();
  // ... existing setup ...

  // Parse initial state from URL (supports bookmarks/shared links)
  const urlState = parseFiltersFromURL();
  let activeFilters = urlState.filters;
  let activeSortKey = urlState.sortKey;

  const render = () => {
    // ... existing filter/sort/show/hide logic ...

    // Update URL without navigation
    const url = buildFilterURL(activeFilters, activeSortKey);
    if (url !== window.location.pathname) {
      history.replaceState({ filters: activeFilters, sortKey: activeSortKey }, "", url);
    }
  };

  // Browser back/forward
  window.addEventListener("popstate", (e) => {
    if (e.state) {
      activeFilters = e.state.filters || {};
      activeSortKey = e.state.sortKey || "default";
      render();
    }
  });

  // ... existing event handlers ...

  // Push (not replace) on user-initiated filter changes
  // Modify the click/change handlers to push state before render:
  // history.pushState({ filters: activeFilters, sortKey: activeSortKey }, "", url);
};
```

**Key decisions:**

- **`replaceState` on render, `pushState` on user action.** This prevents the initial page load from creating a duplicate history entry. User clicks push new entries so back/forward works. The `render()` function uses `replaceState`, while event handlers call `pushState` before `render()`.

- **`decodeURIComponent` on URL parsing.** Filter values in the URL are encoded by `filterToPath`. When parsing them back, we decode. This round-trips correctly.

- **No `#content` in URLs.** The old system appended `#content` to filter URLs. We drop this - it's a scroll anchor, not part of filter state. If needed, scroll behaviour can be handled separately.

- **Graceful handling of old URLs.** If a user bookmarked `/categories/widgets/search/size/small/price-asc/` from the old system, `parseFiltersFromURL` parses it correctly. The prerendered page no longer exists, but the category page renders all products and the JS applies the filters from the URL. No redirect needed.

### 2. Enable feature flag

**File**: `/src/_data/config.json` (MODIFY)

Add after `has_products_filter` (line 2):

```json
{
  "has_products_filter": true,
  "client_side_filters": true,
  "has_properties_filter": null,
```

### 3. Conditionally skip prerendered page generation

**File**: `/src/_lib/filters/configure-filters.js` (MODIFY)

```javascript
import config from "#data/config.json" with { type: "json" };

export const configureFilters = (eleventyConfig) => {
  if (config.client_side_filters) {
    // Only register the collections needed for filter UI data
    eleventyConfig.addCollection("categoryFilterAttributes", createCategoryFilterAttributes);
    eleventyConfig.addCollection("categoryListingFilterUI", categoryListingUI);
    // Empty collections so pagination templates don't break
    eleventyConfig.addCollection("filteredCategoryProductPages", () => []);
    eleventyConfig.addCollection("categoryFilterRedirects", () => []);
  } else {
    // Original behaviour: generate all prerendered filter pages
    for (const [name, fn] of Object.entries(categoryCollections)) {
      eleventyConfig.addCollection(name, fn);
    }
  }

  eleventyConfig.addFilter("buildCategoryFilterUIData", categoryFilterData);

  // Product and property item-level filters (unchanged)
  for (const cfg of itemFilterConfigs) {
    createFilterConfig(cfg).configure(eleventyConfig);
  }
};
```

**Why `categoryFilterAttributes` and `categoryListingFilterUI` are still needed:** These collections provide the filter UI data (attribute names, values, display labels) that the templates use to render the filter buttons. The client-side JS doesn't generate the UI - Eleventy still renders the filter options at build time. We only skip generating the hundreds of per-combination _pages_.

### 4. Verify pagination template handles empty collection

**File**: `/src/pages/filtered-category-products.html` (CHECK)

Verify this template uses `pagination` over `filteredCategoryProductPages`. When that collection returns `[]`, Eleventy generates zero pages from this template. No modification needed - Eleventy handles empty pagination gracefully.

---

## Testing

### Unit tests for URL functions

**File**: `/test/unit/ui/category-filter.test.js` (ADD)

```javascript
describe("buildFilterURL", () => {
  test("returns base path when no filters or sort", () => {
    // Mock window.location
    delete window.location;
    window.location = { pathname: "/categories/widgets/" };
    expect(buildFilterURL({}, "default")).toBe("/categories/widgets/");
  });

  test("includes filter path", () => {
    window.location = { pathname: "/categories/widgets/" };
    expect(buildFilterURL({ size: "small" }, "default")).toBe("/categories/widgets/search/size/small/");
  });

  test("includes sort key after filters", () => {
    window.location = { pathname: "/categories/widgets/" };
    expect(buildFilterURL({ size: "small" }, "price-asc")).toBe("/categories/widgets/search/size/small/price-asc/");
  });

  test("includes sort key alone", () => {
    window.location = { pathname: "/categories/widgets/" };
    expect(buildFilterURL({}, "price-asc")).toBe("/categories/widgets/search/price-asc/");
  });

  test("strips /search/ from base path if already present", () => {
    window.location = { pathname: "/categories/widgets/search/size/small/" };
    expect(buildFilterURL({ type: "premium" }, "default")).toBe("/categories/widgets/search/type/premium/");
  });
});

describe("parseFiltersFromURL", () => {
  test("returns empty state for base category URL", () => {
    window.location = { pathname: "/categories/widgets/" };
    expect(parseFiltersFromURL()).toEqual({ filters: {}, sortKey: "default" });
  });

  test("extracts filters from path", () => {
    window.location = { pathname: "/categories/widgets/search/size/small/type/premium/" };
    const { filters, sortKey } = parseFiltersFromURL();
    expect(filters).toEqual({ size: "small", type: "premium" });
    expect(sortKey).toBe("default");
  });

  test("extracts sort key from end of path", () => {
    window.location = { pathname: "/categories/widgets/search/size/small/price-asc/" };
    const { filters, sortKey } = parseFiltersFromURL();
    expect(filters).toEqual({ size: "small" });
    expect(sortKey).toBe("price-asc");
  });

  test("handles sort key with no filters", () => {
    window.location = { pathname: "/categories/widgets/search/name-desc/" };
    const { filters, sortKey } = parseFiltersFromURL();
    expect(filters).toEqual({});
    expect(sortKey).toBe("name-desc");
  });

  test("decodes URI components", () => {
    window.location = { pathname: "/categories/widgets/search/a%26b/c%2Fd/" };
    const { filters } = parseFiltersFromURL();
    expect(filters).toEqual({ "a&b": "c/d" });
  });
});
```

### Build verification

```bash
# Measure build time before
time bun run build

# Enable flag, rebuild
# Edit config.json: "client_side_filters": true
time bun run build

# Verify no /search/ pages generated
ls _site/categories/*/search/ 2>/dev/null
# Should show nothing or "No such file or directory"

# Verify category pages still exist
ls _site/categories/*/index.html
```

### Manual end-to-end checklist

1. Navigate to `/categories/widgets/`
2. Click filter - URL updates to `/categories/widgets/search/size/small/`
3. Copy URL, open in new tab - filters applied on load
4. Click back button - previous state restored
5. Click forward button - filter state restored
6. Bookmark a filtered URL, navigate away, return via bookmark - works
7. Try an old-style URL from before migration - filters applied correctly
8. Change sort - URL updates to include sort key
9. Build time noticeably faster
10. `bun test` - full suite passes

---

## Files changed

| Action | File | Change |
|--------|------|--------|
| Modify | `/src/_lib/public/ui/category-filter.js` | +~50 lines (URL functions) |
| Modify | `/src/_data/config.json` | +1 line (feature flag) |
| Modify | `/src/_lib/filters/configure-filters.js` | ~15 lines (conditional logic) |
| Add | `/test/unit/ui/category-filter.test.js` | +~50 lines (URL tests) |

## Future cleanup (not in this stage)

After the client-side system is proven stable:

- Delete `/src/pages/filtered-category-products.html`
- Delete `/src/_lib/filters/filter-combinations.js`
- Remove dead code from `category-product-filters.js`
- Remove tests for `filteredCategoryPages` collection
- Remove the feature flag (make client-side the only path)

## Rollback

Set `client_side_filters: false` in config.json, rebuild. Old prerendered pages regenerate immediately. The client-side JS still runs but is harmless (it just renders the same state the server already rendered).
