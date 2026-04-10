/**
 * Eleventy configuration for video embed filters.
 *
 * Exposes video URL utilities as Liquid filters for use in templates.
 */
import { getVideoEmbedUrl, isYouTubeId } from "#utils/video.js";

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

  /** Returns true if the video identifier is a YouTube ID (not a URL). */
  eleventyConfig.addFilter("is_youtube_id", (videoId) => isYouTubeId(videoId));

  /** Returns the YouTube thumbnail URL for a video ID. */
  eleventyConfig.addFilter(
    "youtube_thumbnail",
    (videoId) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  );
};

export { configureVideo };
