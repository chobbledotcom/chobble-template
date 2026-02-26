/**
 * Video URL utilities for handling YouTube IDs, Vimeo URLs, and custom video URLs.
 *
 * Supports YouTube video IDs, Vimeo embed URLs, and custom iframe URLs.
 * YouTube IDs are converted to privacy-respecting youtube-nocookie.com embed URLs.
 * Vimeo URLs are passed through directly and get thumbnails via the oEmbed API.
 * Other custom URLs (starting with "http") are used directly as iframe src.
 */

import { memoize } from "#toolkit/fp/memoize.js";

/**
 * Placeholder video ID used for example/demo content.
 * When thumbnail fetches fail for this video, we gracefully fall back to a
 * placeholder SVG instead of crashing the build.
 */
const RICK_ASTLEY_VIDEO_ID = "dQw4w9WgXcQ";

/**
 * Pattern matching Vimeo player and regular URLs, capturing the numeric video ID.
 * Matches:
 *   https://player.vimeo.com/video/123456
 *   https://vimeo.com/123456
 *   https://vimeo.com/123456?h=abc123
 */
const VIMEO_URL_PATTERN =
  /^https?:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/;

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
 * Check if a video identifier is a Vimeo URL.
 *
 * @param {string} videoId - Video ID or URL
 * @returns {boolean} True if the identifier is a Vimeo URL
 *
 * @example
 * isVimeoUrl("https://player.vimeo.com/video/123456") // true
 * isVimeoUrl("https://vimeo.com/123456")              // true
 * isVimeoUrl("https://example.com/video.mp4")         // false
 * isVimeoUrl("dQw4w9WgXcQ")                           // false
 */
const isVimeoUrl = (videoId) =>
  typeof videoId === "string" && VIMEO_URL_PATTERN.test(videoId);

/**
 * Fetch a Vimeo video thumbnail URL via the oEmbed API.
 * Memoized so each video ID is fetched at most once per build.
 * Throws on failure — a misconfigured video ID should break the build
 * so the problem is visible immediately.
 *
 * @param {string} vimeoId - Numeric Vimeo video ID
 * @returns {Promise<string>} Thumbnail URL
 * @throws {Error} If the oEmbed API returns a non-OK response or fetch fails
 */
const fetchVimeoThumbnail = memoize(async (vimeoId) => {
  const response = await fetch(
    `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}&width=480`,
  );
  if (!response.ok) {
    throw new Error(
      `Vimeo oEmbed API returned ${response.status} for video ${vimeoId}`,
    );
  }
  const data = await response.json();
  return data.thumbnail_url;
});

/**
 * Ensure a Vimeo URL has autoplay and loop parameters set.
 * Adds autoplay=1 and loop=1 if they are not already present in the URL.
 *
 * @param {string} url - A Vimeo embed URL
 * @returns {string} The URL with autoplay and loop params guaranteed
 */
const ensureVimeoParams = (url) => {
  const parsed = new URL(url);
  if (!parsed.searchParams.has("autoplay")) {
    parsed.searchParams.set("autoplay", "1");
  }
  if (!parsed.searchParams.has("loop")) {
    parsed.searchParams.set("loop", "1");
  }
  return parsed.toString();
};

/**
 * Get the embed URL for a video
 *
 * For Vimeo URLs, ensures autoplay=1 and loop=1 params are present.
 * For other custom URLs (starting with "http"), returns the URL as-is.
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
 * // "https://player.vimeo.com/video/123456?autoplay=1&loop=1"
 */
const getVideoEmbedUrl = (videoId, options = {}) => {
  if (isVimeoUrl(videoId)) {
    return ensureVimeoParams(videoId);
  }

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
 * Get the thumbnail URL for a video.
 *
 * For YouTube videos, returns the high-quality default thumbnail URL (sync).
 * For Vimeo URLs, fetches the thumbnail URL via the oEmbed API (async).
 * For other custom URLs, returns null (no thumbnail available).
 *
 * @param {string} videoId - YouTube video ID or custom URL
 * @returns {Promise<string | null>} The thumbnail URL, or null for non-video custom URLs
 * @throws {Error} If a Vimeo thumbnail fetch fails
 *
 * @example
 * await getVideoThumbnailUrl("dQw4w9WgXcQ")
 * // "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
 *
 * await getVideoThumbnailUrl("https://player.vimeo.com/video/123456")
 * // "https://i.vimeocdn.com/video/..." (fetched from oEmbed API)
 *
 * await getVideoThumbnailUrl("https://example.com/embed/video")
 * // null
 */
const getVideoThumbnailUrl = async (videoId) => {
  if (isVimeoUrl(videoId)) {
    return fetchVimeoThumbnail(videoId.match(VIMEO_URL_PATTERN)[1]);
  }

  if (isCustomVideoUrl(videoId)) {
    return null;
  }

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

/**
 * Check if a thumbnail URL is for the Rick Astley placeholder video.
 * @param {string} url - Thumbnail URL
 * @returns {boolean}
 */
const isRickAstleyThumbnail = (url) =>
  typeof url === "string" && url.includes(RICK_ASTLEY_VIDEO_ID);

export {
  getVideoEmbedUrl,
  getVideoThumbnailUrl,
  isRickAstleyThumbnail,
  RICK_ASTLEY_VIDEO_ID,
};
