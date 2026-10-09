/* jscpd:ignore-start -- block schema declaration data */
import {
  INTRO_CONTENT_FIELD,
  objectList,
  revealToggleField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "stats";

export const fields = {
  items: {
    ...objectList("Statistics", {
      value: str("Value", { required: true }),
      label: str("Label", { required: true }),
    }),
    allowPipeDelimitedItems: true,
    required: true,
    description:
      'Stat objects: `{value, label}` or pipe-delimited strings `"value|label"`.',
  },
  intro_content: INTRO_CONTENT_FIELD,
  reveal: revealToggleField("each stat"),
};

export const docs = {
  summary: "Key metrics displayed as large numbers with labels.",
  scss: "src/css/design-system/_stats.scss",
  htmlRoot: '<dl class="stats">',
};

export const example = {
  type: "stats",
  items: [
    { value: "35+", label: "Block types" },
    { value: "100%", label: "Line coverage" },
    { value: "0", label: "Servers to run" },
  ],
};
/* jscpd:ignore-end */
