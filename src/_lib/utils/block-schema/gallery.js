/* jscpd:ignore-start -- block schema declaration data */
import {
  HORIZONTAL_FIELD,
  INTRO_CONTENT_FIELD,
  ITEMS_GRID_META,
  img,
  MASONRY_FIELD,
  objectList,
  str,
} from "#utils/block-schema/shared.js";

export const type = "gallery";

export const fields = {
  items: {
    ...objectList("Gallery Images", {
      image: img("Image", { required: true }),
      caption: str("Caption"),
    }),
    required: true,
    description:
      "Image objects. Each: `{image, caption}`. Images processed by `{% image %}` shortcode.",
  },
  aspect_ratio: {
    ...str("Aspect Ratio"),
    description:
      'Aspect ratio for images (e.g. `"16/9"`, `"1/1"`, `"4/3"`). Default: no cropping.',
  },
  intro_content: INTRO_CONTENT_FIELD,
  masonry: MASONRY_FIELD,
  horizontal: HORIZONTAL_FIELD,
};

export const docs = {
  summary: "Image grid with optional aspect ratio cropping and captions.",
  ...ITEMS_GRID_META,
};

export const example = {
  type: "gallery",
  intro_content: "## An image grid",
  aspect_ratio: "4/3",
  items: [
    { image: "breakfast.jpg", caption: "Breakfast" },
    { image: "lunch.jpg", caption: "Lunch" },
    { image: "dinner.jpg", caption: "Dinner" },
    { image: "fireworks.jpg", caption: "Fireworks" },
  ],
};
/* jscpd:ignore-end */
