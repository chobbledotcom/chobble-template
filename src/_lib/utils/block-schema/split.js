import {
  BUTTON_FIELDS_WITH_SIZE,
  bool,
  md,
  num,
  objectField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "split";

export const schema = [
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
];

export const docs = {
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
      description: "Alt text for image, or accessible title for video iframe.",
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
      description: 'Syntax highlighting language (for `figure_type: "code"`).',
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
};

export const cmsFields = {
  title: str("Title"),
  title_level: num("Heading Level"),
  subtitle: str("Subtitle"),
  reverse: bool("Reverse Layout"),
  reveal_content: str("Reveal Content Animation"),
  reveal_figure: str("Reveal Figure Animation"),
  content: md("Content"),
  button: objectField("Button", BUTTON_FIELDS_WITH_SIZE),
  figure_type: str("Figure Type (image, video, code, html)"),
  figure_src: { type: "image", label: "Figure Image" },
  figure_alt: str("Figure Alt Text"),
  figure_caption: str("Figure Caption"),
  figure_video_id: str("Figure Video ID or URL"),
  figure_filename: str("Figure Code Filename"),
  figure_code: str("Figure Code Content"),
  figure_language: str("Figure Code Language"),
  figure_html: md("Figure HTML Content"),
};
