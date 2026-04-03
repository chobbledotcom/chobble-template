// Bunny CDN video background support
// Uses player.js to detect playback start and fade out thumbnail placeholders
// Only loaded on pages that use the bunny-video-background block

import playerjs from "player.js";
import { onReady } from "#public/utils/on-ready.js";

const SCOPE = ".design-system";

const init = () => {
  const containers = document.querySelectorAll(`${SCOPE} [data-bunny-video]`);
  if (containers.length === 0) return;

  for (const container of containers) {
    const iframe = container.querySelector("iframe");
    const thumbnail = container.querySelector(".video-background__thumbnail");
    if (!iframe || !thumbnail) continue;

    const player = new playerjs.Player(iframe);
    player.on("ready", () => {
      player.on("play", () => {
        thumbnail.classList.add("is-hidden");
      });
      player.mute();
      player.play();
    });
  }
};

onReady(init);
