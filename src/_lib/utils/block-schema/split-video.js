/* jscpd:ignore-start */
import { bool } from "#utils/block-schema/shared.js";
import {
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
  str,
} from "#utils/block-schema/split-shared.js";
/* jscpd:ignore-end */

export const type = "split-video";

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_video_id: {
    ...str("Video ID or URL"),
    required: true,
    description:
      "YouTube video ID or custom iframe URL (e.g. Bunny Stream, Vimeo).",
  },
  figure_thumbnail_url: {
    ...str("Thumbnail URL"),
    description:
      "Thumbnail image URL shown in the click-to-play facade. Required for non-YouTube URLs (Bunny Stream, Vimeo, etc.); YouTube thumbnails are fetched automatically when this is omitted.",
  },
  figure_alt: {
    ...str("Video Alt Text"),
    description: "Accessible title for the video iframe.",
  },
  figure_caption: {
    ...str("Video Caption"),
    description: "Visible caption below the video.",
  },
  figure_autoplay: {
    ...bool("Autoplay"),
    default: "false",
    description:
      "If true, skips the click-to-play facade and renders the iframe directly with autoplay + mute (browsers block unmuted autoplay). Controls stay visible.",
  },
};

export const docs = {
  summary: "Two-column layout with text content and an embedded video.",
  ...SPLIT_BASE_DOCS,
};
