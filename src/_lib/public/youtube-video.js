// YouTube video background support
// Uses the YouTube IFrame Player API to detect playback start and fade out
// thumbnail placeholders. Only loaded on pages that use the
// youtube-video-background block.

import { onReady } from "#public/utils/on-ready.js";
import { getVideoContainerPairs } from "#public/utils/video-containers.js";

const API_SRC = "https://www.youtube.com/iframe_api";
// String form avoids inlining the long YouTube-defined global name as an
// identifier. See the IFrame API docs for details.
const READY_CALLBACK = "onYouTubeIframeAPIReady";

let apiPromise = null;

const init = async () => {
  const pairs = getVideoContainerPairs("youtube-video");
  if (pairs.length === 0) return;

  if (!window.YT?.Player) {
    if (!apiPromise) {
      apiPromise = new Promise((resolve) => {
        Reflect.set(window, READY_CALLBACK, resolve);
        const tag = document.createElement("script");
        tag.src = API_SRC;
        document.head.appendChild(tag);
      });
    }
    await apiPromise;
  }

  for (const { iframe, thumbnail } of pairs) {
    new window.YT.Player(iframe, {
      events: {
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            thumbnail.classList.add("is-hidden");
          }
        },
      },
    });
  }
};

onReady(init);
