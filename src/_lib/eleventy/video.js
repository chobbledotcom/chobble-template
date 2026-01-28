/**
 * Eleventy configuration for video embed filters.
 *
 * Exposes video URL utilities as Liquid filters for use in templates.
 */
import {
  getVideoEmbedUrl,
  getVideoThumbnailUrl,
  isCustomVideoUrl,
} from "#utils/video.js";

const configureVideo = (eleventyConfig) => {
  eleventyConfig.addFilter("is_custom_video_url", isCustomVideoUrl);
  eleventyConfig.addFilter("video_embed_url", (videoId, background = false) =>
    getVideoEmbedUrl(videoId, { background }),
  );
  eleventyConfig.addFilter("video_thumbnail_url", getVideoThumbnailUrl);
};

export { configureVideo };
