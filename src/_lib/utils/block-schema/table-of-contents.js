/* jscpd:ignore-start -- block schema declaration data */
import { str } from "#utils/block-schema/shared.js";

export const type = "table-of-contents";

export const containerWidth = "narrow";

export const fields = {
  title: {
    ...str("Title"),
    default: "On this page",
    description:
      "Heading above the list, and the accessible name of the navigation landmark.",
  },
  levels: {
    ...str("Heading Levels"),
    default: "2,3",
    description:
      'Comma-separated heading levels to list, from `2` to `6`. Every other level is left out of the list, so `"2"` gives a top-level-only contents. An unlistable level fails the build.',
  },
};

export const docs = {
  summary:
    "In-page contents built from the headings the page actually renders.",
  scss: "src/css/design-system/_table-of-contents.scss",
  htmlRoot: '<nav class="table-of-contents">',
  notes:
    "The list is filled in after the page renders, from the headings in the page's main content at the levels this block names — no matter which blocks wrote them. Each listed heading gets an `id` (its own, when it already has one) so the links are stable, and the entries nest the way the headings do. A page whose headings none of the named levels match fails the build rather than publishing an empty contents.",
};

export const example = {
  type: "table-of-contents",
  title: "On this page",
  levels: "2,3",
};
/* jscpd:ignore-end */
