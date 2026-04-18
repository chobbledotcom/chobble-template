import { ITEMS_COMMON_FIELDS, str } from "#utils/block-schema/shared.js";

export const type = "socials";

export const fields = {
  directory: {
    ...str("Directory", { required: true }),
    description:
      'Directory (relative to `src/`) containing social-post JSON files — e.g. `"instagram-posts"` or `"mastodon-posts"`. Each `*.json` file must have `url`, `date`, `title`, and `thumbnail` keys.',
  },
  ...ITEMS_COMMON_FIELDS,
};

export const docs = {
  summary:
    "Renders social-media posts loaded from a directory of JSON files as a card grid or horizontal slider.",
  template: "src/_includes/design-system/socials-block.html",
  scss: "src/css/design-system/_items.scss",
  notes:
    "Posts are loaded per-block from the given directory, so the same template works for Instagram, Mastodon, or any other source. External `url` values open in a new tab.",
};
