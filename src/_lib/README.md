---
permalink: false
layout: ""
---

# Library Map

This directory contains build-time and browser JavaScript for CfA Static.

The [architecture walkthrough](../../ARCHITECTURE.md) covers how these
directories fit the whole system; this map stays at the directory level.
[The root engineering guide](../../CLAUDE.md) owns handwritten policy and workflow.
The [Site Builder Reference](../../docs/developer-reference.md) covers setup,
selected site-building commands, CMS options, and authoring links. For maintainer
details, read [package.json](../../package.json) for scripts and import aliases,
[biome.json](../../biome.json) for lint configuration, and the
[FP source JSDoc](utils/fp/) for helper APIs. Test requirements live in
[the canonical criteria](../../test/TEST-QUALITY-CRITERIA.md).

## Responsibilities

| Directory | Responsibility |
| --- | --- |
| `build/` | JavaScript bundling, SCSS/theme compilation, build validation |
| `collections/` | Domain collections, normalized content defaults, navigation |
| `config/` | Configuration helpers and startup validation used by data files |
| `eleventy/` | Plugin registration, filters, block rendering, collection validation |
| `media/` | Responsive image processing, cropping/LQIP, icons, asset handling |
| `public/` | Browser code bundled through `bundle.js` |
| `transforms/` | HTML output transforms applied by `eleventy/html-transform.js` |
| `utils/` | Shared utilities, block schemas, i18n, structured data, generic `fp/` helpers |
| `types/` | Shared JSDoc/TypeScript definitions, including generated CMS types |

## Integration Points

`.eleventy.js` runs the `CONFIGURATORS` list. Modules that register Eleventy
behavior export a `configureX` function; follow the existing arrow-function
pattern. Standalone filters belong in `eleventy/filters.js`'s central registry
rather than a new module per filter. A quality gate checks that registered
filters have template consumers.

Eleventy data files cannot have named exports, so reusable configuration logic
belongs in `config/`, not in `src/_data/` modules. Site-facing configuration is
in `src/_data/config.json`, `site.json`, and `strings.json`; every
`config.json` setting is declared in `config/config-schema.js` and every
`site.json` field in `config/site-schema.js`.

Pages declare a `blocks:` array in YAML frontmatter. The registry in
`utils/block-schema.js` assembles schemas from `utils/block-schema/`; unknown
block types or top-level fields fail build validation. Nested required fields
are checked, but nested types and unknown keys are not all validated. Templates live in
`src/_includes/design-system/blocks/` and styles in `src/css/design-system/`.
Use the [block reference](../../skills/cfa-static-site-builder/references/blocks.md) and the root guide's generated
artifact workflow when extending the block system. Reusable snippets live in
`src/snippets/`; page, news, and guide content live in their corresponding
directories under `src/`.

Use Node subpath aliases for library imports, for example:

```js
import { filter, map, pipe } from "#utils/fp/array.js";
import { memoize } from "#utils/fp/memoize.js";
import { ROOT_DIR } from "#lib/paths.js";
```

Consult the [FP source JSDoc](utils/fp/) before choosing helpers.
Keep caches at module scope; the memoization module distinguishes key-based
Map caches from reference-based WeakMap caches. For images, use the shared
`media/image.js` shortcode pipeline instead of adding independent image markup
or processing paths; follow existing template calls for sizing and alt text.
