import {
  INTRO_CONTENT_FIELD,
  objectList,
  str,
} from "#utils/block-schema/shared.js";

export const type = "marquee-images";

export const containerWidth = "full";

export const fields = {
  items: {
    ...objectList("Images", {
      image: str("Image Path", { required: true }),
      alt: str("Alt Text"),
      link_url: str("Link URL"),
    }),
    required: true,
    description:
      "Image objects. Each: `{image, alt, link_url}`. `image` is a path; `alt` is optional alt text; `link_url` is an optional URL to wrap the image in a link. Images are processed via the `{% image %}` shortcode for responsive formats and proper URL normalization.",
  },
  speed: {
    ...str("Scroll Speed (e.g. 30s)"),
    default: '"30s"',
    description:
      'CSS animation duration for one full scroll cycle (e.g. `"20s"`, `"45s"`). Slower = longer duration.',
  },
  height: {
    ...str("Image Height (e.g. 50px)"),
    default: '"50px"',
    description:
      'CSS height for the images (e.g. `"60px"`, `"80px"`). Width scales proportionally.',
  },
  intro_content: INTRO_CONTENT_FIELD,
};

export const docs = {
  summary:
    "Continuously scrolling marquee of images (e.g. brand logos, partner badges).",
  template: "src/_includes/design-system/marquee-images.html",
  scss: "src/css/design-system/_marquee-images.scss",
  htmlRoot: '<div class="marquee-images">',
};
