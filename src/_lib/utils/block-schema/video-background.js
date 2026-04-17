import { str, VIDEO_BG_SHARED_FIELDS } from "#utils/block-schema/shared.js";

export const type = "video-background";

export const containerWidth = "full";

export const fields = {
  video_id: {
    ...str("Video Embed URL"),
    required: true,
    description: "YouTube video ID or full iframe URL (for Bunny, Vimeo, etc).",
  },
  thumbnail_url: {
    ...str("Thumbnail URL"),
    description:
      "URL of a thumbnail image displayed behind the iframe while the video loads.",
  },
  ...VIDEO_BG_SHARED_FIELDS,
};

export const docs = {
  summary: "Auto-playing video background with overlaid text content.",
  template: "src/_includes/design-system/video-background.html",
  scss: "src/css/design-system/_video-background.scss",
  htmlRoot: '<div class="video-background">',
  notes:
    "YouTube IDs get `youtube-nocookie.com` embed URLs with `autoplay=1&mute=1&loop=1&controls=0`. Custom URLs (starting with `http`) are used directly.",
};
