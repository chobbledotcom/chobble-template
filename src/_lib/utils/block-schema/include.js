import { str } from "#utils/block-schema/shared.js";

export const type = "include";

export const fields = {
  file: {
    ...str("Template File Path"),
    required: true,
    description: "Path to the template file to include.",
  },
};

export const docs = {
  summary: "Includes an arbitrary template file.",
  notes:
    "Inline in `render-block.html` — uses `{% include block.file %}`. Escape hatch for custom content that doesn't fit the block system.",
};
