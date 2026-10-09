/* jscpd:ignore-start -- block schema declaration data */
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
    "No wrapping element. Useful for custom embeds, iframes, or one-off HTML.",
};

export const example = {
  type: "html",
  content:
    "<p><strong>Raw HTML</strong> passes straight through - the escape hatch for one-off markup.</p>",
};
/* jscpd:ignore-end */
