/**
 * Block schema definitions for design system blocks.
 *
 * Each block type has a set of allowed keys. Unknown keys will cause
 * a build error to catch typos like "video_url" instead of "video_id".
 *
 * Documentation metadata (BLOCK_DOCS) is used by
 * scripts/generate-blocks-reference.js to produce BLOCKS_LAYOUT.md.
 */

/**
 * Common wrapper keys allowed on all block types.
 * These are used by blocks.html to wrap blocks in sections/containers.
 */
const COMMON_BLOCK_KEYS = ["section_class", "container_width"];

/** Valid values for the common `container_width` block property. */
const CONTAINER_WIDTHS = ["full", "wide", "narrow"];

/** Keys for optional section-header rendering within a block. */
const HEADER_KEYS = ["header_intro", "header_align", "header_class"];

/**
 * Allowed keys per block type (excluding common keys and "type").
 */
const BLOCK_SCHEMAS = {
  "section-header": ["intro", "align", "class"],
  features: ["items", "reveal", "heading_level", "grid_class", ...HEADER_KEYS],
  "image-cards": [
    "items",
    "reveal",
    "heading_level",
    "image_aspect_ratio",
    ...HEADER_KEYS,
  ],
  stats: ["items", "reveal"],
  "code-block": ["filename", "code", "language", "reveal"],
  hero: ["badge", "title", "lead", "buttons", "class", "reveal"],
  split: [
    "title",
    "title_level",
    "subtitle",
    "content",
    "figure_type",
    "figure_src",
    "figure_alt",
    "figure_caption",
    "figure_video_id",
    "figure_filename",
    "figure_code",
    "figure_language",
    "figure_html",
    "reverse",
    "reveal_content",
    "reveal_figure",
    "button",
  ],
  "split-full": [
    "variant",
    "title_level",
    "left_title",
    "left_content",
    "left_button",
    "right_title",
    "right_content",
    "right_button",
    "reveal_left",
    "reveal_right",
  ],
  cta: ["title", "description", "button", "reveal"],
  "video-background": [
    "video_id",
    "video_title",
    "content",
    "aspect_ratio",
    "class",
    "thumbnail_url",
  ],
  "bunny-video-background": [
    "video_url",
    "thumbnail_url",
    "video_title",
    "content",
    "aspect_ratio",
    "class",
  ],
  "image-background": ["image", "image_alt", "content", "class", "parallax"],
  items: [
    "collection",
    "intro",
    "horizontal",
    "masonry",
    "filter",
    ...HEADER_KEYS,
  ],
  items_array: [
    "collection",
    "items",
    "intro",
    "horizontal",
    "masonry",
    "filter",
    ...HEADER_KEYS,
  ],
  contact_form: ["content", ...HEADER_KEYS],
  markdown: ["content"],
  html: ["content"],
  content: [],
  include: ["file"],
  properties: [],
  "guide-categories": [],
  "link-button": ["text", "href", "variant", "size", "reveal"],
  reviews: ["current_item"],
  gallery: ["items", "aspect_ratio"],
  icon_links: ["intro", "items", "reveal"],
};

/**
 * CMS field definitions for block types exposed in Pages CMS.
 *
 * This is the single source of truth for the shape of CMS components generated
 * for each block type. Not every block type in BLOCK_SCHEMAS is exposed in the
 * CMS (e.g. `markdown`, `html`, `content`, `include`, `properties`,
 * `guide-categories`, `image-background`, `link-button`, `reviews`, `gallery`,
 * `bunny-video-background`, `image-cards` are rendered by the template engine
 * but aren't editable through the CMS).
 *
 * Every top-level key must be listed in BLOCK_SCHEMAS for the same block type
 * (or in COMMON_BLOCK_KEYS). This invariant is enforced by
 * test/unit/utils/block-schema.test.js.
 *
 * Field shape mirrors the format consumed by scripts/customise-cms/generator.js
 * (schemaFieldToCmsField): `type` is one of "string", "number", "boolean",
 * "image", "object", "markdown", "reference"; `label` is a human-readable UI
 * string; object fields use a nested `fields` object; `list: true` marks
 * repeating values.
 */

// Primitive field factories
/** @param {string} label @param {object} [extras] */
const str = (label, extras) => ({ type: "string", label, ...extras });
/** @param {string} label */
const md = (label) => ({ type: "markdown", label });
/** @param {string} label */
const num = (label) => ({ type: "number", label });
/** @param {string} label */
const bool = (label) => ({ type: "boolean", label });
/** @param {string} label */
const imageField = (label) => ({ type: "image", label });
/** @param {string} label @param {Record<string, object>} fields */
const objectList = (label, fields) => ({
  type: "object",
  list: true,
  label,
  fields,
});
/** @param {string} label @param {Record<string, object>} fields */
const objectField = (label, fields) => ({ type: "object", label, fields });

// Fields common to every block type (container wrapper).
const CONTAINER_FIELDS = {
  container_width: str("Container Width (full, wide, narrow)"),
  section_class: str("Section Class"),
};

// Button fields (shared between hero buttons, split/cta buttons).
const BUTTON_FIELDS_BASE = {
  text: str("Button Text", { required: true }),
  href: str("URL", { required: true }),
  variant: str("Variant"),
};
const BUTTON_FIELDS_WITH_SIZE = {
  ...BUTTON_FIELDS_BASE,
  size: str("Size"),
};

// Filter object fields (shared between items and items_array blocks).
const FILTER_FIELD = objectField("Filter", {
  property: str("Property (e.g. url, data.title)"),
  includes: str("Contains"),
  equals: str("Equals"),
});

// Fields shared between items and items_array blocks.
const ITEMS_SHARED_FIELDS = {
  collection: str("Collection Name", { required: true }),
  intro: md("Intro Content (Markdown)"),
  horizontal: bool("Horizontal Slider"),
  masonry: bool("Masonry Grid"),
  header_intro: md("Header Intro"),
  filter: FILTER_FIELD,
};

/** @type {Record<string, Record<string, object>>} */
const BLOCK_CMS_FIELDS = {
  "section-header": {
    ...CONTAINER_FIELDS,
    intro: md("Section Header Intro"),
  },
  features: {
    ...CONTAINER_FIELDS,
    grid_class: str("Grid Class"),
    heading_level: num("Heading Level"),
    header_intro: md("Header Intro"),
    items: objectList("Features", {
      icon: str("Icon (Iconify ID or HTML entity)"),
      title: str("Title", { required: true }),
      description: str("Description", { required: true }),
      style: str("Custom Style"),
    }),
  },
  stats: {
    ...CONTAINER_FIELDS,
    items: objectList("Statistics", {
      value: str("Value", { required: true }),
      label: str("Label", { required: true }),
    }),
  },
  "code-block": {
    ...CONTAINER_FIELDS,
    filename: str("Filename", { required: true }),
    code: str("Code", { required: true }),
    language: str("Language"),
  },
  hero: {
    ...CONTAINER_FIELDS,
    class: str("CSS Class"),
    badge: str("Badge Text"),
    title: str("Title", { required: true }),
    lead: str("Lead Text"),
    buttons: objectList("Buttons", BUTTON_FIELDS_WITH_SIZE),
  },
  "video-background": {
    ...CONTAINER_FIELDS,
    video_id: str("Video Embed URL", { required: true }),
    video_title: str("Video Title"),
    aspect_ratio: str("Aspect Ratio"),
    thumbnail_url: str("Thumbnail URL"),
    class: str("CSS Class"),
    content: md("Overlay Content"),
  },
  "split-full": {
    ...CONTAINER_FIELDS,
    variant: str("Variant"),
    title_level: num("Heading Level"),
    reveal_left: str("Reveal Left Animation"),
    reveal_right: str("Reveal Right Animation"),
    left_title: str("Left Title"),
    left_content: md("Left Content"),
    left_button: objectField("Left Button", BUTTON_FIELDS_BASE),
    right_title: str("Right Title"),
    right_content: md("Right Content"),
    right_button: objectField("Right Button", BUTTON_FIELDS_BASE),
  },
  split: {
    ...CONTAINER_FIELDS,
    title: str("Title"),
    title_level: num("Heading Level"),
    subtitle: str("Subtitle"),
    reverse: bool("Reverse Layout"),
    reveal_content: str("Reveal Content Animation"),
    reveal_figure: str("Reveal Figure Animation"),
    content: md("Content"),
    button: objectField("Button", BUTTON_FIELDS_WITH_SIZE),
    figure_type: str("Figure Type (image, video, code, html)"),
    figure_src: imageField("Figure Image"),
    figure_alt: str("Figure Alt Text"),
    figure_caption: str("Figure Caption"),
    figure_video_id: str("Figure Video ID or URL"),
    figure_filename: str("Figure Code Filename"),
    figure_code: str("Figure Code Content"),
    figure_language: str("Figure Code Language"),
    figure_html: md("Figure HTML Content"),
  },
  cta: {
    ...CONTAINER_FIELDS,
    title: str("Title", { required: true }),
    description: str("Description"),
    button: objectField("Button", BUTTON_FIELDS_WITH_SIZE),
  },
  items: {
    ...CONTAINER_FIELDS,
    ...ITEMS_SHARED_FIELDS,
  },
  items_array: {
    ...CONTAINER_FIELDS,
    collection: ITEMS_SHARED_FIELDS.collection,
    items: {
      type: "reference",
      label: "Items",
      collection: "pages",
      search: "title",
      multiple: true,
    },
    intro: ITEMS_SHARED_FIELDS.intro,
    horizontal: ITEMS_SHARED_FIELDS.horizontal,
    masonry: ITEMS_SHARED_FIELDS.masonry,
    header_intro: ITEMS_SHARED_FIELDS.header_intro,
    filter: ITEMS_SHARED_FIELDS.filter,
  },
  icon_links: {
    ...CONTAINER_FIELDS,
    intro: md("Intro Content (Markdown)"),
    items: objectList("Links", {
      icon: str("Icon (Iconify ID or HTML entity)", { required: true }),
      text: str("Link Text", { required: true }),
      url: str("URL"),
    }),
  },
  contact_form: {
    ...CONTAINER_FIELDS,
    content: md("Content"),
  },
};

/**
 * Documentation metadata for each block type.
 * Used by scripts/generate-blocks-reference.js to auto-generate BLOCKS_LAYOUT.md.
 *
 * Each block has:
 *   summary  - One-line description
 *   template - Path to the include template (omit for inline blocks)
 *   scss     - Path to the SCSS file (omit if none)
 *   htmlRoot - Root HTML element/class
 *   notes    - Optional extra notes rendered after the parameter table
 *   params   - Object of parameter docs: { key: { type, required?, default?, description } }
 *
 * HEADER_PARAM_DOCS and COMMON_PARAM_DOCS are spread into blocks that use them.
 */

/** @type {Record<string, {type: string, default?: string, description: string}>} */
const HEADER_PARAM_DOCS = {
  header_intro: {
    type: "string",
    description: "Section header content rendered as markdown above the block.",
  },
  header_align: {
    type: "string",
    description: 'Header text alignment. `"center"` adds `.text-center`.',
  },
  header_class: {
    type: "string",
    description: "Extra CSS classes on the section header.",
  },
};

/** Reveal param doc for blocks that accept a string reveal value. */
const REVEAL_PARAM = { type: "string", description: "`data-reveal` value." };

/** Reveal param doc for blocks where reveal is boolean (default true). */
const REVEAL_BOOLEAN_PARAM = {
  type: "boolean",
  default: "true",
  description: "Adds `data-reveal` to each card.",
};

/** Extra CSS classes param doc. */
const CLASS_PARAM = { type: "string", description: "Extra CSS classes." };

/** Shared param docs for items and items_array blocks. */
const ITEMS_SHARED_PARAM_DOCS = {
  intro: {
    type: "string",
    description: "Markdown content rendered above items in `.prose`.",
  },
  horizontal: {
    type: "boolean",
    default: "false",
    description:
      "If true, renders as a horizontal slider instead of a wrapping grid.",
  },
  masonry: {
    type: "boolean",
    default: "false",
    description:
      "If true, renders as a masonry grid using uWrap for zero-reflow height prediction.",
  },
  filter: {
    type: "object",
    description:
      'Filter object: `{property, includes, equals}`. `property` is a dot-notation path (e.g. `"url"`, `"data.title"`). `includes` matches substring, `equals` matches exact value.',
  },
};

/** Shared param docs for video background blocks (video-background and bunny-video-background). */
const VIDEO_BG_SHARED_PARAMS = {
  video_title: {
    type: "string",
    default: '"Background video"',
    description: "Accessible `title` on the iframe.",
  },
  aspect_ratio: {
    type: "string",
    default: '"16/9"',
    description: "CSS aspect-ratio on container.",
  },
};

/** Overlay content param doc for video-background and image-background. */
const OVERLAY_CONTENT_PARAM = {
  type: "string",
  required: true,
  description:
    'Overlay content. Rendered as markdown in `<figcaption class="prose">`.',
};

/** Shared SCSS and htmlRoot for card-grid blocks (image-cards, gallery). */
const ITEMS_GRID_META = {
  scss: "src/css/design-system/_items.scss",
  htmlRoot: '<ul class="items" role="list">',
};

/** Shared collection param for items and items_array blocks. */
const COLLECTION_PARAM = (description) => ({
  type: "string",
  required: true,
  description,
});

/** Required items array param (image-cards, gallery). */
const ITEMS_ARRAY_PARAM = {
  type: "array",
  required: true,
};

const BLOCK_DOCS = {
  hero: {
    summary:
      "Full-width hero banner with optional badge, title, lead text, and action buttons.",
    template: "src/_includes/design-system/hero.html",
    scss: "src/css/design-system/_hero.scss",
    htmlRoot: '<header class="hero">',
    params: {
      title: {
        type: "string",
        required: true,
        description: "Main `<h1>` heading.",
      },
      badge: {
        type: "string",
        description:
          'Small pill label above the title. Renders as `<span class="badge">`.',
      },
      lead: {
        type: "string",
        description:
          "Subtitle paragraph. `body-lg` size, muted color, max-width `$width-narrow` (680px).",
      },
      buttons: {
        type: "array",
        description:
          'Action buttons. Each: `{text, href, variant, size}`. Variants: `"primary"` (filled), `"secondary"` (outlined), `"ghost"` (transparent). Sizes: `"sm"`, `"lg"`, or omit for default.',
      },
      class: {
        type: "string",
        description:
          'Extra CSS classes on the `<header>`. Use `"gradient"` for gradient bg.',
      },
      reveal: REVEAL_PARAM,
    },
  },

  "section-header": {
    summary: "Standalone section header with rich text intro.",
    template: "src/_includes/design-system/section-header.html",
    scss: "src/css/design-system/_base.scss",
    htmlRoot: '<div class="section-header prose">',
    params: {
      intro: {
        type: "string",
        required: true,
        description:
          "Rich text content rendered as markdown. Use headings and body text together.",
      },
      align: {
        type: "string",
        default: '"center"',
        description: 'Text alignment. `"center"` adds `.text-center`.',
      },
      class: CLASS_PARAM,
    },
  },

  features: {
    summary:
      "Grid of feature cards with optional icons, titles, and descriptions.",
    template: "src/_includes/design-system/features.html",
    scss: "src/css/design-system/_feature.scss",
    htmlRoot:
      '<ul class="features" role="list"> containing <li><article class="feature"> items',
    params: {
      items: {
        type: "array",
        required: true,
        description:
          'Feature objects. Each: `{icon, icon_label, title, description, style}`. Icon can be an Iconify ID (`"prefix:name"`), image path (`"/images/foo.svg"`), or raw HTML/emoji.',
      },
      heading_level: {
        type: "number",
        default: "3",
        description: "Heading level for item titles.",
      },
      grid_class: {
        type: "string",
        default: '"features"',
        description:
          'CSS class on the `<ul>`. Options: `"features"` (auto-fit grid), `"grid"` (1/2/3 col), `"grid--4"` (1/2/4 col). Can combine: `"grid--4 text-center"`.',
      },
      reveal: REVEAL_BOOLEAN_PARAM,
      ...HEADER_PARAM_DOCS,
    },
  },

  "image-cards": {
    summary:
      "Grid of cards featuring images with titles and optional descriptions.",
    template: "src/_includes/design-system/image-cards.html",
    ...ITEMS_GRID_META,
    params: {
      items: {
        ...ITEMS_ARRAY_PARAM,
        description:
          "Card objects. Each: `{image, title, description, link}`. Images processed by `{% image %}` shortcode for responsive srcset + LQIP.",
      },
      heading_level: {
        type: "number",
        default: "3",
        description: "Heading level for titles.",
      },
      image_aspect_ratio: {
        type: "string",
        description:
          'Aspect ratio for images, e.g. `"16/9"`, `"1/1"`, `"4/3"`.',
      },
      reveal: {
        ...REVEAL_BOOLEAN_PARAM,
        description: "Adds `data-reveal` to each item.",
      },
      ...HEADER_PARAM_DOCS,
    },
  },

  stats: {
    summary: "Key metrics displayed as large numbers with labels.",
    template: "src/_includes/design-system/stats.html",
    scss: "src/css/design-system/_stats.scss",
    htmlRoot: '<dl class="stats">',
    params: {
      items: {
        type: "array",
        required: true,
        description:
          'Stat objects: `{value, label}` or pipe-delimited strings `"value|label"`.',
      },
      reveal: {
        ...REVEAL_BOOLEAN_PARAM,
        description: "Adds `data-reveal` to each stat.",
      },
    },
  },

  "code-block": {
    summary: "Terminal-style code display with macOS-like toolbar header.",
    template: "src/_includes/design-system/code-block.html",
    scss: "src/css/design-system/_code-block.scss",
    htmlRoot: '<div class="code-block">',
    params: {
      filename: {
        type: "string",
        required: true,
        description: "Displayed in the toolbar header.",
      },
      code: {
        type: "string",
        required: true,
        description: "Code content. Rendered in `<pre><code>`.",
      },
      language: {
        type: "string",
        description:
          "Sets `data-language` attribute (for future syntax highlighting).",
      },
      reveal: { ...REVEAL_BOOLEAN_PARAM, description: "`data-reveal` value." },
    },
  },

  split: {
    summary:
      "Two-column layout with text content and a figure (image, video, code block, or HTML).",
    template: "src/_includes/design-system/split.html",
    scss: "src/css/design-system/_split.scss",
    htmlRoot: '<div class="split">',
    notes:
      "Figure fields are grouped by `figure_type`: **image** uses `figure_src`, `figure_alt`, `figure_caption`; **video** uses `figure_video_id`, `figure_alt`, `figure_caption`; **code** uses `figure_filename`, `figure_code`, `figure_language`; **html** uses `figure_html`.",
    params: {
      title: { type: "string", description: "Section heading." },
      title_level: {
        type: "number",
        default: "2",
        description: "Heading level.",
      },
      subtitle: {
        type: "string",
        description: "Subtitle with `.text-muted` styling.",
      },
      content: {
        type: "string",
        description:
          'Main content. Rendered through `renderContent: "md"` filter (supports markdown). Wrapped in `.prose`.',
      },
      figure_type: {
        type: "string",
        description: '`"image"`, `"video"`, `"code"`, or `"html"`.',
      },
      figure_src: {
        type: "string",
        description: 'Image path (for `figure_type: "image"`).',
      },
      figure_alt: {
        type: "string",
        description:
          "Alt text for image, or accessible title for video iframe.",
      },
      figure_caption: {
        type: "string",
        description: "Visible caption below image or video.",
      },
      figure_video_id: {
        type: "string",
        description:
          'YouTube video ID or custom iframe URL (for `figure_type: "video"`).',
      },
      figure_filename: {
        type: "string",
        description:
          'Displayed filename in code block header (for `figure_type: "code"`).',
      },
      figure_code: {
        type: "string",
        description: 'Code content (for `figure_type: "code"`).',
      },
      figure_language: {
        type: "string",
        description:
          'Syntax highlighting language (for `figure_type: "code"`).',
      },
      figure_html: {
        type: "string",
        description: 'Raw HTML content (for `figure_type: "html"`).',
      },
      reverse: {
        type: "boolean",
        default: "false",
        description:
          "Reverses column order (content right, figure left) on desktop.",
      },
      reveal_content: {
        type: "string",
        default: '"left"',
        description:
          '`data-reveal` for the text side. Auto-set to `"right"` when `reverse` is true.',
      },
      reveal_figure: {
        type: "string",
        default: '"scale"',
        description: "`data-reveal` for the figure side.",
      },
      button: {
        type: "object",
        description:
          '`{text, href, variant}`. Rendered below content. Default variant: `"secondary"`.',
      },
    },
  },

  "split-full": {
    summary:
      "Full-width two-panel layout with distinct background colors per side.",
    template: "src/_includes/design-system/split-full.html",
    scss: "src/css/design-system/_split.scss",
    htmlRoot: '<div class="split-full">',
    notes:
      'Variants: `"dark-left"` / `"dark-right"` (dark bg + light text), `"primary-left"` / `"primary-right"` (`--color-link` bg + contrast text). Button colors automatically invert in dark/primary panels. The parent `<section>` has zero padding — panels handle their own padding.',
    params: {
      variant: {
        type: "string",
        description:
          'Color scheme: `"dark-left"`, `"dark-right"`, `"primary-left"`, `"primary-right"`.',
      },
      title_level: {
        type: "number",
        default: "2",
        description: "Heading level for both sides.",
      },
      left_title: {
        type: "string",
        description: "Left panel heading.",
      },
      left_content: {
        type: "string",
        description: "Left panel content (rendered as markdown via `.prose`).",
      },
      left_button: {
        type: "object",
        description: "`{text, href, variant}`.",
      },
      right_title: {
        type: "string",
        description: "Right panel heading.",
      },
      right_content: {
        type: "string",
        description: "Right panel content (rendered as markdown via `.prose`).",
      },
      right_button: {
        type: "object",
        description: "`{text, href, variant}`.",
      },
      reveal_left: {
        type: "string",
        description: "`data-reveal` for left panel.",
      },
      reveal_right: {
        type: "string",
        description: "`data-reveal` for right panel.",
      },
    },
  },

  cta: {
    summary: "Call-to-action banner with gradient background.",
    template: "src/_includes/design-system/cta.html",
    scss: "src/css/design-system/_cta.scss",
    htmlRoot: '<aside class="cta">',
    params: {
      title: {
        type: "string",
        required: true,
        description: "CTA heading (`<h2>`).",
      },
      description: {
        type: "string",
        description:
          "Supporting text. `body-lg`, 0.9 opacity, max-width `$width-narrow`.",
      },
      button: {
        type: "object",
        description:
          '`{text, href, variant, size}`. Default variant: `"secondary"`, default size: `"lg"`.',
      },
      reveal: REVEAL_PARAM,
    },
  },

  "video-background": {
    summary: "Auto-playing video background with overlaid text content.",
    template: "src/_includes/design-system/video-background.html",
    scss: "src/css/design-system/_video-background.scss",
    htmlRoot: '<div class="video-background">',
    notes:
      "YouTube IDs get `youtube-nocookie.com` embed URLs with `autoplay=1&mute=1&loop=1&controls=0`. Custom URLs (starting with `http`) are used directly.",
    params: {
      video_id: {
        type: "string",
        required: true,
        description:
          "YouTube video ID or full iframe URL (for Bunny, Vimeo, etc).",
      },
      ...VIDEO_BG_SHARED_PARAMS,
      content: OVERLAY_CONTENT_PARAM,
      class: CLASS_PARAM,
      thumbnail_url: {
        type: "string",
        description:
          "URL of a thumbnail image displayed behind the iframe while the video loads.",
      },
    },
  },

  "bunny-video-background": {
    summary:
      "Bunny CDN video background with player.js-powered thumbnail that fades when playback starts.",
    template: "src/_includes/design-system/bunny-video-background.html",
    scss: "src/css/design-system/_video-background.scss",
    htmlRoot: '<div class="video-background" data-bunny-video>',
    notes:
      "Uses player.js (loaded from Bunny CDN) to detect when the video starts playing, then fades out the thumbnail. The player.js script is only included when this block is used.",
    params: {
      video_url: {
        type: "string",
        required: true,
        description: "Bunny Stream embed URL.",
      },
      thumbnail_url: {
        type: "string",
        required: true,
        description:
          "Thumbnail image URL. Displayed as a placeholder until video playback begins.",
      },
      ...VIDEO_BG_SHARED_PARAMS,
      content: OVERLAY_CONTENT_PARAM,
      class: CLASS_PARAM,
    },
  },

  "image-background": {
    summary:
      "Full-width image background with overlaid text and optional parallax.",
    template: "src/_includes/design-system/image-background.html",
    scss: "src/css/design-system/_image-background.scss",
    htmlRoot: '<div class="image-background">',
    notes:
      "Image processed via `{% image %}` at widths 2560/1920/1280/960/640, cropped to 16/9. Parallax uses `animation-timeline: scroll()` for native CSS scroll-driven translation.",
    params: {
      image: {
        type: "string",
        required: true,
        description: "Image path.",
      },
      image_alt: {
        type: "string",
        default: '"Background image"',
        description: "Alt text.",
      },
      content: OVERLAY_CONTENT_PARAM,
      class: CLASS_PARAM,
      parallax: {
        type: "boolean",
        default: "false",
        description:
          "Enables CSS `animation-timeline: scroll()` parallax effect.",
      },
    },
  },

  markdown: {
    summary: "Renders markdown content as rich text.",
    htmlRoot: '<div class="prose">',
    scss: "src/css/design-system/_prose.scss",
    notes: "Inline in `render-block.html` (no separate template file).",
    params: {
      content: {
        type: "string",
        required: true,
        description:
          'Markdown content. Passed through `renderContent: "md"` filter.',
      },
    },
  },

  html: {
    summary: "Outputs raw HTML without processing.",
    notes:
      "Inline in `render-block.html` (no separate template file). No wrapping element. Useful for custom embeds, iframes, or one-off HTML.",
    params: {
      content: {
        type: "string",
        required: true,
        description: "Raw HTML. Output directly with `{{ block.content }}`.",
      },
    },
  },

  contact_form: {
    summary: "Two-column layout with prose content and a contact form.",
    template: "src/_includes/design-system/contact-form-block.html",
    scss: "src/css/design-system/_contact-form-block.scss",
    htmlRoot: '<div class="contact-form-block">',
    params: {
      content: {
        type: "string",
        description:
          "Left-side content. Rendered as markdown in `.prose`. Centered text.",
      },
      ...HEADER_PARAM_DOCS,
    },
  },

  items: {
    summary:
      "Displays an Eleventy collection as a card grid or horizontal slider.",
    template: "src/_includes/design-system/items-block.html",
    scss: ITEMS_GRID_META.scss,
    params: {
      collection: COLLECTION_PARAM(
        'Name of an Eleventy collection (e.g. `"featuredProducts"`, `"events"`, `"news"`).',
      ),
      ...ITEMS_SHARED_PARAM_DOCS,
      ...HEADER_PARAM_DOCS,
    },
  },

  items_array: {
    summary:
      "Renders items from an explicit list of paths (e.g. from Pages CMS content references).",
    template: "src/_includes/design-system/items-array-block.html",
    scss: ITEMS_GRID_META.scss,
    params: {
      collection: COLLECTION_PARAM("Collection to resolve paths against."),
      items: {
        type: "array",
        required: true,
        description: "Array of file paths (e.g. from Pages CMS references).",
      },
      ...ITEMS_SHARED_PARAM_DOCS,
      ...HEADER_PARAM_DOCS,
    },
  },

  properties: {
    summary: "Displays property listings (holiday lets) with filter controls.",
    template: "src/_includes/design-system/properties-block.html",
    scss: "src/css/design-system/_property.scss",
    notes:
      "No block-level parameters. Uses the global `collections.properties` and optional `filterPage` data for URL-based filtering.",
    params: {},
  },

  "guide-categories": {
    summary: "Displays guide categories collection.",
    template: "src/_includes/design-system/guide-categories-block.html",
    notes:
      "No block-level parameters. Uses the global `collections.guide-categories`.",
    params: {},
  },

  content: {
    summary:
      "Outputs the page's `content` property (from markdown body below frontmatter).",
    template: "src/_includes/design-system/content-block.html",
    notes:
      "No parameters. Renders `{{ content }}` if non-empty. Used for pages that combine blocks with traditional markdown content.",
    params: {},
  },

  include: {
    summary: "Includes an arbitrary template file.",
    notes:
      "Inline in `render-block.html` — uses `{% include block.file %}`. Escape hatch for custom content that doesn't fit the block system.",
    params: {
      file: {
        type: "string",
        required: true,
        description: "Path to the template file to include.",
      },
    },
  },

  "link-button": {
    summary: "Standalone centered button linking to an anchor or URL.",
    template: "src/_includes/design-system/link-button.html",
    scss: "src/css/design-system/_link-button.scss",
    htmlRoot: '<div class="link-button">',
    params: {
      text: {
        type: "string",
        required: true,
        description: "Button label.",
      },
      href: {
        type: "string",
        required: true,
        description: 'Link URL or anchor (e.g. `"#contact"`, `"/about"`).',
      },
      variant: {
        type: "string",
        default: '"primary"',
        description: '`"primary"`, `"secondary"`, or `"ghost"`.',
      },
      size: {
        type: "string",
        description: '`"sm"`, `"lg"`, or omit for default.',
      },
      reveal: REVEAL_PARAM,
    },
  },

  reviews: {
    summary:
      "Renders reviews collection with optional filtering to the current item.",
    template: "src/_includes/design-system/reviews-block.html",
    scss: "src/css/design-system/_reviews.scss",
    notes:
      "Uses `getReviewsFor` filter to match reviews by slug and tags when `current_item` is true.",
    params: {
      current_item: {
        type: "boolean",
        description:
          "If true, filters reviews to the current item by slug and tags.",
      },
    },
  },

  icon_links: {
    summary:
      "Vertical list of links with icons, rendered as a flex column stack.",
    template: "src/_includes/design-system/icon-links.html",
    scss: "src/css/design-system/_icon-links.scss",
    htmlRoot: '<ul class="icon-links" role="list">',
    params: {
      intro: {
        type: "string",
        description:
          "Markdown content rendered above the links list in `.prose`.",
      },
      items: {
        type: "array",
        required: true,
        description:
          'Link objects. Each: `{icon, text, url}`. `url` is optional — items without it render as plain text. Icon can be an Iconify ID (`"prefix:name"`), image path, or raw HTML/emoji.',
      },
      reveal: {
        ...REVEAL_BOOLEAN_PARAM,
        description: "Adds `data-reveal` to each link item.",
      },
    },
  },

  gallery: {
    summary: "Image grid with optional aspect ratio cropping and captions.",
    template: "src/_includes/design-system/gallery.html",
    ...ITEMS_GRID_META,
    params: {
      items: {
        ...ITEMS_ARRAY_PARAM,
        description:
          "Image objects. Each: `{image, caption}`. Images processed by `{% image %}` shortcode.",
      },
      aspect_ratio: {
        type: "string",
        description:
          'Aspect ratio for images (e.g. `"16/9"`, `"1/1"`, `"4/3"`). Default: no cropping.',
      },
    },
  },
};

const quoteJoin = (arr) => arr.map((k) => `"${k}"`).join(", ");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/**
 * Validates a single block against its schema.
 * Throws an error if the block contains unknown keys or unknown type.
 *
 * @param {object} block - Block to validate
 * @param {string} ctx - Context suffix for error messages
 * @throws {Error} If the block contains unknown keys or invalid type
 */
const validateBlock = (block, ctx) => {
  assert(block.type, `Block is missing required "type" field${ctx}`);

  const allowedKeys = BLOCK_SCHEMAS[block.type];
  assert(
    allowedKeys,
    `Unknown block type "${block.type}"${ctx}. Valid types: ${Object.keys(BLOCK_SCHEMAS).join(", ")}`,
  );

  const allAllowed = [...allowedKeys, ...COMMON_BLOCK_KEYS];
  const unknown = Object.keys(block).filter(
    (k) => k !== "type" && !allAllowed.includes(k),
  );
  assert(
    unknown.length === 0,
    `Block type "${block.type}" has unknown keys: ${quoteJoin(unknown)}${ctx}. Allowed keys: ${quoteJoin(allAllowed)}`,
  );

  assert(
    block.container_width === undefined ||
      CONTAINER_WIDTHS.includes(block.container_width),
    `Block type "${block.type}" has invalid container_width "${block.container_width}"${ctx}. Valid values: ${CONTAINER_WIDTHS.join(", ")}`,
  );
};

/**
 * Validates an array of blocks against their schemas.
 * Throws an error if any block contains unknown keys or unknown type.
 *
 * @param {object[]} blocks - Array of blocks to validate
 * @param {string} context - Context for error messages (e.g., file path)
 * @throws {Error} If any block contains unknown keys or invalid type
 */
const validateBlocks = (blocks, context = "") => {
  for (const [index, block] of blocks.entries()) {
    validateBlock(block, ` (block ${index + 1}${context})`);
  }
};

export {
  BLOCK_CMS_FIELDS,
  BLOCK_DOCS,
  BLOCK_SCHEMAS,
  validateBlock,
  validateBlocks,
};
