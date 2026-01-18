# Unified HTML Transform Plan

## Goal
Parse each HTML file once, apply all transforms in sequence, serialize once.

## Current State (6 separate DOM parses per file)

```
HTML File → linkifyUrls → parse/serialize
         → linkifyEmails → parse/serialize
         → linkifyPhones → parse/serialize
         → externalLinks → parse/serialize
         → responsiveTables → parse/serialize
         → processImages → parse/serialize
```

## Target State (1 DOM parse per file)

```
HTML File → parse once → linkifyUrls
                       → linkifyEmails
                       → linkifyPhones
                       → externalLinks
                       → responsiveTables
                       → processImages (async)
         → serialize once
```

---

## New File: `src/_lib/eleventy/html-transform.js`

### Responsibilities
1. Register single Eleventy transform
2. Load config once (memoized)
3. Parse DOM once per HTML file
4. Run transform pipeline in order
5. Serialize once

### Transform Pipeline (in order)

| Step | Function | Config Flag | Notes |
|------|----------|-------------|-------|
| 1 | `linkifyUrls` | always | Auto-link bare URLs in text |
| 2 | `linkifyEmails` | always | Auto-link email addresses |
| 3 | `linkifyPhones` | `phoneNumberLength > 0` | Auto-link phone numbers |
| 4 | `addExternalLinkAttrs` | `externalLinksTargetBlank` | Add target="_blank" |
| 5 | `wrapTables` | always | Wrap tables in scrollable div |
| 6 | `processImages` | always | Replace img with picture (async) |

---

## Files to Create/Modify

### Create
- `src/_lib/eleventy/html-transform.js` - Main unified transform
- `src/_lib/transforms/linkify.js` - URL/email/phone linkification
- `src/_lib/transforms/external-links.js` - External link attributes
- `src/_lib/transforms/responsive-tables.js` - Table wrapping
- `src/_lib/transforms/images.js` - Image processing

### Modify
- `.eleventy.js` - Remove individual transform registrations, add single `configureHtmlTransform`
- `src/_lib/eleventy/external-links.js` - Keep only the filter, remove transforms
- `src/_lib/eleventy/responsive-tables.js` - Delete or repurpose
- `src/_lib/media/image.js` - Remove transform registration, keep shortcode

---

## Transform Function Signatures

Each transform is a function that mutates the document in place:

```javascript
// Sync transforms
const linkifyUrls = (document, config) => { /* mutate document */ };
const linkifyEmails = (document, config) => { /* mutate document */ };
const linkifyPhones = (document, config) => { /* mutate document */ };
const addExternalLinkAttrs = (document, config) => { /* mutate document */ };
const wrapTables = (document, config) => { /* mutate document */ };

// Async transform (image processing)
const processImages = async (document, config, processImageFn) => { /* mutate document */ };
```

---

## Main Transform Implementation

```javascript
// src/_lib/eleventy/html-transform.js

import { loadDOM } from "#utils/lazy-dom.js";
import configModule from "#data/config.js";
import { memoize } from "#utils/memoize.js";

import { linkifyUrls, linkifyEmails, linkifyPhones } from "#transforms/linkify.js";
import { addExternalLinkAttrs } from "#transforms/external-links.js";
import { wrapTables } from "#transforms/responsive-tables.js";
import { processImages } from "#transforms/images.js";

const getConfig = memoize(configModule);

const configureHtmlTransform = (eleventyConfig, processImageFn) => {
  eleventyConfig.addTransform("htmlTransform", async (content, outputPath) => {
    // Skip non-HTML
    if (!outputPath?.endsWith(".html")) return content;
    if (!content) return content;

    // Skip feeds
    if (outputPath.includes("/feed.")) return content;

    const config = await getConfig();
    const dom = await loadDOM(content);
    const { document } = dom.window;

    // Sync transforms
    linkifyUrls(document, config);
    linkifyEmails(document, config);

    if (config.phoneNumberLength > 0) {
      linkifyPhones(document, config);
    }

    if (config.externalLinksTargetBlank) {
      addExternalLinkAttrs(document, config);
    }

    wrapTables(document, config);

    // Async transform (images)
    await processImages(document, config, processImageFn);

    return dom.serialize();
  });
};
```

---

## Migration Steps

1. Create `src/_lib/transforms/` directory
2. Extract transform logic into pure functions
3. Create `html-transform.js` with unified pipeline
4. Update `.eleventy.js` to use new system
5. Remove old transform registrations
6. Run tests
7. Profile to verify improvement

---

## Config Flags Summary

| Flag | Default | Effect |
|------|---------|--------|
| `externalLinksTargetBlank` | `null` (false) | Skip external link transform |
| `phoneNumberLength` | `null` (11) | 0 = skip phone transform |

---

## Expected Performance Improvement

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| DOM parses per file | 6 | 1 | 83% |
| DOM serializations per file | 6 | 1 | 83% |
| happy-dom time (272 files) | ~13s | ~2-3s | 77-85% |

---

## Stage 2 Considerations (Future)

Liquid shortcodes that could become DOM transforms:
- `{% iconify %}` - Could insert icons via DOM
- Schema.org JSON-LD injection
- Meta tag generation

However, these are already efficient as shortcodes since they run during template rendering, not as post-processing. The main benefit of DOM transforms is for content that needs to analyze/modify the rendered HTML.
