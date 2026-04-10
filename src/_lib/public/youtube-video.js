// YouTube video background support
// Listens for YouTube's postMessage state-change events to detect playback
// start and fade out thumbnail placeholders. No external scripts are loaded —
// YouTube iframes with enablejsapi=1 broadcast events via postMessage natively.
// Only loaded on pages that use the video-background block with a YouTube ID.

import { onReady } from "#public/utils/on-ready.js";
import { eachVideoBackground } from "#public/utils/video-background.js";

// YouTube PlayerState.PLAYING
const YT_STATE_PLAYING = 1;

// Substring present in YouTube state-change messages.
// Pre-checking avoids JSON.parse on non-YouTube postMessage noise.
const STATE_CHANGE_MARKER = '"onStateChange"';

const init = () => {
  if (!document.querySelector(".design-system [data-youtube-video]")) return;

  window.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    if (!event.data.includes(STATE_CHANGE_MARKER)) return;

    const data = JSON.parse(event.data);
    if (data.info !== YT_STATE_PLAYING) return;

    eachVideoBackground("[data-youtube-video]", ({ iframe, thumbnail }) => {
      if (iframe.contentWindow === event.source) {
        thumbnail.classList.add("is-hidden");
      }
    });
  });
};

onReady(init);
