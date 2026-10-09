/* jscpd:ignore-start -- block schema declaration data */
import {
  collectionField,
  INTRO_CONTENT_FIELD,
} from "#utils/block-schema/shared.js";

export const type = "items-text-list";

export const fields = {
  collection: collectionField(
    'Name of an Eleventy collection (e.g. `"services"`, `"events"`).',
  ),
  intro_content: INTRO_CONTENT_FIELD,
};

export const docs = {
  summary:
    "Renders a collection as a comma-separated inline list of links, with optional introductory markdown text prepended. Excludes the current page from the list.",
};

export const example = {
  type: "items-text-list",
  collection: "news",
  intro_content: "Read our latest news posts:",
};
/* jscpd:ignore-end */
