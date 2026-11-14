/* jscpd:ignore-start -- block schema declaration data */
import { bool, str } from "#utils/block-schema/shared.js";
import {
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
} from "#utils/block-schema/split-shared.js";

export const type = "split-video";

export const columnSafe = false;
export const template = "design-system/split.html";

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_video_id: {
    ...str("Video ID or embed URL"),
    required: true,
    description:
      "Bare YouTube video ID (e.g. `dQw4w9WgXcQ`), or the full embed URL of another provider (Vimeo, Bunny Stream). Never an `<iframe>` snippet.",
  },
  figure_thumbnail_url: {
    ...str("Thumbnail"),
    description:
      "Image path or URL shown behind the play button. Defaults to the provider's own thumbnail for a YouTube ID or a Vimeo URL; other providers show a plain panel.",
  },
  figure_alt: {
    ...str("Video Name"),
    default: "Video",
    description:
      "Name of the video, used for the play button's label and the iframe's title.",
  },
  figure_caption: {
    ...str("Video Caption"),
    description: "Visible caption below the video.",
  },
  figure_autoplay: {
    ...bool("Autoplay"),
    default: false,
    description:
      "If true, skips the play button and starts the video muted, with its controls showing, when it scrolls into view.",
  },
};

export const docs = {
  summary: "Two-column layout with text content and an embedded video.",
  ...SPLIT_BASE_DOCS,
  notes:
    "Without `figure_autoplay` the video loads only when its play button is pressed.",
};

export const example = {
  type: "split-video",
  subtitle: "Split layouts",
  content:
    "## Text beside a video\n\nThe video loads when a visitor presses play.",
  figure_video_id: "dQw4w9WgXcQ",
  figure_thumbnail_url: "dinner.jpg",
  figure_alt: "A YouTube video",
  figure_caption: "Captions are optional.",
};
/* jscpd:ignore-end */
