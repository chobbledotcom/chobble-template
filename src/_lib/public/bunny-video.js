// Bunny CDN video background support
// Uses player.js to detect playback start and fade out thumbnail placeholders.
// Only loaded on pages that use the bunny-video-background block.

import playerjs from "player.js";
import { onReady } from "#public/utils/on-ready.js";
import { eachVideoBackground } from "#public/utils/video-background.js";

const init = () => {
  eachVideoBackground("[data-bunny-video]", ({ iframe, thumbnail }) => {
    const player = new playerjs.Player(iframe);

    // Module scripts are deferred until after DOM parsing, so the iframe
    // may have already loaded and emitted its player.js "ready" event.
    // Force loaded so the "addEventListener ready" command reaches the
    // iframe, which will re-emit "ready" if already initialized.
    player.loaded = true;

    player.on("ready", () => {
      player.on("play", () => {
        thumbnail.classList.add("is-hidden");
      });
      player.mute();
      player.play();
    });
  });
};

onReady(init);
