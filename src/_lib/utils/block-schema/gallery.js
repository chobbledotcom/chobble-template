import {
  ITEMS_ARRAY_PARAM,
  ITEMS_GRID_META,
  img,
  objectList,
  str,
} from "#utils/block-schema/shared.js";

export const type = "gallery";

export const schema = ["items", "aspect_ratio"];

export const docs = {
  summary: "Image grid with optional aspect ratio cropping and captions.",
  template: "src/_includes/design-system/gallery.html",
  ...ITEMS_GRID_META,
  params: {
    items: {
      ...ITEMS_ARRAY_PARAM,
      description:
        "Image objects. Each: `{image, caption}`. Images processed by `{% image %}` shortcode.",
    },
    aspect_ratio: {
      type: "string",
      description:
        'Aspect ratio for images (e.g. `"16/9"`, `"1/1"`, `"4/3"`). Default: no cropping.',
    },
  },
};

export const cmsFields = {
  aspect_ratio: str("Aspect Ratio"),
  items: objectList("Gallery Images", {
    image: img("Image", { required: true }),
    caption: str("Caption"),
  }),
};
