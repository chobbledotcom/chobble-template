import { str } from "#utils/block-schema/shared.js";

export const type = "html";

export const fields = {
  content: {
    ...str("Raw HTML"),
    required: true,
    description: "Raw HTML. Output directly with `{{ block.content }}`.",
  },
};

export const docs = {
  summary: "Outputs raw HTML without processing.",
  notes:
    "Inline in `render-block.html` (no separate template file). No wrapping element. Useful for custom embeds, iframes, or one-off HTML.",
};
