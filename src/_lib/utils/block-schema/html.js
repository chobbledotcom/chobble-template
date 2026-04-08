export const type = "html";

export const schema = ["content"];

export const docs = {
  summary: "Outputs raw HTML without processing.",
  notes:
    "Inline in `render-block.html` (no separate template file). No wrapping element. Useful for custom embeds, iframes, or one-off HTML.",
  params: {
    content: {
      type: "string",
      required: true,
      description: "Raw HTML. Output directly with `{{ block.content }}`.",
    },
  },
};
