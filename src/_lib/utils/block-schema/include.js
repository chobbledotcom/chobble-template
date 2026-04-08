export const type = "include";

export const schema = ["file"];

export const docs = {
  summary: "Includes an arbitrary template file.",
  notes:
    "Inline in `render-block.html` — uses `{% include block.file %}`. Escape hatch for custom content that doesn't fit the block system.",
  params: {
    file: {
      type: "string",
      required: true,
      description: "Path to the template file to include.",
    },
  },
};
