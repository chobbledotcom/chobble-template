import {
  objectList,
  REVEAL_BOOLEAN_PARAM,
  str,
} from "#utils/block-schema/shared.js";

export const type = "stats";

export const schema = ["items", "reveal"];

export const docs = {
  summary: "Key metrics displayed as large numbers with labels.",
  template: "src/_includes/design-system/stats.html",
  scss: "src/css/design-system/_stats.scss",
  htmlRoot: '<dl class="stats">',
  params: {
    items: {
      type: "array",
      required: true,
      description:
        'Stat objects: `{value, label}` or pipe-delimited strings `"value|label"`.',
    },
    reveal: {
      ...REVEAL_BOOLEAN_PARAM,
      description: "Adds `data-reveal` to each stat.",
    },
  },
};

export const cmsFields = {
  items: objectList("Statistics", {
    value: str("Value", { required: true }),
    label: str("Label", { required: true }),
  }),
};
