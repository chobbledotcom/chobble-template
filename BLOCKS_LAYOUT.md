# Design System Blocks Reference

Technical reference for the composable page blocks in Chobble Template's design system. Blocks are declared in YAML frontmatter and rendered by the block pipeline.

## Architecture

### Rendering Pipeline

```
frontmatter blocks[] → design-system-base.html → blocks.html → render-block.html → [block template]
```

**Layout:** `src/_layouts/design-system-base.html` applies `class="design-system"` to `<body>`, loads the design system CSS bundle, and iterates blocks via `blocks.html`.

**Block loop** (`src/_includes/design-system/blocks.html`): Each block becomes a `<section>`. If `block.section_class` is set, it's applied to the section. Unless `block.full_width` is true, content is wrapped in `<div class="container">` (max-width: 1200px, centered, responsive inline padding).

**Block router** (`src/_includes/design-system/render-block.html`): A Liquid `case` statement dispatching `block.type` to the appropriate include template.

### Common Block Properties

Every block object supports these properties (handled by blocks.html, not the individual templates):

| Property | Type | Effect |
|---|---|---|
| `type` | string | **Required.** Selects which template to render. |
| `section_class` | string | CSS class(es) on the wrapping `<section>`. Built-in: `alt` (alternate bg), `dark` (dark bg + inverted colors), `gradient` (gradient bg), `compact` (reduced padding). |
| `full_width` | boolean | If true, omits the `.container` wrapper. Block content spans the full viewport width. |

### Section Behavior

- Sections use `@mixin section` which applies `$space-3xl` (96px) vertical padding (60% on mobile).
- `section.compact` uses `$space-2xl` (64px) padding.
- `section.dark` inverts all CSS custom properties to dark palette.
- `section.gradient` applies a diagonal gradient background.
- Even-numbered sections automatically get `--body-background-alt` background.
- Sections containing `.split-full` have zero padding (panels self-pad).

### CSS Scoping

All design system styles are scoped under `.design-system`. CSS custom properties are declared at `:root` for theme overridability.

### Scroll Animations

Blocks can use `data-reveal` attributes on elements. Values: `""` (fade up), `"left"`, `"right"`, `"scale"`. Activated by IntersectionObserver adding `.is-visible` class. Respects `prefers-reduced-motion`.

---

## Block Types

### `hero`

Full-width hero banner with optional badge, title, lead text, and action buttons.

**Template:** `src/_includes/design-system/hero.html`
**SCSS:** `src/css/design-system/_hero.scss`
**HTML root:** `<header class="hero">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | **required** | Main `<h1>` heading. |
| `badge` | string | — | Small pill label above the title. Renders as `<span class="badge">`. |
| `lead` | string | — | Subtitle paragraph. `body-lg` size, muted color, max-width `$width-narrow` (680px). |
| `buttons` | array | — | Action buttons. Each: `{text, href, variant, size}`. |
| `class` | string | — | Extra CSS classes on the `<header>`. Use `"gradient"` for gradient bg. |
| `reveal` | string | — | `data-reveal` value. |

**Button variants:** `primary` (filled), `secondary` (outlined), `ghost` (transparent). **Sizes:** `sm`, `lg`, or omit for default.

**Layout:** Flex column, centered, `$space-lg` (32px) gap. Max-width on h1: `$width-default` (900px). Buttons wrap in `.actions` row with `$space-md` gap.

---

### `section-header`

Standalone section header with title and optional subtitle.

**Template:** `src/_includes/design-system/section-header.html`
**SCSS:** Styled in `src/css/design-system/_base.scss` (`.section-header`)
**HTML root:** `<hgroup class="section-header stack--sm">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | **required** | Section heading. |
| `subtitle` | string | — | Description text. Renders as `<p class="text-muted">`. |
| `level` | number | `2` | Heading level (1-6). |
| `align` | string | `"center"` | Text alignment. `"center"` adds `.text-center`. |
| `class` | string | — | Extra CSS classes. Use `"gradient"` for gradient text on headings. |

---

### `features`

Grid of feature cards with optional icons, titles, and descriptions.

**Template:** `src/_includes/design-system/features.html`
**SCSS:** `src/css/design-system/_feature.scss`
**HTML root:** `<ul class="features" role="list">` containing `<li><article class="feature">` items.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `items` | array | **required** | Feature objects (see below). |
| `header_title` | string | — | If set, renders an `<hgroup class="section-header">` above the grid. |
| `header_subtitle` | string | — | Subtitle for the section header. |
| `heading_level` | number | `3` | Heading level for item titles. |
| `grid_class` | string | `"features"` | CSS class on the `<ul>`. Options: `"features"` (auto-fit grid), `"grid"` (1/2/3 col), `"grid--4"` (1/2/4 col). Can combine: `"grid--4 text-center"`. |
| `reveal` | boolean | `true` | Adds `data-reveal` to each card. |

**Item properties:**
| Property | Type | Description |
|---|---|---|
| `icon` | string | Iconify ID (`"prefix:name"`), image path (`"/images/foo.svg"`), or raw HTML/emoji. |
| `icon_label` | string | Accessible label for the icon. Omit for decorative. |
| `title` | string | Feature heading. |
| `description` | string | Feature body text. |
| `style` | string | Inline CSS. Use for custom colors, e.g. `"--primary-light: #d1fae5; --primary: #059669;"`. |

**Card layout:** CSS grid with 2 columns (`auto 1fr`), 2 rows. Icon in col 1 row 1, heading in col 2 row 1, description spans full width in row 2. When no icon, heading spans full width. Cards have `@mixin card` (padding, border, bg) and `@mixin card-hover` (translateY lift + border color change on hover).

**Grid layout:**
- `.features`: `grid-template-columns: repeat(auto-fit, minmax($width-card, 1fr))` with `$space-md` gap.
- `.grid`: 1 col → 2 col (md) → 3 col (lg).
- `.grid--4`: 1 col → 2 col (sm) → 4 col (lg).

---

### `image-cards`

Grid of cards featuring images with titles and optional descriptions.

**Template:** `src/_includes/design-system/image-cards.html`
**SCSS:** `src/css/design-system/_items.scss` (`.items` class)
**HTML root:** `<ul class="items" role="list">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `items` | array | **required** | Card objects (see below). |
| `heading_level` | number | `3` | Heading level for titles. |
| `image_aspect_ratio` | string | CSS default | Aspect ratio for images, e.g. `"16/9"`, `"1/1"`, `"4/3"`. |
| `reveal` | boolean | `true` | Adds `data-reveal` to each item. |

**Item properties:**
| Property | Type | Description |
|---|---|---|
| `image` | string | Image path. Processed by `{% image %}` shortcode for responsive srcset + LQIP. |
| `title` | string | Card title. |
| `description` | string | Optional description. |
| `link` | string | Optional URL. Wraps image and title in `<a>` tags. |

**Layout:** Flex-wrap list. Items: `flex: 1 1 $width-card` with max-width 50% (md) or 33.3% (lg). Cards have border, border-radius, card-bg, and card-hover effect. Images are edge-to-edge (no padding). Text content has `--item-padding-inline` (24px).

---

### `stats`

Key metrics displayed as large numbers with labels.

**Template:** `src/_includes/design-system/stats.html`
**SCSS:** `src/css/design-system/_stats.scss`
**HTML root:** `<dl class="stats">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `items` | array | **required** | Stat objects: `{value, label}` or pipe-delimited strings `"value|label"`. |
| `reveal` | boolean | `true` | Adds `data-reveal` to each stat. |

**Layout:** Flex-wrap with `$space-xl` (48px) gap, centered. Each `.stat` is a flex column with min-width 150px. Value `<dd>` is visually reordered above label `<dt>` via `order: 0`/`order: 1`. Value uses `$font-size-4xl` (48px, 64px on md+) in `--color-link` color.

---

### `code-block`

Terminal-style code display with macOS-like toolbar header.

**Template:** `src/_includes/design-system/code-block.html`
**SCSS:** `src/css/design-system/_code-block.scss`
**HTML root:** `<div class="code-block">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `filename` | string | **required** | Displayed in the toolbar header. |
| `code` | string | **required** | Code content. Rendered in `<pre><code>`. |
| `language` | string | — | Sets `data-language` attribute (for future syntax highlighting). |
| `reveal` | string | — | `data-reveal` value. |

**Layout:** Toolbar has dark card-bg background with three colored dots (red/yellow/green) and filename. Code area has dark-bg background, monospace font, pre-wrap white-space. Top corners rounded on toolbar, bottom corners on code.

---

### `split`

Two-column layout with text content and a figure (image, video, code block, or HTML).

**Template:** `src/_includes/design-system/split.html`
**SCSS:** `src/css/design-system/_split.scss`
**HTML root:** `<div class="split">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Section heading. |
| `title_level` | number | `2` | Heading level. |
| `subtitle` | string | — | Subtitle with `.text-muted` styling. |
| `content` | string | — | Main content. Rendered through `renderContent: "md"` filter (supports markdown). Wrapped in `.prose`. |
| `figure_type` | string | — | `"image"`, `"video"`, `"code"`, or `"html"`. |
| `figure_src` | string | — | Image path (for `figure_type: "image"`). |
| `figure_alt` | string | — | Alt text for image, or accessible title for video iframe. |
| `figure_caption` | string | — | Visible caption below image or video. |
| `figure_video_id` | string | — | YouTube video ID or custom iframe URL (for `figure_type: "video"`). |
| `figure_filename` | string | — | Displayed filename in code block header (for `figure_type: "code"`). |
| `figure_code` | string | — | Code content (for `figure_type: "code"`). |
| `figure_language` | string | — | Syntax highlighting language (for `figure_type: "code"`). |
| `figure_html` | string | — | Raw HTML content (for `figure_type: "html"`). |
| `reverse` | boolean | `false` | Reverses column order (content right, figure left) on desktop. |
| `reveal_content` | string | `"left"` | `data-reveal` for the text side. |
| `reveal_figure` | string | `"scale"` | `data-reveal` for the figure side. |
| `button` | object | — | `{text, href, variant}`. Rendered below content. Default variant: `"secondary"`. |

**Layout:** Single column on mobile, 2-column CSS grid on md+ with `$space-3xl` (96px) gap. `align-items: start`. Figure has `$radius-xl` border-radius + `$border-light`. `split--reverse` swaps order via CSS `order` property.

---

### `split-full`

Full-width two-panel layout with distinct background colors per side.

**Template:** `src/_includes/design-system/split-full.html`
**SCSS:** `src/css/design-system/_split.scss`
**HTML root:** `<div class="split-full">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `variant` | string | — | Color scheme. Options: `"dark-left"`, `"dark-right"`, `"primary-left"`, `"primary-right"`. |
| `left_title` | string | — | Left panel heading. |
| `left_content` | string | — | Left panel content (rendered as markdown via `.prose`). |
| `left_button` | object | — | `{text, href, variant}`. |
| `right_title` | string | — | Right panel heading. |
| `right_content` | string | — | Right panel content (rendered as markdown via `.prose`). |
| `right_button` | object | — | `{text, href, variant}`. |
| `title_level` | number | `2` | Heading level for both sides. |
| `reveal_left` | string | — | `data-reveal` for left panel. |
| `reveal_right` | string | — | `data-reveal` for right panel. |

**Layout:** Column on mobile, row on md+. Each panel: `flex: 1`, self-padded with `--section-padding-y` vertically and `$space-md`/`$space-lg` horizontally. Inner content max-width: `$width-wide / 2` (600px). Left panel right-aligned (`justify-content: flex-end`), right panel left-aligned.

**Variants:**
- `dark-left`: Left panel gets dark bg (`$color-dark-bg`) + light text. Right panel transparent.
- `dark-right`: Inverse of dark-left.
- `primary-left`: Left panel gets `--color-link` bg + contrast text. Right panel transparent.
- `primary-right`: Inverse of primary-left.

Button colors automatically invert in dark/primary panels.

**Note:** The parent `<section>` has zero padding when containing `.split-full` — the panels handle their own padding.

---

### `cta`

Call-to-action banner with gradient background.

**Template:** `src/_includes/design-system/cta.html`
**SCSS:** `src/css/design-system/_cta.scss`
**HTML root:** `<aside class="cta">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | **required** | CTA heading (`<h2>`). |
| `description` | string | — | Supporting text. `body-lg`, 0.9 opacity, max-width `$width-narrow`. |
| `button` | object | — | `{text, href, variant, size}`. Default variant: `"secondary"`, default size: `"lg"`. |
| `reveal` | string | — | `data-reveal` value. |

**Layout:** Flex column, centered, `$space-lg` gap. Uses `@mixin card` with `$space-3xl` padding and `$radius-2xl`. Background: diagonal gradient from `--color-link` to `--color-secondary`. Text color: `--color-contrast-text`. Secondary button inverts to contrast text colors.

---

### `video-background`

Auto-playing video background with overlaid text content.

**Template:** `src/_includes/design-system/video-background.html`
**SCSS:** `src/css/design-system/_video-background.scss`
**HTML root:** `<div class="video-background">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `video_id` | string | **required** | YouTube video ID or full iframe URL (for Bunny, Vimeo, etc). |
| `video_title` | string | `"Background video"` | Accessible `title` on the iframe. |
| `content` | string | **required** | Overlay content. Rendered as markdown in `<figcaption class="prose">`. |
| `aspect_ratio` | string | `"16/9"` | CSS aspect-ratio on container. |
| `class` | string | — | Extra CSS classes. |

**Layout:** Relative positioned container with aspect-ratio. Iframe absolutely positioned, centered via translate, scaled to cover without letterboxing. `pointer-events: none` disables video interaction. Content overlay absolutely positioned, centered, with contrast text colors. Section padding is zeroed.

**Video iframe:** Uses `video-iframe.html` sub-component. YouTube IDs get `youtube-nocookie.com` embed URLs with `autoplay=1&mute=1&loop=1&controls=0`. Custom URLs (starting with `http`) are used directly.

---

### `image-background`

Full-width image background with overlaid text and optional parallax.

**Template:** `src/_includes/design-system/image-background.html`
**SCSS:** `src/css/design-system/_image-background.scss`
**HTML root:** `<div class="image-background">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `image` | string | **required** | Image path. Processed via `{% image %}` at widths 2560/1920/1280/960/640, cropped to 16/9. |
| `image_alt` | string | `"Background image"` | Alt text. |
| `content` | string | **required** | Overlay content. Rendered as markdown in `<figcaption class="prose">`. |
| `class` | string | — | Extra CSS classes. |
| `parallax` | boolean | `false` | Enables CSS `animation-timeline: scroll()` parallax effect. |

**Layout:** Relative container, aspect-ratio 16/9, dark-bg fallback. Image div absolutely positioned covering inset 0, object-fit cover. Content overlay centered with contrast text + text-shadow. Section padding zeroed.

**Parallax:** When enabled, image container extends to `inset: -15%` and uses `@keyframes parallax-scroll` with `animation-timeline: scroll(nearest block)` for native CSS scroll-driven translation (-10% to +10%).

---

### `markdown`

Renders markdown content as rich text.

**Template:** Inline in `render-block.html` (no separate file).
**SCSS:** `src/css/design-system/_prose.scss`
**HTML root:** `<div class="prose">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `content` | string | **required** | Markdown content. Passed through `renderContent: "md"` filter. |

**Layout:** `.prose` is a flex column with `$space-md` (24px) gap. Unclassed list items get themed bullet markers via `--list-marker-content` and `--list-marker-color` custom properties.

---

### `html`

Outputs raw HTML without processing.

**Template:** Inline in `render-block.html` (no separate file).

| Parameter | Type | Default | Description |
|---|---|---|---|
| `content` | string | **required** | Raw HTML. Output directly with `{{ block.content }}`. |

No wrapping element. No markdown processing. Useful for custom embeds, iframes, or one-off HTML that doesn't fit other block types.

---

### `contact_form`

Two-column layout with prose content and a contact form.

**Template:** `src/_includes/design-system/contact-form-block.html`
**SCSS:** `src/css/design-system/_contact-form-block.scss`
**HTML root:** `<div class="contact-form-block">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `content` | string | — | Left-side content. Rendered as markdown in `.prose`. Centered text. |

**Layout:** Single column on mobile, 2-column CSS grid on md+ with `$space-3xl` gap. Left: prose content (centered text). Right: contact form (included from `contact-form.html`). Form inputs get consistent styling: border, border-radius, focus ring, placeholder colors.

---

### `items`

Displays an Eleventy collection as a card grid or horizontal slider.

**Template:** `src/_includes/design-system/items-block.html`
**SCSS:** `src/css/design-system/_items.scss`
**HTML root:** Varies (delegates to `items.html`)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `collection` | string | **required** | Name of an Eleventy collection (e.g. `"featuredProducts"`, `"events"`, `"news"`). |
| `intro` | string | — | Markdown content rendered above items in `.prose`. |
| `horizontal` | boolean | `false` | If true, renders as a horizontal slider instead of a wrapping grid. |

**Card layout:** `<ul class="items">` with `<li>` cards. Cards have border, border-radius, card-bg, card-hover. Images are edge-to-edge. Text content uses `--item-padding-inline`. Cards show title, optional price, optional description, optional specs, optional cart controls.

**Grid mode:** Flex-wrap, items `flex: 1 1 $width-card`, max-width 50% (md) / 33.3% (lg).
**Slider mode:** `flex-wrap: nowrap`, `overflow-x: auto`, `scroll-snap-type: x mandatory`. Items fixed width `$width-card` / `$width-card-lg` (md+). Thin scrollbar. Includes slider nav buttons.

---

### `properties`

Displays property listings (holiday lets) with filter controls.

**Template:** `src/_includes/design-system/properties-block.html`
**SCSS:** `src/css/design-system/_property.scss`, `src/css/design-system/_items.scss`

No block-level parameters. Uses the global `collections.properties` and optional `filterPage` data for URL-based filtering.

**Sub-components:** `properties-filter.html` (filter UI), `filtered-items-section.html` (filtered results), `items.html` (card rendering).

---

### `content`

Outputs the page's `content` property (from markdown body below frontmatter).

**Template:** `src/_includes/design-system/content-block.html`

No parameters. Renders `{{ content }}` if non-empty. Used for pages that combine blocks with traditional markdown content.

---

### `block-link`

Standalone centered button linking to an anchor or URL.

**Template:** `src/_includes/design-system/block-link.html`
**SCSS:** `src/css/design-system/_block-link.scss`
**HTML root:** `<div class="block-link">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `text` | string | **required** | Button label. |
| `href` | string | **required** | Link URL or anchor (e.g. `"#contact"`, `"/about"`). |
| `variant` | string | `"primary"` | Button variant: `"primary"`, `"secondary"`, or `"ghost"`. |
| `size` | string | — | Button size: `"sm"`, `"lg"`, or omit for default. |
| `reveal` | string | — | `data-reveal` value. |

**Layout:** Flex container with `justify-content: center`. Renders a single `<a>` with `.btn` classes.

---

### `include`

Includes an arbitrary template file.

**Template:** Inline in `render-block.html` — uses `{% include block.file %}`.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `file` | string | **required** | Path to the template file to include. |

Escape hatch for custom content that doesn't fit the block system.

---

## Supporting Components

These are not blocks themselves but are used by multiple blocks.

### Icon (`icon.html`, `icon-badge.html`)

**Files:** `src/_includes/design-system/icon.html`, `src/_includes/design-system/icon-badge.html`
**SCSS:** `src/css/design-system/_icon.scss`

Renders icons in three formats:
- **Iconify ID** (`"prefix:name"`): Rendered as `<iconify-icon>` web component.
- **Image path** (starts with `/`): Rendered as `<img>`.
- **Raw content**: Output as-is (emoji, HTML entity).

`icon-badge.html` wraps the icon in an accessible container with a tinted background.

### Video Iframe (`video-iframe.html`)

**File:** `src/_includes/design-system/video-iframe.html`

Shared iframe renderer. YouTube IDs produce privacy-respecting `youtube-nocookie.com` URLs. Custom URLs (starting with `http`) are embedded directly. Supports `background: true` mode for auto-playing background videos.

### Video Cards (`video-cards.html`)

**File:** `src/_includes/design-system/video-cards.html`
**SCSS:** `src/css/design-system/_items.scss` (`.video-cards` variant)

Not a block type in `render-block.html` — used via direct `{% include %}`. Renders YouTube/custom video thumbnails with click-to-play lazy loading. Thumbnails processed via `{% image %}`. Play button SVG overlay. Iframe stored in `<template>` element, injected on click. Hover transform disabled on video cards.

---

## Styling Primitives

### Containers

| Class | Max-width | Usage |
|---|---|---|
| `.container` | 900px (`$width-default`) | Default block container. Flex-col with `$space-lg` gap. |
| `.container--wide` | 1200px (`$width-wide`) | Wide content (galleries, grids). |
| `.container--narrow` | 680px (`$width-narrow`) | Prose-width content. |

### Grid Classes

| Class | Columns | Usage |
|---|---|---|
| `.features` | `auto-fit, minmax(280px, 1fr)` | Feature cards. |
| `.grid` | 1 → 2 (md) → 3 (lg) | Generic grid. |
| `.grid--2` | 1 → 2 (md) | Two-column grid. |
| `.grid--4` | 1 → 2 (sm) → 4 (lg) | Four-column grid. |

### Button Classes

| Class | Style |
|---|---|
| `.btn--primary` | Filled, `--color-link` bg, contrast text. Lifts on hover. |
| `.btn--secondary` | Outlined, `--color-link` border/text. Fills on hover. |
| `.btn--ghost` | Transparent. Subtle bg on hover. |
| `.btn--lg` | Larger padding + font. |
| `.btn--sm` | Smaller padding + font. |

### Utility Classes

| Class | Effect |
|---|---|
| `.prose` | Flex-col with `$space-md` gap. Themed list markers. |
| `.stack` | Alias for flex-col layout. |
| `.stack--sm` | Flex-col with `$space-sm` gap. |
| `.text-center` | `text-align: center`. |
| `.text-muted` | `color: var(--color-text-muted)`. |

---

## Design Tokens

### Spacing Scale (8px base unit)

| Token | Value |
|---|---|
| `$space-xs` | 8px |
| `$space-sm` | 16px |
| `$space-md` | 24px |
| `$space-lg` | 32px |
| `$space-xl` | 48px |
| `$space-2xl` | 64px |
| `$space-3xl` | 96px |
| `$space-4xl` | 128px |

### Breakpoints

| Token | Value | Usage |
|---|---|---|
| `$bp-sm` | 650px | Small tablets. |
| `$bp-md` | 768px | Tablets / 2-col layouts. |
| `$bp-lg` | 1000px | Desktop / 3-4 col layouts. |
| `$bp-xl` | 1200px | Wide desktop. |

### Border Radius

| Token | Value |
|---|---|
| `$radius-sm` | 4px |
| `$radius-md` | 8px |
| `$radius-lg` | 12px |
| `$radius-xl` | 16px |
| `$radius-2xl` | 24px |
| `$radius-full` | 9999px |

### Typography Scale

| Token | Size |
|---|---|
| `$font-size-xs` | 0.75rem (12px) |
| `$font-size-sm` | 0.875rem (14px) |
| `$font-size-base` | 1rem (16px) |
| `$font-size-md` | 1.125rem (18px) |
| `$font-size-lg` | 1.25rem (20px) |
| `$font-size-xl` | 1.5rem (24px) |
| `$font-size-2xl` | 2rem (32px) |
| `$font-size-3xl` | 2.5rem (40px) |
| `$font-size-4xl` | 3rem (48px) |
| `$font-size-5xl` | 4rem (64px) |

---

## File Index

### Block Templates (`src/_includes/design-system/`)

| File | Block Type |
|---|---|
| `hero.html` | `hero` |
| `section-header.html` | `section-header` |
| `features.html` | `features` |
| `image-cards.html` | `image-cards` |
| `stats.html` | `stats` |
| `code-block.html` | `code-block` |
| `split.html` | `split` |
| `split-full.html` | `split-full` |
| `cta.html` | `cta` |
| `video-background.html` | `video-background` |
| `image-background.html` | `image-background` |
| `contact-form-block.html` | `contact_form` |
| `items-block.html` | `items` |
| `properties-block.html` | `properties` |
| `content-block.html` | `content` |
| `block-link.html` | `block-link` |

### SCSS Files (`src/css/design-system/`)

| File | Styles |
|---|---|
| `_base.scss` | Root styles, containers, sections, typography, scroll animations |
| `_hero.scss` | Hero, badge, actions |
| `_feature.scss` | Feature cards grid |
| `_items.scss` | Item cards, video cards, slider, cart controls |
| `_stats.scss` | Stats display |
| `_code-block.scss` | Code block with toolbar |
| `_split.scss` | Split and split-full layouts |
| `_cta.scss` | Call-to-action banner |
| `_video-background.scss` | Video background overlay |
| `_image-background.scss` | Image background, parallax |
| `_contact-form-block.scss` | Contact form layout + form elements |
| `_prose.scss` | Rich text container |
| `_grid.scss` | Grid layout utilities |
| `_buttons.scss` | Button variants + sizes |
| `_icon.scss` | Icon badge styling |
| `_property.scss` | Property detail page sections |
| `_slider.scss` | Horizontal slider nav |
| `_navigation.scss` | Site navigation |
| `_breadcrumbs.scss` | Breadcrumb trail |
| `_footer.scss` | Page footer |
| `_reviews.scss` | Review components |
| `_utilities.scss` | Utility classes |
| `_block-link.scss` | Block link centering |

### Key Layout Files

| File | Purpose |
|---|---|
| `src/_layouts/design-system-base.html` | Base HTML shell, loads CSS/JS, applies `.design-system` to body |
| `src/_includes/design-system/blocks.html` | Block loop: iterates blocks, wraps in sections + containers |
| `src/_includes/design-system/render-block.html` | Block router: dispatches block.type to template |

### Example Page

`src/pages/chobble-template.md` uses hero, video-background, items, stats, features (x3), split-full (x2), split (x3), cta, contact_form, and image-background blocks.
