/* jscpd:ignore-start */
import {
  IMAGE_CARD_GRID_KEYS,
  IMAGE_CARD_GRID_PARAMS,
  ITEMS_ARRAY_PARAM,
  ITEMS_GRID_META,
  imageCardCmsFields,
  img,
  objectList,
  str,
} from "#utils/block-schema/shared.js";
/* jscpd:ignore-end */

export const type = "image-cards";

export const schema = IMAGE_CARD_GRID_KEYS;

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
    ...IMAGE_CARD_GRID_PARAMS,
  },
};

export const cmsFields = imageCardCmsFields(
  objectList("Cards", {
    image: img("Image", { required: true }),
    title: str("Title", { required: true }),
    description: str("Description"),
    link: str("Link URL"),
  }),
);
