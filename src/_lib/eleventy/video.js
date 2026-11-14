/**
 * Liquid filters for the video blocks.
 *
 * Usage in templates:
 *   {{ video_id | videoEmbedUrl }}               - Click-to-play iframe src
 *   {{ video_id | videoEmbedUrl: "background" }} - Silent looping iframe src
 *   {{ video_id | isYouTubeId }}                 - True for a bare YouTube ID
 *   {{ video_id | isBunnyVideo }}                - True for a Bunny Stream embed URL
 *   {{ video_id | videoThumbnail: thumbnail }}   - Author's thumbnail, else the provider's
 */
import { registerFilters } from "#eleventy/register.js";
import {
  isBunnyVideo,
  isYouTubeId,
  videoEmbedUrl,
  videoThumbnail,
} from "#utils/video.js";

/** @param {import("#lib/types").UserConfig} eleventyConfig */
export const configureVideo = (eleventyConfig) => {
  registerFilters(eleventyConfig)({
    videoEmbedUrl,
    isYouTubeId,
    isBunnyVideo,
  });
  registerFilters(eleventyConfig, "addAsyncFilter")({ videoThumbnail });
};
