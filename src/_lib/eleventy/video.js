/**
 * Eleventy configuration for video embed filters.
 *
 * Exposes video URL utilities as Liquid filters for use in templates.
 */
import { getVideoEmbedUrl } from "#utils/video.js";

const configureVideo = (eleventyConfig) => {
  eleventyConfig.addFilter("video_embed_url", (videoId, background = false) =>
    getVideoEmbedUrl(videoId, { background }),
  );
};

export { configureVideo };
