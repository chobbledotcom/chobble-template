// Bunny CDN video background support
// Listens for Bunny Stream postMessage events to detect playback and fade thumbnails
// Only loaded on pages that use the bunny-video-background block

import { onReady } from "#public/utils/on-ready.js";

const SCOPE = ".design-system";

// Matches Bunny's JSON postMessage format: {"event":"play"} etc.
const PLAY_EVENT_PATTERN = /"event"\s*:\s*"(?:play|playing|timeupdate)"/;

const init = () => {
  const isPlayEvent = (data) => {
    if (typeof data === "object" && data !== null)
      return (
        data.event === "play" ||
        data.event === "playing" ||
        data.event === "timeupdate"
      );
    return typeof data === "string" && PLAY_EVENT_PATTERN.test(data);
  };
  const containers = document.querySelectorAll(`${SCOPE} [data-bunny-video]`);
  if (containers.length === 0) return;

  // Map each iframe's contentWindow to its thumbnail so we can match
  // incoming postMessage events to the correct container.
  // WeakMap avoids mutable-const violation (no iteration/spread).
  const iframeMap = new WeakMap();

  for (const container of containers) {
    const iframe = container.querySelector("iframe");
    const thumbnail = container.querySelector(".video-background__thumbnail");
    if (!iframe || !thumbnail) continue;

    const register = () => {
      if (iframe.contentWindow) {
        iframeMap.set(iframe.contentWindow, thumbnail);
      }
    };

    register();
    iframe.addEventListener("load", register);
  }

  // Bunny Stream embeds post JSON messages with an "event" property
  // when playback state changes (e.g. "play", "playing", "timeupdate")
  window.addEventListener("message", (event) => {
    const thumbnail = iframeMap.get(event.source);
    if (thumbnail && isPlayEvent(event.data)) {
      thumbnail.classList.add("is-hidden");
    }
  });
};

onReady(init);
