import { str } from "#utils/block-schema/shared.js";
import {
  SPLIT_BASE_CMS_FIELDS,
  SPLIT_BASE_DOCS,
  SPLIT_BASE_PARAMS,
  SPLIT_BASE_SCHEMA,
} from "#utils/block-schema/split-shared.js";

export const type = "split-video";

export const schema = [
  ...SPLIT_BASE_SCHEMA,
  "figure_video_id",
  "figure_alt",
  "figure_caption",
];

export const docs = {
  summary: "Two-column layout with text content and an embedded video.",
  ...SPLIT_BASE_DOCS,
  params: {
    ...SPLIT_BASE_PARAMS,
    figure_video_id: {
      type: "string",
      required: true,
      description: "YouTube video ID or custom iframe URL.",
    },
    figure_alt: {
      type: "string",
      description: "Accessible title for the video iframe.",
    },
    figure_caption: {
      type: "string",
      description: "Visible caption below the video.",
    },
  },
};

export const cmsFields = {
  ...SPLIT_BASE_CMS_FIELDS,
  figure_video_id: str("Video ID or URL"),
  figure_alt: str("Video Alt Text"),
  figure_caption: str("Video Caption"),
};
