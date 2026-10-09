/* jscpd:ignore-start -- block schema declaration data */
import { HERO_CONTENT_FIELDS, str } from "#utils/block-schema/shared.js";

export const type = "video-background";

export const columnSafe = false;

export const containerWidth = "full";

export const fields = {
  video_id: {
    ...str("Video ID or embed URL"),
    required: true,
    description:
      "Bare YouTube video ID (e.g. `dQw4w9WgXcQ`); the block builds the embed itself. For other providers (Vimeo, Bunny Stream), the full embed URL. Never an `<iframe>` snippet.",
  },
  video_title: {
    ...str("Video Title"),
    default: "Background video",
    description: "Accessible `title` on the iframe.",
  },
  thumbnail_url: {
    ...str("Thumbnail"),
    description:
      "Image path or URL shown behind the iframe while the video loads. Defaults to YouTube's own thumbnail for a YouTube ID; other providers show nothing until the video plays.",
  },
  class: { ...str("CSS Class"), description: "Extra CSS classes." },
  ...HERO_CONTENT_FIELDS,
  content: {
    ...HERO_CONTENT_FIELDS.content,
    description:
      "Markdown overlay content rendered in `.prose` inside the `<figcaption>`.",
  },
};

export const docs = {
  summary:
    "Full-width video playing silently behind hero-style overlay content (badge, markdown content, buttons).",
  scss: "src/css/design-system/_video-background.scss",
  notes:
    "YouTube IDs become `youtube-nocookie.com` embeds that autoplay muted, loop, and hide their controls; the thumbnail fades out once the player reports it is playing. Embed URLs of other providers are used as written, so set their autoplay and mute parameters yourself. The video is decorative: put anything a visitor must know in the overlay content.",
};

export const example = {
  type: "video-background",
  video_id: "dQw4w9WgXcQ",
  thumbnail_url: "city-traffic-night.jpg",
  badge: "Video background",
  content:
    "# Content over a full-width video\n\nThe thumbnail shows until the video is playing.",
};
/* jscpd:ignore-end */
