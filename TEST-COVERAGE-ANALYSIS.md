# Test Coverage Analysis

**Date:** 2026-02-04
**Test suite:** 2,181 tests across 143 files, all passing (75.73s)
**Source files in `src/_lib/`:** ~123 JS files
**Files with dedicated unit tests:** ~84
**Files without tests:** ~39

> **Note:** Bun's `--coverage` flag reports 100% on files imported by tests,
> but files never imported by any test are excluded from the report entirely.

---

## Well-Tested Areas (no action needed)

| Module | Source Files | Tests | Notes |
|--------|-------------|-------|-------|
| collections/ | 12 | 13 | All collection types covered |
| transforms/ | 5 | 5 | Full 1:1 coverage |
| build/ | 5 | 7 | Theme compiler, SCSS, etc. |
| utils/ | 20 | 22 | Comprehensive utility coverage |

---

## High-Priority Gaps

### 1. Cart & E-commerce (`src/_lib/public/cart/`, `public/utils/`)

**Risk: Business-critical logic with zero test coverage.**

| File | What it does | Testable? |
|------|-------------|-----------|
| `cart/cart.js` | Cart state management — add/remove/update, totals, PayPal/Stripe | Yes — core business logic |
| `utils/cart-utils.js` | `getCart()`, `saveCart()`, `formatPrice()`, `updateCartIcon()` | Yes — localStorage + pure functions |
| `utils/cart-renderer.js` | Factory for rendering cart/quote items from templates | Yes — template logic |
| `cart/stripe-checkout.js` | Stripe redirect flow, session creation | Yes — error handling paths |

**Why this matters:** A cart calculation bug directly affects revenue. This is the
single most important gap in the test suite.

### 2. Filter Engine (`src/_lib/filters/`)

**3 of 7 filter files have tests. The core engine does not.**

| File | What it does | Testable? |
|------|-------------|-----------|
| `filter-combinations.js` | Recursive algorithm generating all valid filter combinations | Yes — algorithmic, fragile |
| `filter-core.js` | `normalize()`, `parseFilterAttributesInner()`, `buildItemLookup()` | Yes — foundational utilities |
| `filter-ui.js` | Path lookups, filter descriptions for UI rendering | Yes — data transformations |

**Why this matters:** The tested files (`category-product-filters`, `item-filters`,
`spec-filters`) cover higher-level filter types, but the foundational engine they
depend on has no tests. Regressions in `filter-core` silently break all filters.

### 3. Image Pipeline (`src/_lib/media/`)

**7 of 14 media files have tests. The core pipeline does not.**

| File | What it does | Testable? |
|------|-------------|-----------|
| `image.js` | Main pipeline — external URLs, cropping, LQIP, `<picture>` elements | Yes — multiple conditional paths |
| `image-crop.js` | Aspect ratio cropping with MD5 cache, concurrent write dedup | Yes — caching logic |
| `image-lqip.js` | LQIP extraction — size checks, base64 encoding, width filtering | Yes — encoding logic |
| `inline-asset.js` | SVG/image inlining with extension validation | Yes — error paths |
| `unused-images.js` | Regex-based detection of unused images | Yes — regex patterns |

**Why this matters:** Image processing affects every page. The existing tests cover
helpers (`image-utils`, `image-placeholder`, `image-external`, etc.) but not the
main orchestration pipeline.

### 4. Configuration Validation (`src/_lib/config/`)

**0 of 5 config files have tests.**

| File | What it does | Testable? |
|------|-------------|-----------|
| `validated-config.js` | Validates URL format, currency codes, cart modes | Yes — clear pass/fail paths |

`site-config.js` and `helpers.js` are trivial wrappers not worth testing.
`validated-config.js` is the exception — it contains meaningful validation rules
that are the first line of defense against misconfiguration.

### 5. PDF Generation (`src/_lib/eleventy/pdf.js`)

Complex functional composition: filters categories/items, handles dietary symbols,
builds PDF layout data. Regressions are hard to notice without tests.

---

## Medium-Priority Gaps

### Browser UI Components (`src/_lib/public/ui/`)

These files contain testable pure/near-pure logic mixed with DOM manipulation:

| File | Testable logic |
|------|---------------|
| `slider-core.js` | `getScrollAmount()`, `createStateUpdater()` — pure scroll math |
| `search.js` | Input normalization, keyword matching |
| `shuffle-properties.js` | Seeded shuffle algorithm with 24h cache |
| `tabs.js` | Tab state management, hash navigation |
| `theme-switcher.js` | Theme cycling logic, localStorage persistence |

### Eleventy Plugins (minor gaps)

| File | Testable logic |
|------|---------------|
| `file-utils.js` | `renderSnippet()` — async markdown rendering with memoization |
| `recurring-events.js` | Frontmatter parsing and recurring event filtering |

### Missing Integration Tests

- **Cart checkout flow** — no integration test for cart → checkout → payment
- **Filter URL generation** — filter engine generates URL paths; no test verifies routing
- **Theme compilation** — unit tests exist, but no integration test checks all 10 themes produce valid CSS

---

## Low Priority (not worth testing)

These files are trivial wrappers, pure configuration, or better suited for e2e:

- `eleventy/feed.js`, `format-price.js`, `cache-buster.js`, `video.js` — plugin registration
- `filters/configure-filters.js` — wiring code
- `config/site-config.js`, `config/helpers.js` — transparent wrappers
- `public/bundle.js`, `on-ready.js`, `sort-dropdown.js` — minimal logic
- `public/design-system.js`, `gallery.js`, `scroll-fade.js`, `mobile-menu-collapse.js` — DOM event handling best tested via e2e
- `media/browser-utils.js`, `lighthouse.js` — infrastructure/integration tooling

---

## Recommended Priority Order

1. **Cart + e-commerce** (`cart.js`, `cart-utils.js`, `cart-renderer.js`) — revenue impact
2. **Filter engine** (`filter-core.js`, `filter-combinations.js`) — algorithmic fragility
3. **Image pipeline** (`image.js`, `image-crop.js`, `image-lqip.js`) — affects every page
4. **Config validation** (`validated-config.js`) — defends against misconfiguration
5. **PDF generation** (`pdf.js`) — complex data transformation
6. **Browser utilities** (`slider-core.js`, `http.js`, `search.js`, `shuffle-properties.js`) — easy wins

---

## Summary

| Priority | Files | Estimated Tests Needed |
|----------|-------|----------------------|
| High | 11 files | ~40-60 tests |
| Medium | 7 files | ~20-30 tests |
| Low | ~21 files | Not recommended |
| **Total actionable** | **18 files** | **~60-90 tests** |
