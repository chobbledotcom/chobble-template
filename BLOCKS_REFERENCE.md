# Blocks Reference

Design system blocks for building pages. Each page's `blocks` array in frontmatter defines the layout.

## How Blocks Work

1. Pages define a `blocks: []` array in frontmatter
2. `eleventyComputed.js` validates blocks against schemas and applies defaults
3. `blocks.html` loops through and wraps each in a `<section>`
4. `render-block.html` routes to the type-specific template

## Common Parameters (All Blocks)

| Key | Description |
|-----|-------------|
| `type` | **Required.** Block type identifier |
| `section_class` | CSS class for wrapping `<section>` element |
| `full_width` | If true, skips container wrapping |

---

## Block Types

### `section-header`

Rich text section header with markdown support.

| Key | Default | Description |
|-----|---------|-------------|
| `intro` | | Markdown content (replaces old title/subtitle) |
| `align` | `"center"` | Text alignment |
| `class` | | Additional CSS classes |

```yaml
- type: section-header
  intro: |-
    ## About Our Business
    Quality widgets since 2010
```

### `hero`

Full-width hero with badge, title, lead text, and action buttons.

| Key | Default | Description |
|-----|---------|-------------|
| `title` | | Main heading |
| `badge` | | Badge text above title |
| `lead` | | Subtitle/description |
| `buttons[]` | | Array of `{text, href, variant, size}` |
| `class` | | Additional CSS classes |
| `reveal` | | Data-reveal animation |

Button `variant`: `"primary"` (default), `"secondary"`, `"ghost"`. Button `size`: `"sm"`, `"lg"`, or omit for default.

### `features`

Grid of feature cards with icons.

| Key | Default | Description |
|-----|---------|-------------|
| `items[]` | | Array of feature objects (see below) |
| `reveal` | `true` | Data-reveal animation |
| `heading_level` | `3` | H tag level for titles |
| `grid_class` | `"features"` | CSS grid class |
| `header_intro` | | Section header markdown |
| `header_align` | | Header alignment |
| `header_class` | | Header CSS classes |

Each item: `{icon, icon_label, title, description, style}`. Icon can be an Iconify ID (e.g. `"hugeicons:rocket"`), image path (starts with `/`), or HTML entity.

### `image-cards`

Grid of image cards with titles/descriptions.

| Key | Default | Description |
|-----|---------|-------------|
| `items[]` | | Array of `{image, title, description, link}` |
| `reveal` | `true` | Data-reveal animation |
| `heading_level` | `3` | H tag level |
| `image_aspect_ratio` | | Aspect ratio string (e.g. `"16/9"`, `"1/1"`) |
| `header_intro` | | Section header markdown |
| `header_align` | | Header alignment |
| `header_class` | | Header CSS classes |

### `stats`

Statistics display as description list.

| Key | Default | Description |
|-----|---------|-------------|
| `items[]` | | Array of `{value, label}` or `"value|label"` strings |
| `reveal` | `true` | Data-reveal animation |

### `split`

Two-column layout with text and figure (image/video/code/HTML).

| Key | Default | Description |
|-----|---------|-------------|
| `title` | | Section heading |
| `title_level` | `2` | H tag level |
| `subtitle` | | Subtitle text |
| `content` | | Main content HTML/markdown |
| `reverse` | | Reverse layout (content on right) |
| `reveal_content` | auto | Animation for content side (`"left"` or `"right"` based on `reverse`) |
| `reveal_figure` | `"scale"` | Animation for figure side |
| `button` | | Button object `{text, href, variant}` |
| `figure_type` | | `"image"`, `"video"`, `"code"`, or `"html"` |

Figure fields by type:
- **image:** `figure_src`, `figure_alt`, `figure_caption`
- **video:** `figure_video_id`, `figure_alt`, `figure_caption`
- **code:** `figure_filename`, `figure_code`, `figure_language`
- **html:** `figure_html`

### `split-full`

Full-width two-tone split layout with independent left/right sections.

| Key | Default | Description |
|-----|---------|-------------|
| `variant` | | `"dark-left"`, `"dark-right"`, `"primary-left"`, `"primary-right"` |
| `title_level` | `2` | H tag level |
| `left_title` | | Left section heading |
| `left_content` | | Left content markdown |
| `left_button` | | Left button `{text, href, variant}` |
| `right_title` | | Right section heading |
| `right_content` | | Right content markdown |
| `right_button` | | Right button `{text, href, variant}` |
| `reveal_left` | | Animation for left side |
| `reveal_right` | | Animation for right side |

### `cta`

Call-to-action with gradient background.

| Key | Default | Description |
|-----|---------|-------------|
| `title` | | CTA heading |
| `description` | | Supporting text |
| `button` | | `{text, href, variant, size}` (defaults: variant `"secondary"`, size `"lg"`) |
| `reveal` | | Data-reveal animation |

### `code-block`

Terminal-style code block with filename header.

| Key | Default | Description |
|-----|---------|-------------|
| `filename` | | Code filename |
| `code` | | Code content |
| `language` | | Language for syntax highlighting |
| `reveal` | `true` | Data-reveal animation |

### `gallery`

Image grid with optional captions.

| Key | Default | Description |
|-----|---------|-------------|
| `items[]` | | Array of `{image, caption}` |
| `aspect_ratio` | | Aspect ratio string (e.g. `"16/9"`, `"1/1"`, `"4/3"`) |

### `video-background`

Full-width video background with overlaid text.

| Key | Default | Description |
|-----|---------|-------------|
| `video_id` | | YouTube video ID or embed URL |
| `video_title` | `"Background video"` | Iframe title for accessibility |
| `content` | | Markdown content overlaid on video |
| `aspect_ratio` | `"16/9"` | Video container aspect ratio |
| `class` | | Additional CSS classes |

### `image-background`

Full-width image background with overlaid text.

| Key | Default | Description |
|-----|---------|-------------|
| `image` | | Image path |
| `image_alt` | `"Background image"` | Alt text |
| `content` | | Markdown content overlaid |
| `class` | | Additional CSS classes |
| `parallax` | | Enable parallax scrolling effect |

### `link-button`

Standalone button linking to a URL or anchor.

| Key | Default | Description |
|-----|---------|-------------|
| `text` | | Button label |
| `href` | | Link URL |
| `variant` | `"primary"` | `"primary"`, `"secondary"`, or `"ghost"` |
| `size` | | `"sm"`, `"lg"`, or omit for default |
| `reveal` | | Data-reveal animation |

### `items`

Render items from an Eleventy collection with optional filtering.

| Key | Default | Description |
|-----|---------|-------------|
| `collection` | | Eleventy collection name (e.g. `"featuredProducts"`, `"events"`) |
| `intro` | | Markdown content above items |
| `horizontal` | | Render as horizontal slider |
| `filter` | | Filter object: `{property, includes, equals}` |
| `header_intro` | | Section header markdown |
| `header_align` | | Header alignment |
| `header_class` | | Header CSS classes |

Filter example: `{property: "data.title", includes: "Widget"}` or `{property: "url", equals: "/products/foo/"}`.

### `items_array`

Render an explicit list of item paths (e.g. from Pages CMS content references).

| Key | Default | Description |
|-----|---------|-------------|
| `collection` | | Collection to resolve paths against |
| `items[]` | | Array of file paths |
| `intro` | | Markdown content above items |
| `horizontal` | | Render as horizontal slider |
| `filter` | | Filter object (same as `items`) |
| `header_intro` | | Section header markdown |
| `header_align` | | Header alignment |
| `header_class` | | Header CSS classes |

### `contact_form`

Contact form with optional section header.

| Key | Default | Description |
|-----|---------|-------------|
| `content` | | Markdown content above form |
| `header_intro` | | Section header markdown |
| `header_align` | | Header alignment |
| `header_class` | | Header CSS classes |

### `reviews`

Render reviews, optionally filtered to the current item.

| Key | Default | Description |
|-----|---------|-------------|
| `current_item` | | If true, filters reviews to current item by slug and tags |

### `markdown`

Render markdown content inline.

| Key | Default | Description |
|-----|---------|-------------|
| `content` | | Markdown text |

### `html`

Raw HTML passthrough.

| Key | Default | Description |
|-----|---------|-------------|
| `content` | | Raw HTML |

### `content`

Renders the page's body content (markdown from the page file). Use this to position main content relative to other blocks. No parameters.

### `include`

Dynamically include any template file.

| Key | Default | Description |
|-----|---------|-------------|
| `file` | | Path to include file |

### `properties`

Renders the properties collection. No parameters.

### `guide-categories`

Renders the guide categories collection. No parameters.

---

## Block Defaults

Applied automatically at build time (from `eleventyComputed.js`):

```javascript
{
  features:         { reveal: true, heading_level: 3, grid_class: "features" },
  stats:            { reveal: true },
  split:            { title_level: 2, reveal_figure: "scale" },
  "section-header": { align: "center" },
  "image-cards":    { reveal: true, heading_level: 3 },
  "code-block":     { reveal: true },
  "video-background": { aspect_ratio: "16/9" },
}
```

Additionally, `split` blocks auto-set `reveal_content` to `"left"` (or `"right"` if `reverse` is true) when not explicitly provided.

All blocks receive `section_class: ""` as a default.

## Validation

Block schemas are defined in `src/_lib/utils/block-schema.js`. At build time, every block is validated:

- Missing `type` field throws an error
- Unknown block types throw an error listing valid types
- Unknown keys on a block throw an error listing allowed keys

This catches typos and misconfiguration early.
