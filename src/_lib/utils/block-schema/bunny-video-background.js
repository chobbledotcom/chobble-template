import { str, VIDEO_BG_SHARED_FIELDS } from "#utils/block-schema/shared.js";

export const type = "bunny-video-background";

export const containerWidth = "full";

export const fields = {
  video_url: {
    ...str("Bunny Stream Embed URL"),
    required: true,
    description: "Bunny Stream embed URL.",
  },
  thumbnail_url: {
    ...str("Thumbnail URL"),
    required: true,
    description:
      "Thumbnail image URL. Displayed as a placeholder until video playback begins.",
  },
  ...VIDEO_BG_SHARED_FIELDS,
};

export const docs = {
  summary:
    "Bunny CDN video background with player.js-powered thumbnail that fades when playback starts.",
  template: "src/_includes/design-system/bunny-video-background.html",
  scss: "src/css/design-system/_video-background.scss",
  htmlRoot: '<div class="video-background" data-bunny-video>',
  notes:
    "Uses player.js to detect when the video starts playing, then fades out the thumbnail. The player.js library is bundled into bunny-video.js and only loaded when this block is used.",
};
