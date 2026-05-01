import {
  IMAGE_ASPECT_RATIO_FIELD,
  ITEMS_COMMON_FIELDS,
  ITEMS_GRID_META,
  str,
} from "#utils/block-schema/shared.js";

export const type = "items-array";

export const fields = {
  items: {
    ...str("Items"),
    list: true,
    description:
      "Array of path strings. Each entry may be a file path (e.g. `src/products/widget.md`) or a directory path (e.g. `locations/fulchester` or `locations/fulchester/`), in which case every item in that directory is included in place.",
  },
  ...ITEMS_COMMON_FIELDS,
  image_aspect_ratio: IMAGE_ASPECT_RATIO_FIELD,
};

export const docs = {
  summary:
    "Renders items from an explicit list of paths. The collection is inferred dynamically from each item's path. Directory paths (ending in `/` or with no `.md` extension) expand to every item in that directory.",
  template: "src/_includes/design-system/items-array-block.html",
  scss: ITEMS_GRID_META.scss,
};
