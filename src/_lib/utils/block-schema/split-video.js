/* jscpd:ignore-start */
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
    description: "YouTube video ID or custom iframe URL.",
  },
  figure_alt: {
    ...str("Video Alt Text"),
    description: "Accessible title for the video iframe.",
  },
  figure_caption: {
    ...str("Video Caption"),
    description: "Visible caption below the video.",
  },
};

export const docs = {
  summary: "Two-column layout with text content and an embedded video.",
  ...SPLIT_BASE_DOCS,
};
