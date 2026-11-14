import { afterEach, describe, expect, test, vi } from "vitest";

/**
 * Stands in for player.js, which talks to the player inside an iframe:
 * each Player records what it was asked to do, and a test fires the events
 * the real player would send by calling the handlers it was given.
 */
const Player = vi.hoisted(() =>
  vi.fn(function (iframe) {
    this.iframe = iframe;
    this.on = vi.fn();
    this.mute = vi.fn();
    this.play = vi.fn();
  }),
);

vi.mock("player.js", () => ({ default: { Player } }));

const { initBunnyVideos } = await import("#public/bunny-video.js");

const BACKGROUND = `
  <div class="video-background" data-bunny-video>
    <div class="video-background__thumbnail"></div>
    <iframe></iframe>
  </div>`;

/** Put Bunny backgrounds on the page and return the players made for them. */
const setupBackgrounds = (count) => {
  document.body.innerHTML = `<div class="design-system">${BACKGROUND.repeat(count)}</div>`;
  initBunnyVideos();
  return Player.mock.instances.slice(-count);
};

/** Fire an event the way the player inside the iframe would. */
const fire = (player, event) =>
  player.on.mock.calls.findLast(([name]) => name === event)[1]();

const thumbnailOf = (player) =>
  player.iframe.parentElement.querySelector(".video-background__thumbnail");

describe("bunny-video", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("attaches a player to each background's iframe, marked as loaded", () => {
    const players = setupBackgrounds(2);
    expect(players.map((player) => player.iframe)).toEqual([
      ...document.querySelectorAll("iframe"),
    ]);
    expect(players.map((player) => player.loaded)).toEqual([true, true]);
  });

  test("does nothing to the video until its player is ready", () => {
    const [player] = setupBackgrounds(1);
    expect(player.mute).not.toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });

  test("mutes and starts the video once its player is ready", () => {
    const [player] = setupBackgrounds(1);
    fire(player, "ready");
    expect(player.mute).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  test("keeps the thumbnail until the video is playing", () => {
    const [player] = setupBackgrounds(1);
    fire(player, "ready");
    expect(thumbnailOf(player).classList.contains("is-hidden")).toBe(false);
    fire(player, "play");
    expect(thumbnailOf(player).classList.contains("is-hidden")).toBe(true);
  });

  test("hides only the thumbnail of the video that started", () => {
    const [first, second] = setupBackgrounds(2);
    fire(first, "ready");
    fire(second, "ready");
    fire(second, "play");
    expect(thumbnailOf(first).classList.contains("is-hidden")).toBe(false);
    expect(thumbnailOf(second).classList.contains("is-hidden")).toBe(true);
  });

  test("ignores video backgrounds outside the design system", () => {
    const before = Player.mock.instances.length;
    document.body.innerHTML = BACKGROUND;
    initBunnyVideos();
    expect(Player.mock.instances).toHaveLength(before);
  });
});
