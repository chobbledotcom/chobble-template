import {
  bool,
  INTRO_CONTENT_FIELD,
  ITEMS_GRID_META,
  objectList,
  str,
} from "#utils/block-schema/shared.js";

export const type = "video-cards";

/* jscpd:ignore-start */
export const fields = {
  videos: {
    ...objectList("Videos", {
      id: str("Video ID or URL", { required: true }),
      name: str("Name", { required: true }),
    }),
    required: true,
    description:
      "Video objects. Each: `{id, name}`. `id` is a YouTube video ID or full iframe URL (Vimeo, Bunny Stream, etc.).",
  },
  /* jscpd:ignore-end */
  intro_content: INTRO_CONTENT_FIELD,
  reveal: {
    ...bool("Reveal Animation"),
    default: "true",
    description: "Adds `data-reveal` to each video card.",
  },
  expand: {
    ...bool("Expand to Full Width"),
    default: "false",
    description:
      "If true, videos fill the available width (1=100%, 2=50%, 3+=33.3%) instead of the standard card grid.",
  },
};

export const docs = {
  summary:
    "Grid of clickable video thumbnails. Supports YouTube IDs and custom iframe URLs (Vimeo, Bunny Stream, etc.).",
  ...ITEMS_GRID_META,
  notes:
    "YouTube videos render optimized thumbnails via eleventy-img; custom URLs use a placeholder. Videos load only on click to save bandwidth.",
};
