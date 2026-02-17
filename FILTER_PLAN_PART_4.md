# Stage 4 (v2): URL Management and Prerendered Page Removal

## Goal

Add URL state support (bookmark/share/back-forward), then delete the old prerendered filter page system entirely to reduce build time.

## Prerequisites

- Stages 1-3 complete and stable

## Success Criteria

- URL updates on filter/sort changes
- Direct filtered URLs hydrate correctly on page load
- Browser back/forward restores UI state
- Old prerendered filter page generation is deleted
- Build time decreases
- Full test suite passes

---

## Implementation Steps

### 1. Add pure URL helpers to category-filter.js

**File**: `/src/_lib/public/ui/category-filter.js` (MODIFY)

Use pure helpers (pathname in, data out), then wire to `window.location.pathname` at runtime:

```javascript
const buildFilterURL = (pathname, filters, sortKey) => {
  const basePath = pathname.split("/search/")[0].replace(/\/$/, "");
  const path = filterToPath(filters);
  const suffix = sortKey && sortKey !== "default" ? sortKey : "";
  const searchPart = [path, suffix].filter(Boolean).join("/");
  return searchPart ? `${basePath}/search/${searchPart}/` : `${basePath}/`;
};

const parseFiltersFromPath = (pathname) => {
  const match = pathname.match(/\/search\/(.+?)\/?$/);
  if (!match) return { filters: {}, sortKey: "default" };

  const parts = match[1].split("/").filter(Boolean);
  let sortKey = "default";

  if (parts.length > 0 && SORT_KEYS[parts[parts.length - 1]]) {
    sortKey = parts.pop();
  }

  const filters = {};
  for (let i = 0; i + 1 < parts.length; i += 2) {
    filters[decodeURIComponent(parts[i])] = decodeURIComponent(parts[i + 1]);
  }

  return { filters, sortKey };
};
```

### 2. Wire history lifecycle correctly

In `init()`:

- parse initial state from `parseFiltersFromPath(window.location.pathname)`
- call `history.replaceState` once after initial render
- on user actions, call `history.pushState` with latest state/url
- on `popstate`, restore from `event.state` if present, else parse current pathname

This avoids duplicate initial entries and keeps back/forward reliable.

### 3. Delete prerendered filter page system

The old prerendered filter system has never been deployed to production. No backwards compatibility is needed. Delete it outright.

**Files to delete:**

- `/src/pages/filtered-category-products.html` (pagination template for prerendered filter pages)
- `/src/_lib/filters/filter-combinations.js` (generates all filter combinations)
- Any redirect templates for category filter URLs

**Files to modify:**

- `/src/_lib/filters/category-product-filters.js` - remove page/redirect generation functions, keep only the UI-support data (`attributes`, `listingUI`) needed for rendering filter options at build time
- `/src/_lib/filters/configure-filters.js` - remove collection registrations for `filteredCategoryProductPages` and `categoryFilterRedirects`, keep collections that provide filter UI data to templates
- Remove related tests for deleted collections/functions

### 4. Verify filter UI still renders

After deleting the page generation code, the filter UI must still render correctly on category pages. The UI depends on:

- `categoryFilterAttributes` collection (attribute names, values, display lookup)
- `categoryListingFilterUI` collection (per-category filter UI data)
- `buildCategoryFilterUIData` filter

These must remain intact. Only the per-combination page generation is removed.

---

## Testing

### Unit tests (URL helpers)

**File**: `/test/unit/ui/category-filter.test.js` (MODIFY)

Add tests for:

- `buildFilterURL(pathname, filters, sortKey)`
- `parseFiltersFromPath(pathname)`
- encoded key/value round-trip
- sort-only URL and no-filter URL behavior

### Integration tests

Add tests for:

- initial hydration from URL
- pushState on user actions
- popstate restores previous state

### Build verification

1. Measure `time bun run build` before deletion
2. Delete prerendered system, measure again
3. Verify generated `_site` output does not include `/search/` subdirectories under categories
4. Verify category pages still include functional filter UI

### Manual end-to-end

1. Apply filters and confirm URL updates
2. Open filtered URL in new tab and confirm state hydration
3. Use back/forward and confirm state restoration
4. Run `bun test`

---

## Files changed

- Modify: `/src/_lib/public/ui/category-filter.js` (add URL helpers)
- Delete: `/src/pages/filtered-category-products.html`
- Delete: `/src/_lib/filters/filter-combinations.js`
- Modify: `/src/_lib/filters/category-product-filters.js`
- Modify: `/src/_lib/filters/configure-filters.js`
- Modify: `/test/unit/ui/category-filter.test.js`
- Delete: tests for removed collections

## Rollback

Restore deleted files from git history. The client-side JS and URL management are independent of page generation and continue to work regardless.
