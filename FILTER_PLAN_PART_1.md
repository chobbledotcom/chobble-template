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

### 1. Add `filter_data` computed property

**File**: `/src/_data/eleventyComputed.js` (MODIFY)

Add a new computed property that builds the filter payload for every item. This follows the existing pattern (e.g. `filter_attributes` on line 76, `meta` on line 146).

```javascript
import { parseFilterAttributes } from "#filters/filter-core.js";

// Add to the export default object:

/**
 * Pre-computed filter data for client-side filtering.
 * Added to all items so properties can use it in the future.
 * @param {import("#lib/types").EleventyComputedData} data - Page data
 * @returns {{ slug: string, title: string, price: number, filters: Record<string, string> }}
 */
filter_data: (data) => {
  const options = data.options;
  const price =
    !Array.isArray(options) || options.length === 0
      ? 0
      : Math.min(...options.map((o) => o.unit_price || 0));

  return {
    slug: data.page?.fileSlug ?? "",
    title: (data.title ?? "").toLowerCase(),
    price,
    filters: parseFilterAttributes(data.filter_attributes),
  };
},
```

**Why add to all items:**

- Properties will eventually need the same data.
- The computed property is cheap (just reads existing fields).
- Adding it everywhere means `list-item.html` doesn't need to worry about whether the item has `filter_data` - it always does.

### 2. Serialize to HTML-safe attribute on product list items only

**File**: `/src/_includes/list-item.html` (MODIFY)

Add an Eleventy filter to safely serialize the JSON, and gate the attribute on products:

```liquid
{%- assign isProduct = item.data.tags contains "products" -%}
<li{% if isProduct %} data-filter-item="{{ item.data.filter_data | toFilterJsonAttr }}"{% endif %}>
```

The `toFilterJsonAttr` filter handles HTML entity escaping.

### 3. Register the serialization filter

**File**: `/src/_lib/eleventy/item-filter-data.js` (NEW)

A minimal filter - just the HTML escaping. No data building logic (that's in `eleventyComputed.js`).

```javascript
const toAttributeJson = (value) =>
  JSON.stringify(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const configureItemFilterData = (eleventyConfig) => {
  eleventyConfig.addFilter("toFilterJsonAttr", toAttributeJson);
};
```

### 4. Register in `.eleventy.js`

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

- `toFilterJsonAttr` escapes quotes, ampersands, angle brackets
- Round-trips through `JSON.parse` after unescaping

**File**: `/test/unit/eleventy/eleventyComputed.test.js` (MODIFY or NEW)

Cover:

- `filter_data` title lowercasing
- `filter_data` lowest option price extraction
- `filter_data` slugified filters via `parseFilterAttributes`
- `filter_data` missing `filter_attributes` produces `filters: {}`
- `filter_data` missing `options` produces `price: 0`

### Manual verification

1. `bun run build`
2. `bun run serve` and open a category page
3. Confirm product `<li>` nodes have `data-filter-item`
4. Confirm at least one product without `filter_attributes` still has `data-filter-item`
5. Confirm event/news/property `<li>` nodes do not have `data-filter-item`
6. Confirm no template/console errors

---

## Files changed

- Modify: `/src/_data/eleventyComputed.js` (add `filter_data` computed property)
- Create: `/src/_lib/eleventy/item-filter-data.js` (HTML-escaping filter only)
- Modify: `.eleventy.js` (register filter)
- Modify: `/src/_includes/list-item.html` (add data attribute)
- Create/modify: test files

## Rollback

Remove `filter_data` from `eleventyComputed.js`, remove `data-filter-item` from `list-item.html`, remove filter registration from `.eleventy.js`, delete new filter file.
