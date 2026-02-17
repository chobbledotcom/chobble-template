# Stage 1 (v2): Foundation - Safe Data Attribute Infrastructure

## Goal

Add reliable, HTML-safe `data-filter-item` payloads to product list items. This creates the client-side data layer without affecting non-filterable content types.

## Success Criteria

- Every product `<li>` has `data-filter-item`
- `data-filter-item` JSON is HTML-attribute safe
- Payload includes: slug, title, price, filters
- Products with no `filter_attributes` still get payload with `filters: {}`
- Non-product items (events/news/properties/etc.) are untouched
- Build completes, existing filter pages still work, unit tests pass

---

## Implementation Steps

### 1. Create Eleventy filter plugin

**File**: `/src/_lib/eleventy/item-filter-data.js` (NEW)

```javascript
import { parseFilterAttributes } from "#filters/filter-core.js";

const getLowestOptionPrice = (options) => {
  if (!Array.isArray(options) || options.length === 0) return 0;
  return Math.min(...options.map((o) => o.unit_price || 0));
};

const toAttributeJson = (value) =>
  JSON.stringify(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const buildFilterData = (item) => ({
  slug: item.fileSlug,
  title: item.data.title.toLowerCase(),
  price: getLowestOptionPrice(item.data.options),
  filters: parseFilterAttributes(item.data.filter_attributes),
});

export const configureItemFilterData = (eleventyConfig) => {
  eleventyConfig.addFilter("toFilterJsonAttr", (item) =>
    toAttributeJson(buildFilterData(item)),
  );
};
```

**Key decisions:**

- JSON is escaped for safe embedding in HTML attributes.
- Price is extracted from product options (lowest `unit_price`).
- Missing `filter_attributes` is valid and maps to `filters: {}`.
- No `order` in payload; DOM position is source of truth for default ordering.
- Properties are out of scope for this stage - only products get the attribute.

### 2. Add attribute to filterable list items only

**File**: `/src/_includes/list-item.html` (MODIFY)

```liquid
{%- assign isProduct = item.data.tags contains "products" -%}
<li{% if isProduct %} data-filter-item="{{ item | toFilterJsonAttr }}"{% endif %}>
```

**Why this conditional:**

- `list-item.html` is shared by multiple content types.
- Only products need the filter data attribute.
- Properties are out of scope - they'll be handled in a future update.

### 3. Register plugin in `.eleventy.js`

**File**: `.eleventy.js` (MODIFY)

```javascript
import { configureItemFilterData } from "#eleventy/item-filter-data.js";
```

Add registration near other filters/plugins:

```javascript
configureItemFilterData(eleventyConfig);
```

---

## Testing

### Unit tests

**File**: `/test/unit/eleventy/item-filter-data.test.js` (NEW)

Cover at minimum:

- title lowercasing
- lowest option price extraction
- slugified `filters` via `parseFilterAttributes`
- missing `filter_attributes` produces `{}`
- output is attribute-safe (quotes escaped)

### Manual verification

1. `bun run build`
2. `bun run serve` and open a category page
3. Confirm product `<li>` nodes have `data-filter-item`
4. Confirm at least one product without `filter_attributes` still has `data-filter-item`
5. Confirm event/news/property `<li>` nodes do not have `data-filter-item`
6. Confirm no template/console errors

---

## Files changed

- Create: `/src/_lib/eleventy/item-filter-data.js`
- Create: `/test/unit/eleventy/item-filter-data.test.js`
- Modify: `.eleventy.js`
- Modify: `/src/_includes/list-item.html`

## Rollback

Remove `data-filter-item` from `list-item.html`, remove plugin import/registration from `.eleventy.js`, delete new plugin/test files.
