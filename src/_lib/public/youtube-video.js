// YouTube video background support
// Uses the YouTube IFrame Player API to detect playback start and fade out
// thumbnail placeholders. Only loaded on pages that use the video-background
// block with a YouTube video ID.

import { onReady } from "#public/utils/on-ready.js";
import { eachVideoBackground } from "#public/utils/video-background.js";

const YT_API_URL = "https://www.youtube.com/iframe_api";

const init = async () => {
  if (!document.querySelector(".design-system [data-youtube-video]")) return;

  await new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = resolve;
    const tag = document.createElement("script");
    tag.src = YT_API_URL;
    document.head.appendChild(tag);
  });

  eachVideoBackground("[data-youtube-video]", ({ iframe, thumbnail }) => {
    new window.YT.Player(iframe, {
      events: {
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            thumbnail.classList.add("is-hidden");
          }
        },
      },
    });
  });
};

onReady(init);
