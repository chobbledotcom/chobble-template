# Layouts

This is the hand-authored architecture and layout companion to the generated
[Block Reference](blocks.md). The generator owns all of `blocks.md` and does not
rewrite this file. Per-block facts and placement constraints belong in that
reference, not in a duplicated list here. Source paths below are relative to the
repository root.

## Rendering Architecture

```text
frontmatter blocks[]
  -> src/_layouts/base.html
  -> design-system/blocks.html
  -> design-system/render-full-width-block.html (before/rest only)
  -> design-system/render-block.html
  -> resolved block template
```

Include paths above are relative to `src/_includes/`. `base.html` provides the
HTML shell, applies `.design-system` to the body, and loads the CSS/JS bundles.
It renders page content, page blocks, and then any `footer-content` snippet
blocks inside `<main>`. A separate footer include supplies the site footer.
Pages using `base.html` directly must put authored content in frontmatter blocks;
nonempty page body content fails validation. Intermediate layouts may provide
their rendered content to the base shell.

`blocks.html` resolves Liquid strings, then applies the tag-matched layout from
`src/_data/blockLayouts.json`. The `before` and remaining blocks use
`render-full-width-block.html`; column blocks go directly to the router.
`render-block.html` uses the `blockTemplate` filter and a dynamic include, not a
Liquid `case` statement. `getBlockTemplate()` in
`src/_lib/utils/block-schema.js` resolves the default path or a module override;
several split variants share `design-system/split.html`.

The full-width renderer captures the inner output first. Empty output produces
no section. A `snippet` is transparent: it adds no section of its own, and its
inner blocks render through the block pipeline. Other nonempty blocks get a
`<section>` with optional `dark` and `compact` classes. The `blockContainerWidth`
filter uses the module's width, defaulting to `wide`; `full` omits the container
wrapper.

Before any of this, every authored block array (page frontmatter, `snippet`
blocks, the footer and sidebar snippets) is validated and has its omitted
fields filled from the schema `default`s, nested fields included. Templates
read those values directly rather than restating defaults. See the generated reference for every resolved width and template.

## Multi-Column Layouts

Add entries to `src/_data/blockLayouts.json`, keyed by page tags such as `news`
or `pages`. Tags are checked in page order and the first matching layout wins.
Both `before` and `columns` are optional. An empty config disables this feature.
The layout applies whenever `blocks.html` processes a block array, not merely
to a page's first section; footer and nested snippet block arrays also use it.

```json
{
  "news": {
    "before": ["hero"],
    "columns": [
      { "types": ["gallery"] },
      { "types": ["markdown", "features"] }
    ]
  }
}
```

### Matching Semantics

- `before` is a claim queue processed first. Each type claims the first unclaimed matching block in page order. Claimed blocks render full-width in slot order, not original page order.
- Each column's `types` is another claim queue. Columns and their slots are processed in config order. Repeating a type, within one queue or across columns, claims successive matching blocks.
- Blocks inside each column render in slot order. For example, `["markdown", "cta", "markdown"]` places the first markdown, then the first CTA, then the second markdown.
- Unclaimed blocks, including extra duplicates and unlisted types, render full-width below the columns in original order.
- Slots with no matching block claim nothing. If no column claims a block, columns mode is disabled for that array. Any claimed `before` blocks still render first.

### Placement and Rendering

Use the [generated compatibility table](blocks.md#column-and-sidebar-compatibility)
to choose column-safe types. Full-viewport and split-layout types are rejected
in columns; they are allowed in full-width `before` slots. Each schema module
opts out with `export const columnSafe = false`, and a layout naming an
unregistered type fails the build. The implementation lives in
`src/_lib/utils/block-columns.js`.

Column output uses a `section.block-columns-section`, a `.container-wide`, and
a `.block-columns.block-columns-N` grid. Each `.block-column` stacks children
with consistent spacing. Below the `md` breakpoint the columns become one stack.
Individual children do not get full-width section wrappers, dark backgrounds,
or compact-section padding from their common wrapper fields.

## Site-Wide Sidebar

Create `src/snippets/right-content.md` to add an
`<aside class="right-column">` beside `<main>` on pages using `base.html`.
File presence is the switch; no page flag is needed. The body gets `two-columns`
instead of `one-column`. The `.page-columns` grid activates at `lg`; below that
the sidebar stacks under the main content. `--right-column-width` at `:root`
defaults to `16rem` and can be overridden by the theme.

- **Blocks:** A nonempty `blocks:` frontmatter array renders directly through `render-block.html`, without normal full-width section wrappers. The same placement check used by columns rejects unsafe top-level types with a build error naming the right-content sidebar. Choose context-appropriate content for any referenced snippet too.
- **Markdown:** Without sidebar blocks, the snippet body renders inside `.prose`. The current `render_snippet` path renders Markdown; it does not run the body through Liquid shortcode expansion. Use sidebar block strings when page-context Liquid interpolation is needed.

The sidebar is a sibling of `<main>`, not its child. Pages using
`data-pagefind-body` on `<main>` exclude sidebar text from that search body.
The shared sidebar and per-tag block columns compose: `.page-columns` wraps
whatever the main block layout renders.

### Banner Hoisting

With the sidebar active, a page's first block is hoisted above `.page-columns`
only when its type is `image-background`. This spans content plus sidebar.
Remaining blocks render in `<main>`. No sidebar means no hoisting; later banners
are not hoisted. See `src/_lib/utils/sidebar-blocks.js` and
`src/_includes/design-system/hoisted-banner.html`.

## Styling and Components

Design-system component rules are scoped under `.design-system`; themeable CSS
custom properties are declared at `:root` so themes can override them through
the cascade. `src/css/_variables.scss` defines Sass defaults, and
`src/css/design-system/_base.scss` emits tokens and base rules. Prefer theme
overrides to changes in core design-system files.

### Sections and Containers

Sections use the section mixin and themeable padding tokens, with reduced
padding on small screens. `compact` uses its own padding tokens. Dark sections set a dark palette, and
eligible even-positioned sections receive alternating backgrounds via
`:nth-child(even)` selectors. Sections containing `.split-full` or a direct
`.hero` have zero outer padding because those components handle their spacing.

`.container` supplies the default content width, `.container-wide` is the
default block wrapper, and `.container-narrow` supplies prose width. A `full`
block has no container wrapper. See the checkout's
[Sass defaults](../../../src/css/_variables.scss)
for source width values rather than copying them into this guide.

### Icons and Images

`src/_includes/design-system/icon.html` delegates to the `renderIcon` filter.
Iconify IDs such as `hugeicons:home-01` produce build-time fetched and cached SVG,
not a browser web component. A leading `/` selects an image path; other input
can be raw content such as an emoji, HTML entity, or inline SVG.
`src/_includes/design-system/icon-badge.html` provides a tinted badge wrapper.
Icon styles live in `src/css/design-system/_icon.scss`.

Block images generally use the `{% image %}` shortcode for responsive formats,
sizes, and placeholders. Consult the block's schema and canonical example for
image paths, alt text, aspect ratios, and caption fields.

### Layout and Interaction Primitives

- `.features` uses an auto-fit card grid. `.grid`, `.grid--2`, and `.grid--4` provide responsive general-purpose grids.
- Buttons combine `.btn` with `.btn--primary`, `.btn--secondary`, or `.btn--ghost`; `.btn--sm` and `.btn--lg` select sizes.
- `.prose` supplies rich-text spacing and list styling. `.stack`, `.stack--sm`, `.text-center`, and `.text-muted` supply simple layout and text utilities.
- `data-reveal` supports fade-up (empty value), `left`, `right`, and `scale`. IntersectionObserver adds `.is-visible`; reduced-motion preferences disable motion.

### Token Defaults

Read [Sass defaults](../../../src/css/_variables.scss) for spacing, typography,
radii, and widths, and [breakpoints](../../../src/css/_breakpoints.scss) for responsive thresholds.
The active [theme.scss](../../../src/css/theme.scss) contains custom-property
overrides; other themes live in [src/css/](../../../src/css/). Source expressions and Sass defaults
are not computed browser values; inspect rendered output when changing themes.

## Source and Gallery

The [Block Reference](blocks.md) lists schema, component, resolved template,
and available per-block SCSS paths. The registry in
`src/_lib/utils/block-schema.js` is the single source of block definitions;
`src/_lib/eleventy/blocks.js` registers the routing and layout filters.

`src/pages/blocks.md` uses `src/_lib/utils/block-gallery.js` to show canonical
`BLOCK_EXAMPLES` as YAML and live previews. Context-dependent blocks show an
explanation instead of a standalone preview. Use this gallery to inspect block
compositions and theme changes on desktop and mobile.
