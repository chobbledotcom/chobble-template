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
    title: str("Title", { required: true }),
    description: str("Description"),
    link: str("Link URL"),
  }),
  required: true,
  description:
    "Card objects. Each: `{image, title, description, link}`. Images processed by `{% image %}` shortcode for responsive srcset + LQIP.",
});

export const docs = {
  summary:
    "Grid of cards featuring images with titles and optional descriptions.",
  template: "src/_includes/design-system/image-cards.html",
  ...ITEMS_GRID_META,
};
