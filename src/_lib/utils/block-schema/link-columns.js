import {
  FILTER_FIELD,
  HEADER_FIELDS,
  ITEMS_COMMON_FIELDS,
  str,
} from "#utils/block-schema/shared.js";

export const type = "link-columns";

export const fields = {
  collection: {
    ...str("Collection Name"),
    required: true,
    description:
      'Name of an Eleventy collection (e.g. `"locations"`, `"services"`).',
  },
  intro: ITEMS_COMMON_FIELDS.intro,
  filter: {
    ...FILTER_FIELD,
    description: ITEMS_COMMON_FIELDS.filter.description,
  },
  remove_text: {
    ...str("Remove Text (Regex)"),
    description:
      'Regex pattern (JavaScript syntax, global flag implied). Each match is removed from every link\'s display text and the result is trimmed. Useful for stripping repetitive prefixes like `"Service in "` so links render tidier.',
  },
  ...HEADER_FIELDS,
};

export const docs = {
  summary:
    "Renders a collection as a plain-text unordered list of links arranged in responsive CSS columns. Optionally strips matching text via a regex so repetitive prefixes/suffixes can be removed.",
  template: "src/_includes/design-system/link-columns.html",
  scss: "src/css/design-system/_link-columns.scss",
};
