// Bunny Stream video backgrounds, loaded only by pages that hold one.
// player.js talks to the Bunny player inside the iframe, so the thumbnail
// covering it can fade out once the video is actually playing.
import playerjs from "player.js";
import { onReady } from "#public/utils/on-ready.js";

/**
 * Start every Bunny background on the page and hide its thumbnail when it
 * plays.
 */
export const initBunnyVideos = () => {
  for (const container of document.querySelectorAll(
    ".design-system [data-bunny-video]",
  )) {
    const thumbnail = container.querySelector(".video-background__thumbnail");
    const player = new playerjs.Player(container.querySelector("iframe"));
    // This script runs after the page is parsed, so the iframe may already
    // have announced it is ready. Marking the player loaded sends the
    // request for "ready" straight away, and the iframe announces it again.
    player.loaded = true;
    player.on("ready", () => {
      player.on("play", () => thumbnail.classList.add("is-hidden"));
      player.mute();
      player.play();
    });
  }
};

onReady(initBunnyVideos);
