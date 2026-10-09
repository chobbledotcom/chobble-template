/**
 * Liquid filters for the video blocks.
 *
 * Usage in templates:
 *   {{ video_id | videoEmbedUrl }}               - Click-to-play iframe src
 *   {{ video_id | videoEmbedUrl: "background" }} - Silent looping iframe src
 *   {{ video_id | isYouTubeId }}                 - True for a bare YouTube ID
 *   {{ video_id | videoThumbnail: thumbnail }}   - Author's thumbnail, else YouTube's
 */
import { registerFilters } from "#eleventy/register.js";
import { isYouTubeId, videoEmbedUrl, videoThumbnail } from "#utils/video.js";

/** @param {import("#lib/types").UserConfig} eleventyConfig */
export const configureVideo = (eleventyConfig) =>
  registerFilters(eleventyConfig)({
    videoEmbedUrl,
    isYouTubeId,
    videoThumbnail,
  });
