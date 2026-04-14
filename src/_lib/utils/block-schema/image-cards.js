import {
  HEADER_KEYS,
  HEADER_PARAM_DOCS,
  ITEMS_ARRAY_PARAM,
  ITEMS_GRID_META,
  img,
  md,
  num,
  objectList,
  REVEAL_BOOLEAN_PARAM,
  str,
} from "#utils/block-schema/shared.js";

export const type = "image-cards";

export const schema = [
  "items",
  "reveal",
  "heading_level",
  "image_aspect_ratio",
  ...HEADER_KEYS,
];

export const docs = {
  summary:
    "Grid of cards featuring images with titles and optional descriptions.",
  template: "src/_includes/design-system/image-cards.html",
  ...ITEMS_GRID_META,
  params: {
    items: {
      ...ITEMS_ARRAY_PARAM,
      description:
        "Card objects. Each: `{image, title, description, link}`. Images processed by `{% image %}` shortcode for responsive srcset + LQIP.",
    },
    heading_level: {
      type: "number",
      default: "3",
      description: "Heading level for titles.",
    },
    image_aspect_ratio: {
      type: "string",
      description: 'Aspect ratio for images, e.g. `"16/9"`, `"1/1"`, `"4/3"`.',
    },
    reveal: {
      ...REVEAL_BOOLEAN_PARAM,
      description: "Adds `data-reveal` to each item.",
    },
    ...HEADER_PARAM_DOCS,
  },
};

export const cmsFields = {
  heading_level: num("Heading Level"),
  image_aspect_ratio: str("Image Aspect Ratio"),
  header_intro: md("Header Intro"),
  items: objectList("Cards", {
    image: img("Image", { required: true }),
    title: str("Title", { required: true }),
    description: str("Description"),
    link: str("Link URL"),
  }),
};
