import {
  COLLECTION_PARAM,
  FILTER_FIELD,
  HEADER_KEYS,
  HEADER_PARAM_DOCS,
  ITEMS_CMS_SHARED_FIELDS,
  ITEMS_COMMON_PARAMS,
  md,
  str,
} from "#utils/block-schema/shared.js";

export const type = "link-columns";

export const schema = [
  "collection",
  "intro",
  "filter",
  "remove_text",
  ...HEADER_KEYS,
];

export const docs = {
  summary:
    "Renders a collection as a plain-text unordered list of links arranged in responsive CSS columns. Optionally strips matching text via a regex so repetitive prefixes/suffixes can be removed.",
  template: "src/_includes/design-system/link-columns.html",
  scss: "src/css/design-system/_link-columns.scss",
  params: {
    collection: COLLECTION_PARAM(
      'Name of an Eleventy collection (e.g. `"locations"`, `"services"`).',
    ),
    intro: ITEMS_COMMON_PARAMS.intro,
    filter: ITEMS_COMMON_PARAMS.filter,
    remove_text: {
      type: "string",
      description:
        'Regex pattern (JavaScript syntax, global flag implied). Each match is removed from every link\'s display text and the result is trimmed. Useful for stripping repetitive prefixes like `"Service in "` so links render tidier.',
    },
    ...HEADER_PARAM_DOCS,
  },
};

export const cmsFields = {
  collection: ITEMS_CMS_SHARED_FIELDS.collection,
  intro: md("Intro Content (Markdown)"),
  filter: FILTER_FIELD,
  remove_text: str("Remove Text (Regex)"),
  header_intro: md("Header Intro"),
};
