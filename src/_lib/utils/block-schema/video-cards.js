/* jscpd:ignore-start -- block schema declaration data */
import {
  bool,
  INTRO_CONTENT_FIELD,
  ITEMS_GRID_META,
  objectList,
  revealToggleField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "video-cards";

export const fields = {
  videos: {
    ...objectList("Videos", {
      id: str("Video ID or embed URL", { required: true }),
      name: str("Name", { required: true }),
      thumbnail_url: str("Thumbnail"),
    }),
    required: true,
    description:
      "Video objects. Each: `{id, name, thumbnail_url}`. `id` is a bare YouTube video ID (e.g. `dQw4w9WgXcQ`) or the full embed URL of another provider (Vimeo, Bunny Stream); never an `<iframe>` snippet. `thumbnail_url` is an image path or URL, and defaults to the provider's own thumbnail for a YouTube ID or a Vimeo URL.",
  },
  reveal: revealToggleField("each video"),
  expand: {
    ...bool("Expand to Full Width"),
    default: false,
    description:
      "If true, videos fill the available width (1 = 100%, 2 = 50%, 3+ = 33.3%) instead of the standard card grid.",
  },
  intro_content: INTRO_CONTENT_FIELD,
};

export const docs = {
  summary:
    "Grid of click-to-play video thumbnails. Takes YouTube IDs and the embed URLs of other providers (Vimeo, Bunny Stream).",
  ...ITEMS_GRID_META,
  notes:
    "A video loads only when its thumbnail is pressed, so the grid costs nothing until a visitor plays one. A YouTube or Vimeo thumbnail with no `thumbnail_url` is downloaded at build time, so a build with one needs the network; a video from another provider with no `thumbnail_url` shows a plain panel behind the play button.",
};

export const example = {
  type: "video-cards",
  videos: [
    {
      id: "dQw4w9WgXcQ",
      name: "A YouTube video",
      thumbnail_url: "breakfast.jpg",
    },
    {
      id: "https://player.vimeo.com/video/76979871",
      name: "A Vimeo video",
      thumbnail_url: "lunch.jpg",
    },
    {
      id: "https://iframe.mediadelivery.net/embed/1/example",
      name: "A video with no thumbnail",
    },
  ],
};
/* jscpd:ignore-end */
