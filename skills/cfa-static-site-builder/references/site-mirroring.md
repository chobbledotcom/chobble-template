# Site Mirroring

Read this reference when rebuilding an existing website as a CfA Static fork,
page for page. Mirroring means fidelity to the source's content and visual
design, rebuilt with the block model — not reproducing its DOM. Read
[project setup](project-setup.md), [content authoring](content-authoring.md),
and the generated [block reference](blocks.md) first, and
[languages](i18n.md) when the source publishes in more than one language.

## 1. Capture The Source

1. Crawl the source sitemap. Per page, save the raw HTML, a content inventory
   in DOM order (sections, exact text, images, buttons, nav and footer lists,
   tables, meta description), and the assets under their original filenames.
   Extract the palette and typography. Keep it all in a gitignored scratch
   directory: it is read-only ground truth, never shipped.
2. Record the capture date. That snapshot is the content source of truth;
   later edits to the live site are out of scope until someone re-captures.
3. Audit the extractor against the raw HTML before trusting it. DOM walkers
   commonly drop inline links and bold inside paragraphs. List every content
   link per page with its target and treat that list as authoritative.
4. Index page pairs (one per language), placeholder pages, and oddities.
5. Note the source's redirects: the bare root and any unprefixed URLs usually
   redirect somewhere, and those URLs must keep working after cutover.

## 2. Map Pages To Blocks

Convert each language from its own inventory; never derive one language from
another. Prefer existing blocks:

| Source pattern | Block |
| --- | --- |
| "Current as of…" notice above the page | `callout` (`variant: warning`, `compact: true`) |
| Hero with heading and photo | `split-image` (`compact: true` on inner pages) |
| Prose sections | `markdown` |
| Q&A runs, accordions | `faqs` with `items`; `collapsible: true` when the source collapses them |
| Standalone or closing buttons | `link-button`, `cta` |
| Long legal text with a contents list | `markdown` per section plus `table-of-contents` |
| Side-by-side bands, card rows | `blockLayouts.json` columns keyed on a page tag |

Restore every link from the audit and re-add lost bold. Keep text verbatim,
including the source's typos and stale claims, and report them instead of
silently fixing them.

## 3. Theme And Chrome

1. Rebuild `src/css/theme.scss` as token overrides first; add component rules
   only where tokens cannot express the treatment.
2. Self-host brand fonts (see [project setup](project-setup.md#theme-and-brand)).
3. Header: set `logo` in `site.json`; set `collapse_menu: always` when the
   source opens a menu from a button at every width, and style the menu panel
   (`.site-menu`) and its buttons (`.menu-toggle`, `.menu-close`) in the
   theme. Put the language switcher where the source does with
   `language_switcher`.
4. Footer copy per language: `src/snippets/<code>/footer-content.md`.
5. Breadcrumbs: leave `show_breadcrumbs` on when the source shows a trail,
   set `--breadcrumb-separator` in the theme to match it, and opt pages out
   with `no_breadcrumbs: true` where the source has none.

None of this needs edits to `src/_includes/` or `src/_lib/`. A fork that has
to change template files to match a source has found a template gap: record
it for the template rather than carrying the change.

## 4. Live-Site Quirks

- Links: make internal links site-relative. Where the source links its own
  unprefixed URLs that redirect to a language prefix, link the prefixed URL.
- Dead links on the source: keep them as absolute URLs so the mirror behaves
  like the source, and report them.
- Placeholder pages: keep the URL with `no_index: true` and the scraped title.
- Features that cannot be carried over (tracking pixels, third-party seals):
  list them as deliberate differences.

## 5. Validate And Compare

1. `npm run build` (includes the internal link check), `npm run check:a11y`,
   and `npm run lint:scss` after theme work. Contrast and focus visibility
   need a real browser; check them there.
2. Serve `_site`, screenshot every route at desktop and mobile widths
   alongside the source, and fix theme-level differences. Scroll through each
   page before capturing so `data-reveal` fades have finished.
3. Compare per route with a pixel-diff tool over the top of the page, where
   layout still aligns, and record what remains and why.
4. Walk each page by keyboard: skip link, menu open and close, every link
   visible when focused.
