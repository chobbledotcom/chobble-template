// YouTube video background — detects playback start via postMessage and fades
// out thumbnail placeholders. Sends a "listening" command to subscribe to
// onStateChange events and checks periodic infoDelivery as a fallback.

import { onReady } from "#public/utils/on-ready.js";
import { eachVideoBackground } from "#public/utils/video-background.js";

const YT_STATE_PLAYING = 1;
const STATE_CHANGE_MARKER = '"onStateChange"';
const INFO_DELIVERY_MARKER = '"infoDelivery"';
const LISTENING_COMMAND = '{"event":"listening","id":"1","channel":"widget"}';

const isPlayingMessage = (raw) => {
  if (typeof raw !== "string") return false;
  const isStateChange = raw.includes(STATE_CHANGE_MARKER);
  if (!isStateChange && !raw.includes(INFO_DELIVERY_MARKER)) return false;
  const data = JSON.parse(raw);
  const state = isStateChange ? data.info : data.info?.playerState;
  return state === YT_STATE_PLAYING;
};

const init = () => {
  if (!document.querySelector(".design-system [data-youtube-video]")) return;

  window.addEventListener("message", (event) => {
    if (!isPlayingMessage(event.data)) return;

    eachVideoBackground("[data-youtube-video]", ({ iframe, thumbnail }) => {
      if (iframe.contentWindow === event.source) {
        thumbnail.classList.add("is-hidden");
      }
    });
  });

  // Subscribe to YouTube player events; retry on load for late-loading iframes
  eachVideoBackground("[data-youtube-video]", ({ iframe }) => {
    const subscribe = () => {
      iframe.contentWindow.postMessage(LISTENING_COMMAND, "*");
    };
    iframe.addEventListener("load", subscribe);
    subscribe();
  });
};

onReady(init);
