import {
  INTRO_CONTENT_FIELD,
  md,
  objectList,
  str,
} from "#utils/block-schema/shared.js";

export const type = "faqs";

export const fields = {
  items: {
    ...objectList("FAQs", {
      question: str("Question", { required: true }),
      answer: md("Answer (Markdown)"),
    }),
    required: true,
    description:
      "FAQ question/answer pairs. Answers support markdown formatting. Falls back to page-level `faqs` array if omitted.",
  },
  intro_content: INTRO_CONTENT_FIELD,
};

export const docs = {
  summary:
    "Renders question/answer pairs as a definition list. Available on all page types.",
  notes:
    "Define FAQs inline via `items`, or omit to fall back to the page-level `faqs` array (useful for properties/guide-pages that declare FAQs in frontmatter). Answers are rendered as markdown.",
};
