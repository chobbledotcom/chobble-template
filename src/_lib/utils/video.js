/**
 * Video URL utilities for handling YouTube IDs and custom video URLs.
 *
 * Supports both YouTube video IDs and custom iframe URLs (starting with "http").
 * Custom URLs are used directly as iframe src, while YouTube IDs are converted
 * to privacy-respecting youtube-nocookie.com embed URLs.
 */

/**
 * Check if a video identifier is a custom URL (starts with "http")
 *
 * @param {string} videoId - YouTube video ID or custom URL
 * @returns {boolean} True if the identifier is a custom URL
 *
 * @example
 * isCustomVideoUrl("dQw4w9WgXcQ")                    // false
 * isCustomVideoUrl("https://example.com/video.mp4") // true
 * isCustomVideoUrl("http://example.com/embed")      // true
 */
const isCustomVideoUrl = (videoId) =>
  typeof videoId === "string" && videoId.startsWith("http");

/**
 * Get the embed URL for a video
 *
 * For custom URLs (starting with "http"), returns the URL as-is.
 * For YouTube IDs, constructs a privacy-respecting youtube-nocookie.com URL.
 *
 * @param {string} videoId - YouTube video ID or custom URL
 * @param {Object} [options] - Options for YouTube embeds
 * @param {boolean} [options.background=false] - If true, adds mute/loop/controls params for background video
 * @returns {string} The embed URL for use in an iframe src
 *
 * @example
 * getVideoEmbedUrl("dQw4w9WgXcQ")
 * // "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"
 *
 * getVideoEmbedUrl("dQw4w9WgXcQ", { background: true })
 * // "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=dQw4w9WgXcQ"
 *
 * getVideoEmbedUrl("https://player.vimeo.com/video/123456")
 * // "https://player.vimeo.com/video/123456"
 */
const getVideoEmbedUrl = (videoId, options = {}) => {
  if (isCustomVideoUrl(videoId)) {
    return videoId;
  }

  const background = options.background === true;
  const params = background
    ? `autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${videoId}`
    : "autoplay=1";

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
};

/**
 * Get the thumbnail URL for a video
 *
 * For YouTube videos, returns the high-quality default thumbnail URL.
 * For custom URLs, returns null (no thumbnail available).
 *
 * @param {string} videoId - YouTube video ID or custom URL
 * @returns {string | null} The thumbnail URL, or null for custom videos
 *
 * @example
 * getVideoThumbnailUrl("dQw4w9WgXcQ")
 * // "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
 *
 * getVideoThumbnailUrl("https://player.vimeo.com/video/123456")
 * // null
 */
const getVideoThumbnailUrl = (videoId) => {
  if (isCustomVideoUrl(videoId)) {
    return null;
  }

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

export { getVideoEmbedUrl, getVideoThumbnailUrl };
