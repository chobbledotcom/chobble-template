/* jscpd:ignore-start -- block schema declaration data */
import {
  collectionField,
  FILTER_FIELD,
  INTRO_CONTENT_FIELD,
  str,
} from "#utils/block-schema/shared.js";

export const type = "link-columns";

export const fields = {
  collection: collectionField(
    'Name of an Eleventy collection (e.g. `"locations"`, `"services"`).',
  ),
  intro_content: INTRO_CONTENT_FIELD,
  filter: FILTER_FIELD,
  remove_text: {
    ...str("Remove Text (Regex)"),
    description:
      'Regex pattern (JavaScript syntax, global flag implied). Each match is removed from every link\'s display text and the result is trimmed. Useful for stripping repetitive prefixes like `"Service in "` so links render tidier.',
  },
};

export const docs = {
  summary:
    "Renders a collection as a plain-text unordered list of links arranged in responsive CSS columns. Optionally strips matching text via a regex so repetitive prefixes/suffixes can be removed.",
  scss: "src/css/design-system/_link-columns.scss",
};

export const example = {
  type: "link-columns",
  collection: "news",
  intro_content: "## A collection as link columns",
};
/* jscpd:ignore-end */
