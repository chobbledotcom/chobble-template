/**
 * Eleventy configuration for video embed filters.
 *
 * Exposes video URL utilities as Liquid filters for use in templates.
 */
import { getVideoEmbedUrl } from "#utils/video.js";

/** @param {*} eleventyConfig */
const configureVideo = (eleventyConfig) => {
  eleventyConfig.addFilter(
    "video_embed_url",
    /**
     * @param {string} videoId
     * @param {boolean} background
     */
    (videoId, background = false) => getVideoEmbedUrl(videoId, { background }),
  );
};

export { configureVideo };
