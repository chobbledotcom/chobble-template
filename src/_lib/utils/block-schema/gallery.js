import {
  ITEMS_GRID_META,
  img,
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
};

export const docs = {
  summary: "Image grid with optional aspect ratio cropping and captions.",
  template: "src/_includes/design-system/gallery.html",
  ...ITEMS_GRID_META,
};
