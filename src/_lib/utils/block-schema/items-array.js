/* jscpd:ignore-start -- block schema declaration data */
import {
  ITEMS_FILTERABLE_FIELDS,
  ITEMS_GRID_META,
  str,
} from "#utils/block-schema/shared.js";

export const type = "items-array";

export const fields = {
  items: {
    ...str("Items"),
    list: true,
    description:
      "Array of path strings. Each entry may be a file path (e.g. `src/news/example.md`) or a directory path (e.g. `src/news` or `src/news/`), in which case every item in that directory is included in place.",
  },
  ...ITEMS_FILTERABLE_FIELDS,
};

export const docs = {
  summary:
    "Renders items from an explicit list of paths. The collection is inferred dynamically from each item's path. Directory paths (ending in `/` or with no `.md` extension) expand to every item in that directory.",
  scss: ITEMS_GRID_META.scss,
};

export const example = {
  type: "items-array",
  items: ["news"],
  intro_content:
    "## Hand-picked items\n\nList file paths, or a directory to include everything in it.",
};
/* jscpd:ignore-end */
