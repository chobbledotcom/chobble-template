// Shared utility for video background blocks
// Iterates over video background containers matching a selector and yields
// the iframe + thumbnail pairs for player-specific initialization.

const SCOPE = ".design-system";

/**
 * Find all video background containers matching a data-attribute selector,
 * yielding { iframe, thumbnail } pairs for each.
 *
 * @param {string} selector - Data-attribute selector (e.g. "[data-bunny-video]")
 * @param {(ctx: { iframe: HTMLIFrameElement, thumbnail: HTMLElement }) => void} callback
 */
export const eachVideoBackground = (selector, callback) => {
  const containers = document.querySelectorAll(`${SCOPE} ${selector}`);
  for (const container of containers) {
    const iframe = container.querySelector("iframe");
    const thumbnail = container.querySelector(".video-background__thumbnail");
    if (!iframe || !thumbnail) continue;
    callback({ iframe, thumbnail });
  }
};
