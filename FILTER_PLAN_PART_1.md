# Stage 1: Foundation - Data Attribute Infrastructure

## Goal

Add `data-filter-item` JSON attributes to product list items without affecting existing functionality. This stage creates the data layer that will power client-side filtering.

## Success Criteria

✅ Each `<li>` in category pages has `data-filter-item` with valid JSON
✅ JSON includes: slug, title, price, order, filters
✅ Build completes successfully
✅ Existing filter pages still work (no breaking changes)
✅ Unit tests pass for JSON generation

## Implementation Steps

### 1. Create Eleventy Filter Plugin

**File**: `/src/_lib/eleventy/item-filter-data.js` (NEW)

```javascript
import { parseFilterAttributes } from "#filters/filter-core.js";

const getLowestPrice = (options) => {
  if (!options?.length) return 0;
  return Math.min(...options.map(o => o.unit_price || 0));
};

const buildFilterData = (item, index) => ({
  slug: item.fileSlug,
  title: item.data.title.toLowerCase(),
  price: getLowestPrice(item.data.options),
  order: index,
  filters: parseFilterAttributes(item.data.filter_attributes || []),
});

export const configureItemFilterData = (eleventyConfig) => {
  eleventyConfig.addFilter("toFilterJson", (item, index) =>
    JSON.stringify(buildFilterData(item, index))
  );
};
```

### 2. Register Plugin

**File**: `.eleventy.js` (MODIFY)

```javascript
import { configureItemFilterData } from "#eleventy/item-filter-data.js";

// Add after other filter registrations (around line 36)
configureItemFilterData(eleventyConfig);
```

### 3. Update List Item Template

**File**: `/src/_includes/list-item.html` (MODIFY)

**Before**:
```liquid
<li>
  {%- for field in listItemFields -%}
```

**After**:
```liquid
<li data-filter-item="{{ item | toFilterJson: forloop.index0 }}">
  {%- for field in listItemFields -%}
```

**Note**: `forloop.index0` comes from the parent loop in `items.html`

## Testing

### Unit Tests

**File**: `/test/unit/eleventy/item-filter-data.test.js` (NEW)

```javascript
import { describe, expect, test } from "bun:test";
import { configureItemFilterData } from "#eleventy/item-filter-data.js";

describe("toFilterJson filter", () => {
  let toFilterJson;

  // Mock Eleventy config to extract the filter
  const mockConfig = {
    addFilter: (name, fn) => {
      if (name === "toFilterJson") toFilterJson = fn;
    },
  };

  configureItemFilterData(mockConfig);

  test("generates valid JSON with all required fields", () => {
    const item = {
      fileSlug: "test-product",
      data: {
        title: "Test Product",
        options: [{ unit_price: 99.99 }, { unit_price: 79.99 }],
        filter_attributes: [
          { name: "Size", value: "Large" },
          { name: "Color", value: "Blue" },
        ],
      },
    };

    const json = toFilterJson(item, 5);
    const parsed = JSON.parse(json);

    expect(parsed.slug).toBe("test-product");
    expect(parsed.title).toBe("test product");
    expect(parsed.price).toBe(79.99); // lowest price
    expect(parsed.order).toBe(5);
    expect(parsed.filters).toEqual({
      size: "large",
      color: "blue",
    });
  });

  test("handles items without options", () => {
    const item = {
      fileSlug: "no-options",
      data: {
        title: "No Options Item",
        filter_attributes: [],
      },
    };

    const json = toFilterJson(item, 0);
    const parsed = JSON.parse(json);

    expect(parsed.price).toBe(0);
    expect(parsed.filters).toEqual({});
  });

  test("handles items with empty filter_attributes", () => {
    const item = {
      fileSlug: "test",
      data: {
        title: "Test",
        options: [{ unit_price: 10 }],
        filter_attributes: null,
      },
    };

    const json = toFilterJson(item, 0);
    const parsed = JSON.parse(json);

    expect(parsed.filters).toEqual({});
  });

  test("lowercases title for case-insensitive sorting", () => {
    const item = {
      fileSlug: "test",
      data: {
        title: "UPPERCASE TITLE",
        filter_attributes: [],
      },
    };

    const json = toFilterJson(item, 0);
    const parsed = JSON.parse(json);

    expect(parsed.title).toBe("uppercase title");
  });
});
```

### Manual Verification

1. **Build the site**:
   ```bash
   bun run build
   ```

2. **Start dev server**:
   ```bash
   bun run serve
   ```

3. **Inspect HTML** (navigate to `/categories/widgets/`):
   - Open DevTools → Elements
   - Find a `<li>` element in the products list
   - Verify it has `data-filter-item` attribute
   - Verify the JSON is valid and complete

4. **Check for regressions**:
   - Existing filter pages should still work (`/categories/widgets/search/size/small/`)
   - Products should still display correctly
   - Cart buttons should still work

### Expected Output

**HTML should look like**:
```html
<li data-filter-item='{"slug":"widget-pro","title":"widget pro","price":99.99,"order":0,"filters":{"size":"large","type":"premium"}}'>
  <a class="image-link" href="/products/widget-pro/#content">
    <img src="..." alt="Widget Pro">
  </a>
  <h3><a href="/products/widget-pro/#content">Widget Pro</a></h3>
  <p class="price">£99.99</p>
  ...
</li>
```

## Files Changed

- ✅ Created: `/src/_lib/eleventy/item-filter-data.js` (~25 lines)
- ✅ Created: `/test/unit/eleventy/item-filter-data.test.js` (~80 lines)
- ✅ Modified: `.eleventy.js` (+2 lines)
- ✅ Modified: `/src/_includes/list-item.html` (+1 line change)

## Rollback Plan

If issues arise:
1. Remove import from `.eleventy.js`
2. Remove `data-filter-item` from `list-item.html`
3. Delete `item-filter-data.js`
4. Run `bun run build`

No existing functionality is affected - data attributes are purely additive.

## Next Stage

Stage 2 will create the client-side filtering engine that reads and uses this data.
