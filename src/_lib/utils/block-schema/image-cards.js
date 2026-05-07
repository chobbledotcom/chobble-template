/* jscpd:ignore-start */
import {
  ITEMS_GRID_META,
  imageCardGridFields,
  img,
  objectList,
  str,
} from "#utils/block-schema/shared.js";
/* jscpd:ignore-end */

export const type = "image-cards";

export const fields = imageCardGridFields({
  ...objectList("Cards", {
    image: img("Image", { required: true }),
    name: str("Name", { required: true }),
    description: str("Description"),
    link: str("Link URL"),
  }),
  required: true,
  description:
    "Card objects. Each: `{image, name, description, link}`. Images processed by `{% image %}` shortcode for responsive srcset + LQIP.",
});

export const docs = {
  summary:
    "Grid of cards featuring images with names and optional descriptions.",
  ...ITEMS_GRID_META,
};
