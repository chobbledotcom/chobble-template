export const type = "snippet";

export const fields = {
  reference: {
    type: "reference",
    label: "Snippet",
    options: { collection: "snippets" },
    required: true,
    description:
      "Filename of the snippet (without `.md` extension) from `src/snippets/`.",
  },
};

export const docs = {
  summary:
    "Renders blocks from a named snippet file, enabling reusable block compositions.",
  notes:
    "The referenced snippet must exist in `src/snippets/` and have a `blocks` frontmatter array. The snippet block is transparent — it renders no wrapping section element, so each inner block renders its own section directly.",
};
