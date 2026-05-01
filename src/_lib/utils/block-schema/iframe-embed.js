import { INTRO_CONTENT_FIELD, num, str } from "#utils/block-schema/shared.js";

export const type = "iframe-embed";

export const fields = {
  src: {
    ...str("Iframe URL"),
    required: true,
    description: "Full URL of the iframe to embed.",
  },
  title: {
    ...str("Accessible Title"),
    required: true,
    description: "Accessible title for the iframe.",
  },
  width: {
    ...num("Width (px)"),
    description: "Fixed pixel width. Omit to fill the container.",
  },
  height: {
    ...num("Height (px)"),
    description:
      "Fixed pixel height. Required for non-responsive embeds unless `aspect_ratio` is set.",
  },
  aspect_ratio: {
    ...str("Aspect Ratio (e.g. 16/9)"),
    description:
      'CSS `aspect-ratio` for responsive height, e.g. `"16/9"`. Alternative to `height`.',
  },
  max_width: {
    ...str("Max Width (CSS, e.g. 560px)"),
    description: 'CSS max-width on the wrapper, e.g. `"560px"`.',
  },
  sandbox: {
    ...str("Sandbox"),
    description:
      'Space-separated sandbox tokens, e.g. `"allow-scripts allow-same-origin allow-forms"`.',
  },
  allow: {
    ...str("Allow (permissions policy)"),
    description: "`allow` attribute for iframe permissions policy.",
  },
  scrolling: {
    ...str("Scrolling"),
    description: 'Legacy `scrolling` attribute, e.g. `"no"`.',
  },
  intro_content: INTRO_CONTENT_FIELD,
};

export const docs = {
  summary:
    "Third-party iframe embed (itch.io widgets, Buttondown, Bandcamp, Stripe buttons, etc).",
  template: "src/_includes/design-system/iframe-embed.html",
  scss: "src/css/design-system/_iframe-embed.scss",
  htmlRoot: '<div class="iframe-embed">',
  notes:
    "Provide either `height` for a fixed-height embed or `aspect_ratio` (e.g. `16/9`) for a responsive one. Use `max_width` to cap the embed width within the container.",
};
