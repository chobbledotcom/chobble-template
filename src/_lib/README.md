# _lib Directory Structure

This directory contains all JavaScript modules for the Eleventy build system, organized by concern.

## Directory Layout

```
_lib/
├── build/          # Build tooling (esbuild, SCSS compilation)
├── collections/    # Domain collections (products, events, etc.)
├── eleventy/       # Eleventy-specific plugins and config helpers
├── filters/        # URL-based filtering system for products/properties
├── media/          # Image processing and asset handling
├── scripts/        # Standalone CLI utilities
└── utils/          # Pure utility functions (no Eleventy dependencies)
```

## Import Aliases

The project uses Node.js subpath imports (defined in `package.json`) for clean imports:

```js
import { memoize } from "#utils/memoize.js";
import { configureProducts } from "#collections/products.js";
import { configureImages } from "#media/image.js";
import config from "#data/config.json" with { type: "json" };
```

Available aliases:
- `#data/*` - `./src/_data/*`
- `#lib/*` - `./src/_lib/*`
- `#collections/*` - `./src/_lib/collections/*`
- `#filters/*` - `./src/_lib/filters/*`
- `#eleventy/*` - `./src/_lib/eleventy/*`
- `#build/*` - `./src/_lib/build/*`
- `#media/*` - `./src/_lib/media/*`
- `#utils/*` - `./src/_lib/utils/*`

## Conventions

### Eleventy Plugin Files
Files that register with Eleventy should export a `configureX` function:

```js
export function configureProducts(eleventyConfig) {
  eleventyConfig.addCollection("products", ...);
  eleventyConfig.addFilter("getProductsByCategory", ...);
}
```

### Directory Details

#### `build/`
Build-time tooling that runs during the Eleventy build process:
- `esbuild.js` - JavaScript bundling
- `scss.js` - SCSS compilation
- `theme-compiler.js` - Compiles theme SCSS files for theme-switcher

#### `collections/`
Domain-specific collections and their associated filters:
- `products.js` - Products, reviews, SKUs
- `properties.js` - Property listings
- `events.js` - Event categorization (upcoming/past/recurring)
- `categories.js` - Category management with inherited images
- `guides.js` - Guide categories and pages
- `menus.js` - Restaurant menu system
- `locations.js` - Location/area handling
- `navigation.js` - Site navigation
- `search.js` - Product keyword search
- `tags.js` - Tag extraction

#### `eleventy/`
Eleventy-specific configuration helpers:
- `cache-buster.js` - URL cache busting for production
- `external-links.js` - External link handling (target="_blank")
- `feed.js` - RSS feed configuration
- `file-utils.js` - File existence checks, snippet rendering
- `ical.js` - iCal generation for events
- `layout-aliases.js` - Auto-registers layout aliases
- `opening-times.js` - Opening times shortcode/filter
- `recurring-events.js` - Recurring events shortcode/filter

#### `filters/`
URL-based filtering system:
- `item-filters.js` - Generic filtering factory (used by products and properties)
- `product-filters.js` - Product-specific filter configuration
- `property-filters.js` - Property-specific filter configuration

#### `media/`
Image and asset processing:
- `image.js` - Responsive images, lazy loading, blurry placeholders
- `inline-asset.js` - Inline SVG and images into HTML
- `unused-images.js` - Reports unused images after build

#### `scripts/`
Standalone CLI utilities (not part of the build):
- `add-skus.js` - Add unique SKUs to product options

#### `utils/`
Pure utility functions with no Eleventy dependencies:
- `memoize.js` - Caching wrapper
- `sorting.js` - Collection sorting utilities
- `slug-utils.js` - Slug normalization and permalink building
- `schema-helper.js` - Schema.org/structured data helpers
