import {
  CLASS_PARAM,
  OVERLAY_CONTENT_PARAM,
  VIDEO_BG_SHARED_PARAMS,
  videoBgSharedFields,
} from "#utils/block-schema/shared.js";

/** @param {string} label */
const requiredString = (label) => ({ type: "string", label, required: true });

export const type = "bunny-video-background";

export const containerWidth = "full";

export const schema = [
  "video_url",
  "thumbnail_url",
  "video_title",
  "content",
  "aspect_ratio",
  "class",
];

export const docs = {
  summary:
    "Bunny CDN video background with player.js-powered thumbnail that fades when playback starts.",
  template: "src/_includes/design-system/bunny-video-background.html",
  scss: "src/css/design-system/_video-background.scss",
  htmlRoot: '<div class="video-background" data-bunny-video>',
  notes:
    "Uses player.js to detect when the video starts playing, then fades out the thumbnail. The player.js library is bundled into bunny-video.js and only loaded when this block is used.",
  params: {
    video_url: {
      type: "string",
      required: true,
      description: "Bunny Stream embed URL.",
    },
    thumbnail_url: {
      type: "string",
      required: true,
      description:
        "Thumbnail image URL. Displayed as a placeholder until video playback begins.",
    },
    ...VIDEO_BG_SHARED_PARAMS,
    content: OVERLAY_CONTENT_PARAM,
    class: CLASS_PARAM,
  },
};

export const cmsFields = {
  video_url: requiredString("Bunny Stream Embed URL"),
  thumbnail_url: requiredString("Thumbnail URL"),
  ...videoBgSharedFields(),
};
