/**
 * Video embed helpers shared by the video blocks.
 *
 * A video is written in content as either a bare YouTube video ID or the
 * full embed URL of another provider (Vimeo, Bunny Stream). YouTube IDs
 * become privacy-respecting youtube-nocookie.com embed URLs; Vimeo URLs gain
 * the playback parameters each mode needs; any other URL is used as written.
 */
import { memoize } from "#utils/fp/memoize.js";

const VIMEO_URL = /^https?:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/;
const BUNNY_URL = /^https?:\/\/[a-z]+\.mediadelivery\.net\/embed\//;

/**
 * How an embed starts playing.
 * - `click`: the visitor pressed play, so it starts with sound and controls
 * - `autoplay`: it starts on page load, muted, with controls
 * - `background`: it loops silently behind content, without controls
 * @typedef {"click" | "autoplay" | "background"} VideoMode
 */

/** @type {Record<VideoMode, (id: string) => string>} */
const YOUTUBE_PARAMS = {
  click: () => "autoplay=1",
  autoplay: () => "autoplay=1&mute=1&playsinline=1",
  background: (id) =>
    `autoplay=1&mute=1&loop=1&controls=0&playsinline=1&enablejsapi=1&playlist=${id}`,
};

/**
 * Whether a video is a bare YouTube ID rather than a provider's embed URL.
 * @param {string} video
 * @returns {boolean}
 */
export const isYouTubeId = (video) => !video.startsWith("http");

/**
 * Whether a video is a Bunny Stream embed, whose player can report when it
 * starts playing.
 * @param {string} video
 * @returns {boolean}
 */
export const isBunnyVideo = (video) => BUNNY_URL.test(video);

/**
 * The thumbnail Vimeo publishes for a video, asked for once per build. A
 * video Vimeo will not describe is a mistake in the content, so it fails
 * the build rather than rendering without a thumbnail.
 */
const vimeoThumbnail = /** @type {(vimeoId: string) => Promise<string>} */ (
  memoize(async (/** @type {string} */ vimeoId) => {
    const response = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}&width=480`,
    );
    if (!response.ok) {
      throw new Error(
        `Vimeo returned HTTP ${response.status} for the thumbnail of video ${vimeoId}`,
      );
    }
    return (await response.json()).thumbnail_url;
  })
);

/**
 * The thumbnail to show for a video: the author's own when given, otherwise
 * the one YouTube or Vimeo publishes. Other providers have none unless the
 * author supplies it, which is the empty string.
 * @param {string} video - YouTube video ID or embed URL
 * @param {string} [thumbnail] - Image path or URL chosen by the author
 * @returns {Promise<string>}
 */
export const videoThumbnail = async (video, thumbnail) => {
  if (thumbnail) return thumbnail;
  if (isYouTubeId(video)) {
    return `https://img.youtube.com/vi/${video}/hqdefault.jpg`;
  }
  const vimeo = video.match(VIMEO_URL);
  return vimeo ? vimeoThumbnail(vimeo[1]) : "";
};

/**
 * The iframe `src` for a video.
 * @param {string} video - YouTube video ID or embed URL
 * @param {VideoMode} [mode]
 * @returns {string}
 */
export const videoEmbedUrl = (video, mode = "click") => {
  /**
   * A Vimeo embed URL with autoplay and loop switched on unless the author
   * already chose, and muted when it must start without a click.
   */
  const vimeoEmbedUrl = () => {
    const parsed = new URL(video);
    const wanted =
      mode === "click" ? ["autoplay", "loop"] : ["autoplay", "loop", "muted"];
    for (const param of wanted) {
      if (!parsed.searchParams.has(param)) parsed.searchParams.set(param, "1");
    }
    return parsed.toString();
  };
  if (VIMEO_URL.test(video)) return vimeoEmbedUrl();
  if (!isYouTubeId(video)) return video;
  return `https://www.youtube-nocookie.com/embed/${video}?${YOUTUBE_PARAMS[mode](video)}`;
};
