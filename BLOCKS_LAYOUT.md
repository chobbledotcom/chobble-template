# Design System Blocks Reference

Technical reference for the composable page blocks in Chobble Template's design system. Blocks are declared in YAML frontmatter and rendered by the block pipeline.

## Architecture

### Rendering Pipeline

```
frontmatter blocks[] → design-system-base.html → blocks.html → render-block.html → [block template]
```

**Layout:** `src/_layouts/design-system-base.html` applies `class="design-system"` to `<body>`, loads the design system CSS bundle, and iterates blocks via `blocks.html`.

**Block loop** (`src/_includes/design-system/blocks.html`): Each block becomes a `<section>`. If `block.dark` is true, the section gets `class="dark"`. Container width is determined by block type and is not user-configurable: `icon-links` uses `.container-narrow` (680px); `video-background`, `bunny-video-background`, `image-background`, and `marquee-images` are full-bleed (no container wrapper); everything else uses `.container-wide` (1200px).

**Block router** (`src/_includes/design-system/render-block.html`): A Liquid `case` statement dispatching `block.type` to the appropriate include template.

### Common Block Properties

Every block object supports these properties (handled by blocks.html, not the individual templates):

| Property | Type | Effect |
|---|---|---|
| `type` | string | **Required.** Selects which template to render. |
| `dark` | boolean | If true, adds `class="dark"` to the wrapping `<section>` (dark bg + inverted colors). |

### Section Behavior

- Sections use `@mixin section` which applies `$space-3xl` (96px) vertical padding (60% on mobile).
- `section.dark` inverts all CSS custom properties to dark palette.
- Even-numbered sections automatically get `--body-background-alt` background.
- Sections containing `.split-full` have zero padding (panels self-pad).

### CSS Scoping

All design system styles are scoped under `.design-system`. CSS custom properties are declared at `:root` for theme overridability.

### Scroll Animations

Blocks can use `data-reveal` attributes on elements. Values: `""` (fade up), `"left"`, `"right"`, `"scale"`. Activated by IntersectionObserver adding `.is-visible` class. Respects `prefers-reduced-motion`.

---

<!-- BEGIN GENERATED BLOCKS -->

## Block Types

### `section-header`

Standalone section header with rich text intro.

**Template:** `src/_includes/design-system/section-header.html`
**SCSS:** `src/css/design-system/_base.scss`
**HTML root:** `<div class="section-header prose">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `intro` | string | **required** | Rich text content rendered as markdown. Use headings and body text together. |
| `align` | string | `"center"` | Text alignment. `"center"` adds `.text-center`. |
| `class` | string | — | Extra CSS classes. |

---

### `features`

Grid of feature cards with optional icons, titles, and descriptions.

**Template:** `src/_includes/design-system/features.html`
**SCSS:** `src/css/design-system/_feature.scss`
**HTML root:** `<ul class="features" role="list"> containing <li><article class="feature"> items`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `items` | array | **required** | Feature objects. Each: `{icon, icon_label, title, description, style}`. Icon can be an Iconify ID (`"prefix:name"`), image path (`"/images/foo.svg"`), or raw HTML/emoji. |
| `heading_level` | number | `3` | Heading level for item titles. |
| `grid_class` | string | `"features"` | CSS class on the `<ul>`. Options: `"features"` (auto-fit grid), `"grid"` (1/2/3 col), `"grid--4"` (1/2/4 col). Can combine: `"grid--4 text-center"`. |
| `reveal` | boolean | `true` | Adds `data-reveal` to each card. |
| `header_intro` | string | — | Section header content rendered as markdown above the block. |
| `header_align` | string | — | Header text alignment. `"center"` adds `.text-center`. |
| `header_class` | string | — | Extra CSS classes on the section header. |

---

### `image-cards`

Grid of cards featuring images with titles and optional descriptions.

**Template:** `src/_includes/design-system/image-cards.html`
**SCSS:** `src/css/design-system/_items.scss`
**HTML root:** `<ul class="items" role="list">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `items` | array | **required** | Card objects. Each: `{image, title, description, link}`. Images processed by `{% image %}` shortcode for responsive srcset + LQIP. |
| `heading_level` | number | `3` | Heading level for titles. |
| `image_aspect_ratio` | string | — | Aspect ratio for images, e.g. `"16/9"`, `"1/1"`, `"4/3"`. |
| `reveal` | boolean | `true` | Adds `data-reveal` to each item. |
| `header_intro` | string | — | Section header content rendered as markdown above the block. |
| `header_align` | string | — | Header text alignment. `"center"` adds `.text-center`. |
| `header_class` | string | — | Extra CSS classes on the section header. |

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
| `reveal` | boolean | `true` | `data-reveal` value. |

---

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
| `buttons` | array | — | Action buttons. Each: `{text, href, variant, size}`. Variants: `"primary"` (filled), `"secondary"` (outlined), `"ghost"` (transparent). Sizes: `"sm"`, `"lg"`, or omit for default. |
| `class` | string | — | Extra CSS classes on the `<header>`. Use `"gradient"` for gradient bg. |
| `reveal` | string | — | `data-reveal` value. |

---

### `split-image`

Two-column layout with text content and a responsive image.

**Template:** `src/_includes/design-system/split.html`
**SCSS:** `src/css/design-system/_split.scss`
**HTML root:** `<div class="split">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Section heading. |
| `title_level` | number | `2` | Heading level. |
| `subtitle` | string | — | Subtitle with `.text-muted` styling. |
| `content` | string | — | Main content. Rendered through `renderContent: "md"` filter (supports markdown). Wrapped in `.prose`. |
| `reverse` | boolean | `false` | Reverses column order (content right, figure left) on desktop. |
| `reveal_content` | string | `"left"` | `data-reveal` for the text side. Auto-set to `"right"` when `reverse` is true. |
| `reveal_figure` | string | `"scale"` | `data-reveal` for the figure side. |
| `button` | object | — | `{text, href, variant}`. Rendered below content. Default variant: `"secondary"`. |
| `figure_src` | string | **required** | Image path. |
| `figure_alt` | string | — | Alt text for the image. |
| `figure_caption` | string | — | Visible caption below the image. |

---

### `split-video`

Two-column layout with text content and an embedded video.

**Template:** `src/_includes/design-system/split.html`
**SCSS:** `src/css/design-system/_split.scss`
**HTML root:** `<div class="split">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Section heading. |
| `title_level` | number | `2` | Heading level. |
| `subtitle` | string | — | Subtitle with `.text-muted` styling. |
| `content` | string | — | Main content. Rendered through `renderContent: "md"` filter (supports markdown). Wrapped in `.prose`. |
| `reverse` | boolean | `false` | Reverses column order (content right, figure left) on desktop. |
| `reveal_content` | string | `"left"` | `data-reveal` for the text side. Auto-set to `"right"` when `reverse` is true. |
| `reveal_figure` | string | `"scale"` | `data-reveal` for the figure side. |
| `button` | object | — | `{text, href, variant}`. Rendered below content. Default variant: `"secondary"`. |
| `figure_video_id` | string | **required** | YouTube video ID or custom iframe URL. |
| `figure_alt` | string | — | Accessible title for the video iframe. |
| `figure_caption` | string | — | Visible caption below the video. |

---

### `split-code`

Two-column layout with text content and a code block.

**Template:** `src/_includes/design-system/split.html`
**SCSS:** `src/css/design-system/_split.scss`
**HTML root:** `<div class="split">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Section heading. |
| `title_level` | number | `2` | Heading level. |
| `subtitle` | string | — | Subtitle with `.text-muted` styling. |
| `content` | string | — | Main content. Rendered through `renderContent: "md"` filter (supports markdown). Wrapped in `.prose`. |
| `reverse` | boolean | `false` | Reverses column order (content right, figure left) on desktop. |
| `reveal_content` | string | `"left"` | `data-reveal` for the text side. Auto-set to `"right"` when `reverse` is true. |
| `reveal_figure` | string | `"scale"` | `data-reveal` for the figure side. |
| `button` | object | — | `{text, href, variant}`. Rendered below content. Default variant: `"secondary"`. |
| `figure_filename` | string | — | Displayed filename in the code block header. |
| `figure_code` | string | **required** | Code content. |
| `figure_language` | string | — | Syntax highlighting language. |

---

### `split-icon-links`

Two-column layout with text content and an icon-links list.

**Template:** `src/_includes/design-system/split.html`
**SCSS:** `src/css/design-system/_split.scss`
**HTML root:** `<div class="split">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Section heading. |
| `title_level` | number | `2` | Heading level. |
| `subtitle` | string | — | Subtitle with `.text-muted` styling. |
| `content` | string | — | Main content. Rendered through `renderContent: "md"` filter (supports markdown). Wrapped in `.prose`. |
| `reverse` | boolean | `false` | Reverses column order (content right, figure left) on desktop. |
| `reveal_content` | string | `"left"` | `data-reveal` for the text side. Auto-set to `"right"` when `reverse` is true. |
| `reveal_figure` | string | `"scale"` | `data-reveal` for the figure side. |
| `button` | object | — | `{text, href, variant}`. Rendered below content. Default variant: `"secondary"`. |
| `figure_items` | array | **required** | Icon-link objects. Each: `{icon, text, url}`. `url` is optional. Icon can be an Iconify ID (`"prefix:name"`), image path, or raw HTML/emoji. |

---

### `split-html`

Two-column layout with text content and custom HTML.

**Template:** `src/_includes/design-system/split.html`
**SCSS:** `src/css/design-system/_split.scss`
**HTML root:** `<div class="split">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Section heading. |
| `title_level` | number | `2` | Heading level. |
| `subtitle` | string | — | Subtitle with `.text-muted` styling. |
| `content` | string | — | Main content. Rendered through `renderContent: "md"` filter (supports markdown). Wrapped in `.prose`. |
| `reverse` | boolean | `false` | Reverses column order (content right, figure left) on desktop. |
| `reveal_content` | string | `"left"` | `data-reveal` for the text side. Auto-set to `"right"` when `reverse` is true. |
| `reveal_figure` | string | `"scale"` | `data-reveal` for the figure side. |
| `button` | object | — | `{text, href, variant}`. Rendered below content. Default variant: `"secondary"`. |
| `figure_html` | string | **required** | Raw HTML content for the figure side. |

---

### `split-callout`

Two-column layout with text content and a styled callout box with icon, title, and subtitle.

**Template:** `src/_includes/design-system/split-callout.html`
**SCSS:** `src/css/design-system/_split-callout.scss`
**HTML root:** `<div class="split-callout">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Section heading. |
| `title_level` | number | `2` | Heading level. |
| `subtitle` | string | — | Subtitle with `.text-muted` styling. |
| `content` | string | — | Main content. Rendered through `renderContent: "md"` filter (supports markdown). Wrapped in `.prose`. |
| `reverse` | boolean | `false` | Reverses column order (content right, figure left) on desktop. |
| `reveal_content` | string | `"left"` | `data-reveal` for the text side. Auto-set to `"right"` when `reverse` is true. |
| `reveal_figure` | string | `"scale"` | `data-reveal` for the figure side. |
| `button` | object | — | `{text, href, variant}`. Rendered below content. Default variant: `"secondary"`. |
| `figure_icon` | string | — | Icon content: Iconify ID (`prefix:name`), emoji, or image path. |
| `figure_title` | string | **required** | Bold heading text in the callout box. |
| `figure_subtitle` | string | — | Supporting text below the title. |
| `figure_variant` | string | `"primary"` | Color scheme: `"primary"`, `"secondary"`, `"gradient"`, or a custom CSS gradient string. |

---

### `split-full`

Full-width two-panel layout with distinct background colors per side.

**Template:** `src/_includes/design-system/split-full.html`
**SCSS:** `src/css/design-system/_split.scss`
**HTML root:** `<div class="split-full">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `variant` | string | — | Color scheme: `"dark-left"`, `"dark-right"`, `"primary-left"`, `"primary-right"`. |
| `title_level` | number | `2` | Heading level for both sides. |
| `left_title` | string | — | Left panel heading. |
| `left_content` | string | — | Left panel content (rendered as markdown via `.prose`). |
| `left_button` | object | — | `{text, href, variant}`. |
| `right_title` | string | — | Right panel heading. |
| `right_content` | string | — | Right panel content (rendered as markdown via `.prose`). |
| `right_button` | object | — | `{text, href, variant}`. |
| `reveal_left` | string | — | `data-reveal` for left panel. |
| `reveal_right` | string | — | `data-reveal` for right panel. |

Variants: `"dark-left"` / `"dark-right"` (dark bg + light text), `"primary-left"` / `"primary-right"` (`--color-link` bg + contrast text). Button colors automatically invert in dark/primary panels. The parent `<section>` has zero padding — panels handle their own padding.

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
| `aspect_ratio` | string | `"16/9"` | CSS aspect-ratio on container. |
| `content` | string | **required** | Overlay content. Rendered as markdown in `<figcaption class="prose">`. |
| `class` | string | — | Extra CSS classes. |
| `thumbnail_url` | string | — | URL of a thumbnail image displayed behind the iframe while the video loads. |

YouTube IDs get `youtube-nocookie.com` embed URLs with `autoplay=1&mute=1&loop=1&controls=0`. Custom URLs (starting with `http`) are used directly.

---

### `bunny-video-background`

Bunny CDN video background with player.js-powered thumbnail that fades when playback starts.

**Template:** `src/_includes/design-system/bunny-video-background.html`
**SCSS:** `src/css/design-system/_video-background.scss`
**HTML root:** `<div class="video-background" data-bunny-video>`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `video_url` | string | **required** | Bunny Stream embed URL. |
| `thumbnail_url` | string | **required** | Thumbnail image URL. Displayed as a placeholder until video playback begins. |
| `video_title` | string | `"Background video"` | Accessible `title` on the iframe. |
| `aspect_ratio` | string | `"16/9"` | CSS aspect-ratio on container. |
| `content` | string | **required** | Overlay content. Rendered as markdown in `<figcaption class="prose">`. |
| `class` | string | — | Extra CSS classes. |

Uses player.js to detect when the video starts playing, then fades out the thumbnail. The player.js library is bundled into bunny-video.js and only loaded when this block is used.

---

### `image-background`

Full-width image background with overlaid text and optional parallax.

**Template:** `src/_includes/design-system/image-background.html`
**SCSS:** `src/css/design-system/_image-background.scss`
**HTML root:** `<div class="image-background">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `image` | string | **required** | Image path. |
| `image_alt` | string | `"Background image"` | Alt text. |
| `content` | string | **required** | Overlay content. Rendered as markdown in `<figcaption class="prose">`. |
| `class` | string | — | Extra CSS classes. |
| `parallax` | boolean | `false` | Enables CSS `animation-timeline: scroll()` parallax effect. |

Image processed via `{% image %}` at widths 2560/1920/1280/960/640, cropped to 16/9. Parallax uses `animation-timeline: scroll()` for native CSS scroll-driven translation.

---

### `items`

Displays an Eleventy collection as a card grid or horizontal slider.

**Template:** `src/_includes/design-system/items-block.html`
**SCSS:** `src/css/design-system/_items.scss`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `collection` | string | **required** | Name of an Eleventy collection (e.g. `"featuredProducts"`, `"events"`, `"news"`). |
| `intro` | string | — | Markdown content rendered above items in `.prose`. |
| `horizontal` | boolean | `false` | If true, renders as a horizontal slider instead of a wrapping grid. |
| `masonry` | boolean | `false` | If true, renders as a masonry grid using uWrap for zero-reflow height prediction. |
| `filter` | object | — | Filter object: `{property, includes, equals}`. `property` is a dot-notation path (e.g. `"url"`, `"data.title"`). `includes` matches substring, `equals` matches exact value. |
| `header_intro` | string | — | Section header content rendered as markdown above the block. |
| `header_align` | string | — | Header text alignment. `"center"` adds `.text-center`. |
| `header_class` | string | — | Extra CSS classes on the section header. |

---

### `items-array`

Renders items from an explicit list of paths. The collection is inferred dynamically from each item's path.

**Template:** `src/_includes/design-system/items-array-block.html`
**SCSS:** `src/css/design-system/_items.scss`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `items` | array | **required** | Array of file paths as strings. |
| `intro` | string | — | Markdown content rendered above items in `.prose`. |
| `horizontal` | boolean | `false` | If true, renders as a horizontal slider instead of a wrapping grid. |
| `masonry` | boolean | `false` | If true, renders as a masonry grid using uWrap for zero-reflow height prediction. |
| `filter` | object | — | Filter object: `{property, includes, equals}`. `property` is a dot-notation path (e.g. `"url"`, `"data.title"`). `includes` matches substring, `equals` matches exact value. |
| `header_intro` | string | — | Section header content rendered as markdown above the block. |
| `header_align` | string | — | Header text alignment. `"center"` adds `.text-center`. |
| `header_class` | string | — | Extra CSS classes on the section header. |

---

### `contact-form`

Two-column layout with prose content and a contact form.

**Template:** `src/_includes/design-system/contact-form-block.html`
**SCSS:** `src/css/design-system/_contact-form-block.scss`
**HTML root:** `<div class="contact-form-block">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `content` | string | — | Left-side content. Rendered as markdown in `.prose`. Centered text. |
| `header_intro` | string | — | Section header content rendered as markdown above the block. |
| `header_align` | string | — | Header text alignment. `"center"` adds `.text-center`. |
| `header_class` | string | — | Extra CSS classes on the section header. |

---

### `custom-contact-form`

Contact form block with a custom, block-level field list instead of the site-wide `contactForm.fields`.

**Template:** `src/_includes/design-system/custom-contact-form-block.html`
**SCSS:** `src/css/design-system/_contact-form-block.scss`
**HTML root:** `<div class="contact-form-block">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `content` | string | — | Left-side content. Rendered as markdown in `.prose`. Centered text. |
| `fields` | array | **required** | Array of field definitions for this form. Replaces `contactForm.fields` for this block only. |
| `header_intro` | string | — | Section header content rendered as markdown above the block. |
| `header_align` | string | — | Header text alignment. `"center"` adds `.text-center`. |
| `header_class` | string | — | Extra CSS classes on the section header. |

Identical layout and styling to `contact-form`, but accepts its own `fields` array. Each field object follows the same shape as entries in `src/_data/contact-form.json` — e.g. `{name, label, type, placeholder, required, rows, options, note, fieldClass, showOn, defaultFromPageTitle}`. Supported `type` values: `"text"` (default), `"email"`, `"tel"`, `"textarea"`, `"select"`, `"radio"`, `"heading"`.

---

### `markdown`

Renders markdown content as rich text.

**SCSS:** `src/css/design-system/_prose.scss`
**HTML root:** `<div class="prose">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `content` | string | **required** | Markdown content. Passed through `renderContent: "md"` filter. |

Inline in `render-block.html` (no separate template file).

---

### `html`

Outputs raw HTML without processing.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `content` | string | **required** | Raw HTML. Output directly with `{{ block.content }}`. |

Inline in `render-block.html` (no separate template file). No wrapping element. Useful for custom embeds, iframes, or one-off HTML.

---

### `content`

Outputs the page's `content` property (from markdown body below frontmatter).

**Template:** `src/_includes/design-system/content-block.html`

No parameters. Renders `{{ content }}` if non-empty. Used for pages that combine blocks with traditional markdown content.

---

### `include`

Includes an arbitrary template file.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `file` | string | **required** | Path to the template file to include. |

Inline in `render-block.html` — uses `{% include block.file %}`. Escape hatch for custom content that doesn't fit the block system.

---

### `properties`

Displays property listings (holiday lets) with filter controls.

**Template:** `src/_includes/design-system/properties-block.html`
**SCSS:** `src/css/design-system/_property.scss`

No block-level parameters. Uses the global `collections.properties` and optional `filterPage` data for URL-based filtering.

---

### `guide-categories`

Displays guide categories collection.

**Template:** `src/_includes/design-system/guide-categories-block.html`

No block-level parameters. Uses the global `collections.guide-categories`.

---

### `link-button`

Standalone centered button linking to an anchor or URL.

**Template:** `src/_includes/design-system/link-button.html`
**SCSS:** `src/css/design-system/_link-button.scss`
**HTML root:** `<div class="link-button">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `text` | string | **required** | Button label. |
| `href` | string | **required** | Link URL or anchor (e.g. `"#contact"`, `"/about"`). |
| `variant` | string | `"primary"` | `"primary"`, `"secondary"`, or `"ghost"`. |
| `size` | string | — | `"sm"`, `"lg"`, or omit for default. |
| `reveal` | string | — | `data-reveal` value. |

---

### `reviews`

Renders reviews collection with optional filtering to the current item.

**Template:** `src/_includes/design-system/reviews-block.html`
**SCSS:** `src/css/design-system/_reviews.scss`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `current_item` | boolean | — | If true, filters reviews to the current item by slug and tags. |

Uses `getReviewsFor` filter to match reviews by slug and tags when `current_item` is true.

---

### `gallery`

Image grid with optional aspect ratio cropping and captions.

**Template:** `src/_includes/design-system/gallery.html`
**SCSS:** `src/css/design-system/_items.scss`
**HTML root:** `<ul class="items" role="list">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `items` | array | **required** | Image objects. Each: `{image, caption}`. Images processed by `{% image %}` shortcode. |
| `aspect_ratio` | string | — | Aspect ratio for images (e.g. `"16/9"`, `"1/1"`, `"4/3"`). Default: no cropping. |

---

### `marquee-images`

Continuously scrolling marquee of images (e.g. brand logos, partner badges).

**Template:** `src/_includes/design-system/marquee-images.html`
**SCSS:** `src/css/design-system/_marquee-images.scss`
**HTML root:** `<div class="marquee-images">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `items` | array | **required** | Image objects. Each: `{image, alt, link_url}`. `image` is a path; `alt` is optional alt text; `link_url` is an optional URL to wrap the image in a link. Images are processed via the `{% image %}` shortcode for responsive formats and proper URL normalization. |
| `speed` | string | `"30s"` | CSS animation duration for one full scroll cycle (e.g. `"20s"`, `"45s"`). Slower = longer duration. |
| `height` | string | `"50px"` | CSS height for the images (e.g. `"60px"`, `"80px"`). Width scales proportionally. |
| `header_intro` | string | — | Section header content rendered as markdown above the block. |
| `header_align` | string | — | Header text alignment. `"center"` adds `.text-center`. |
| `header_class` | string | — | Extra CSS classes on the section header. |

---

### `icon-links`

Vertical list of links with icons, rendered as a flex column stack.

**Template:** `src/_includes/design-system/icon-links.html`
**SCSS:** `src/css/design-system/_icon-links.scss`
**HTML root:** `<ul class="icon-links" role="list">`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `intro` | string | — | Markdown content rendered above the links list in `.prose`. |
| `items` | array | **required** | Link objects. Each: `{icon, text, url}`. `url` is optional — items without it render as plain text. Icon can be an Iconify ID (`"prefix:name"`), image path, or raw HTML/emoji. |
| `reveal` | boolean | `true` | Adds `data-reveal` to each link item. |

---

### `snippet`

Renders blocks from a named snippet file, enabling reusable block compositions.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `reference` | string | **required** | Filename of the snippet (without `.md` extension) from `src/snippets/`. |

The referenced snippet must exist in `src/snippets/` and have a `blocks` frontmatter array. The snippet block is transparent — it renders no wrapping section element, so each inner block renders its own section directly.

---


<!-- END GENERATED BLOCKS -->

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
| `.container` | 900px (`$width-default`) | Default container for non-block contexts (property, guide includes). Flex-col with `$space-lg` gap. |
| `.container-wide` | 1200px (`$width-wide`) | Wide content. Default for block wrappers. |
| `.container-narrow` | 680px (`$width-narrow`) | Prose-width content. Default for `icon-links` blocks. |

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
| `contact-form-block.html` | `contact-form` |
| `items-block.html` | `items` |
| `properties-block.html` | `properties` |
| `content-block.html` | `content` |
| `link-button.html` | `link-button` |

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
| `_link-button.scss` | Link button centering |

### Key Layout Files

| File | Purpose |
|---|---|
| `src/_layouts/design-system-base.html` | Base HTML shell, loads CSS/JS, applies `.design-system` to body |
| `src/_includes/design-system/blocks.html` | Block loop: iterates blocks, wraps in sections + containers |
| `src/_includes/design-system/render-block.html` | Block router: dispatches block.type to template |

### Example Page

`src/pages/chobble-template.md` uses hero, video-background, items, stats, features (x3), split-full (x2), split (x3), cta, contact-form, and image-background blocks.
