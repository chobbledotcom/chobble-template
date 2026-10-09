/* jscpd:ignore-start -- block schema declaration data */
import {
  IMAGE_ASPECT_RATIO_FIELD,
  INTRO_CONTENT_FIELD,
  ITEMS_GRID_META,
  img,
  objectList,
  revealToggleField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "image-cards";

export const fields = {
  items: {
    ...objectList("Cards", {
      image: img("Image", { required: true }),
      name: str("Name", { required: true }),
      description: str("Description"),
      link: str("Link URL"),
    }),
    required: true,
    description:
      "Card objects. Each: `{image, name, description, link}`. Images processed by `{% image %}` shortcode for responsive srcset + LQIP.",
  },
  reveal: revealToggleField("each card"),
  image_aspect_ratio: IMAGE_ASPECT_RATIO_FIELD,
  intro_content: INTRO_CONTENT_FIELD,
};

export const docs = {
  summary:
    "Grid of cards featuring images with names and optional descriptions.",
  ...ITEMS_GRID_META,
};

export const example = {
  type: "image-cards",
  items: [
    {
      image: "breakfast.jpg",
      name: "Breakfast",
      description: "Cards pair an image with a name and description.",
      link: "/how-it-works/",
    },
    {
      image: "lunch.jpg",
      name: "Lunch",
      description: "Images get responsive srcset and LQIP placeholders.",
    },
    {
      image: "dinner.jpg",
      name: "Dinner",
      description: "An optional link makes the whole card clickable.",
    },
  ],
};
/* jscpd:ignore-end */
