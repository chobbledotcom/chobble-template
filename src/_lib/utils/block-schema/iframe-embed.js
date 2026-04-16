import {
  HEADER_KEYS,
  HEADER_PARAM_DOCS,
  md,
  num,
  str,
} from "#utils/block-schema/shared.js";

export const type = "iframe-embed";

export const schema = [
  "src",
  "title",
  "width",
  "height",
  "aspect_ratio",
  "max_width",
  "sandbox",
  "allow",
  "scrolling",
  ...HEADER_KEYS,
];

export const docs = {
  summary:
    "Third-party iframe embed (itch.io widgets, Buttondown, Bandcamp, Stripe buttons, etc).",
  template: "src/_includes/design-system/iframe-embed.html",
  scss: "src/css/design-system/_iframe-embed.scss",
  htmlRoot: '<div class="iframe-embed">',
  notes:
    "Provide either `height` for a fixed-height embed or `aspect_ratio` (e.g. `16/9`) for a responsive one. Use `max_width` to cap the embed width within the container.",
  params: {
    src: {
      type: "string",
      required: true,
      description: "Full URL of the iframe to embed.",
    },
    title: {
      type: "string",
      required: true,
      description: "Accessible title for the iframe.",
    },
    width: {
      type: "number",
      description: "Fixed pixel width. Omit to fill the container.",
    },
    height: {
      type: "number",
      description:
        "Fixed pixel height. Required for non-responsive embeds unless `aspect_ratio` is set.",
    },
    aspect_ratio: {
      type: "string",
      description:
        'CSS `aspect-ratio` for responsive height, e.g. `"16/9"`. Alternative to `height`.',
    },
    max_width: {
      type: "string",
      description: 'CSS max-width on the wrapper, e.g. `"560px"`.',
    },
    sandbox: {
      type: "string",
      description:
        'Space-separated sandbox tokens, e.g. `"allow-scripts allow-same-origin allow-forms"`.',
    },
    allow: {
      type: "string",
      description: "`allow` attribute for iframe permissions policy.",
    },
    scrolling: {
      type: "string",
      description: 'Legacy `scrolling` attribute, e.g. `"no"`.',
    },
    ...HEADER_PARAM_DOCS,
  },
};

export const cmsFields = {
  src: str("Iframe URL", { required: true }),
  title: str("Accessible Title", { required: true }),
  width: num("Width (px)"),
  height: num("Height (px)"),
  aspect_ratio: str("Aspect Ratio (e.g. 16/9)"),
  max_width: str("Max Width (CSS, e.g. 560px)"),
  sandbox: str("Sandbox"),
  allow: str("Allow (permissions policy)"),
  scrolling: str("Scrolling"),
  header_intro: md("Header Intro"),
};
