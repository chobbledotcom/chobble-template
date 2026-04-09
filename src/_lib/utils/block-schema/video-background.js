import {
  CLASS_PARAM,
  OVERLAY_CONTENT_PARAM,
  VIDEO_BG_SHARED_PARAMS,
} from "#utils/block-schema/shared.js";

export const type = "video-background";

export const schema = [
  "video_id",
  "video_title",
  "content",
  "aspect_ratio",
  "class",
  "thumbnail_url",
];

export const docs = {
  summary: "Auto-playing video background with overlaid text content.",
  template: "src/_includes/design-system/video-background.html",
  scss: "src/css/design-system/_video-background.scss",
  htmlRoot: '<div class="video-background">',
  notes:
    "YouTube IDs get `youtube-nocookie.com` embed URLs with `autoplay=1&mute=1&loop=1&controls=0`. Custom URLs (starting with `http`) are used directly.",
  params: {
    video_id: {
      type: "string",
      required: true,
      description:
        "YouTube video ID or full iframe URL (for Bunny, Vimeo, etc).",
    },
    ...VIDEO_BG_SHARED_PARAMS,
    content: OVERLAY_CONTENT_PARAM,
    class: CLASS_PARAM,
    thumbnail_url: {
      type: "string",
      description:
        "URL of a thumbnail image displayed behind the iframe while the video loads.",
    },
  },
};
