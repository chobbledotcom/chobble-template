# Stage 4 (v2): URL Management, Migration, and Build-Time Reduction

## Goal

Add URL state support (bookmark/share/back-forward), then migrate away from prerendered filter pages behind a feature flag without breaking existing routes.

## Prerequisites

- Stages 1-3 complete and stable

## Success Criteria

- URL updates on filter/sort changes
- Direct filtered URLs hydrate correctly on page load
- Browser back/forward restores UI state
- Feature flag can disable prerendered filter pages safely
- Build time decreases when prerendered pages are disabled
- Old `/search/...` URLs are handled via explicit routing strategy
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

### 3. Enable feature flag

**File**: `/src/_data/config.json` (MODIFY)

```json
"client_side_filters": true
```

### 4. Split category filter data from page generation

**Files**:

- `/src/_lib/filters/category-product-filters.js` (MODIFY)
- `/src/_lib/filters/configure-filters.js` (MODIFY)

Required architecture change:

- separate "UI-support data" (`attributes`, `listingUI`) from "page/redirect generation" (`pages`, `redirects`)
- in `client_side_filters` mode, register only the lightweight collections/filters needed for UI render
- do not call full-page generation paths in client-side mode

This is necessary for real build-time gains.

### 5. Define old URL compatibility strategy

Old URLs like `/categories/widgets/search/size/small/` only work after prerender removal if routing supports it.

Choose one migration mode:

- **Preferred**: host rewrite from `/categories/:slug/search/*` to `/categories/:slug/` while preserving URL in browser
- **Fallback**: keep generating compatibility search pages until rewrite support is available

Do not claim "old URLs handled gracefully" without one of these in place.

### 6. Delay destructive cleanup

Do not remove legacy files (for example `src/pages/filtered-category-products.html`) until:

- rewrite/compat mode is proven in production
- monitoring confirms no route breakage

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

1. Measure `time bun run build` with flag off
2. Measure again with flag on
3. Verify generated `_site` output does not include full category search page tree when disabled
4. Verify category pages still include functional filter UI

### Manual end-to-end

1. Apply filters and confirm URL updates
2. Open filtered URL in new tab and confirm state hydration
3. Use back/forward and confirm state restoration
4. Validate old bookmarked `/search/...` URLs under chosen compatibility mode
5. Run `bun test`

---

## Files changed

- Modify: `/src/_lib/public/ui/category-filter.js`
- Modify: `/src/_data/config.json`
- Modify: `/src/_lib/filters/category-product-filters.js`
- Modify: `/src/_lib/filters/configure-filters.js`
- Modify: `/test/unit/ui/category-filter.test.js`

Optional compatibility routing/config files depend on deployment platform.

## Rollback

Set `client_side_filters` to `false` and rebuild. Server-generated filter pages become the primary behavior again.
