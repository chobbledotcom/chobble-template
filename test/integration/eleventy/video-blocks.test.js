import { describe, expect, test } from "vitest";
import { pageWithBlocks, useSharedSite } from "#test/test-site-factory.js";

const BUNNY = "https://iframe.mediadelivery.net/embed/1/abc?autoplay=true";

// Thumbnails are local images or absent, so the build needs no network.
const getSite = useSharedSite({
  images: ["party.jpg"],
  files: [
    pageWithBlocks("split-facade", [
      {
        type: "split-video",
        content: "## Watch",
        figure_video_id: "dQw4w9WgXcQ",
        figure_thumbnail_url: "party.jpg",
        figure_alt: "Our story",
        figure_caption: "Two minutes long.",
      },
    ]),
    pageWithBlocks("split-autoplay", [
      {
        type: "split-video",
        content: "## Watch",
        figure_video_id: BUNNY,
        figure_autoplay: true,
      },
    ]),
    pageWithBlocks("split-no-thumbnail", [
      { type: "split-video", content: "## Watch", figure_video_id: BUNNY },
    ]),
    pageWithBlocks("bunny-background", [
      { type: "video-background", video_id: BUNNY, thumbnail_url: "party.jpg" },
    ]),
    pageWithBlocks("bunny-background-bare", [
      { type: "video-background", video_id: BUNNY },
    ]),
    pageWithBlocks("youtube-background", [
      {
        type: "video-background",
        video_id: "dQw4w9WgXcQ",
        thumbnail_url: "party.jpg",
      },
    ]),
  ],
});

const bunnyScript = (doc) =>
  doc.querySelector('script[src*="/assets/js/bunny-video.js"]');

describe("split-video block", () => {
  test("renders a click-to-play facade holding the video for later", async () => {
    const doc = await getSite().getDoc("split-facade/index.html");
    const facade = doc.querySelector(".split figure button.video-facade");
    expect(facade.getAttribute("aria-label")).toBe("Play Our story");
    expect(facade.querySelector("img")).not.toBeNull();
    expect(doc.querySelector(".split figure > iframe")).toBeNull();
    const iframe = facade
      .querySelector("template")
      .content.querySelector("iframe");
    expect(iframe.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
    );
    expect(iframe.getAttribute("title")).toBe("Our story");
  });

  test("renders the caption below the video", async () => {
    const doc = await getSite().getDoc("split-facade/index.html");
    expect(doc.querySelector(".split figure figcaption").textContent).toBe(
      "Two minutes long.",
    );
  });

  test("renders the video itself, with no play button, when it autoplays", async () => {
    const doc = await getSite().getDoc("split-autoplay/index.html");
    const iframe = doc.querySelector(".split figure .video-wrapper iframe");
    expect(iframe.getAttribute("src")).toBe(BUNNY);
    expect(iframe.getAttribute("title")).toBe("Video");
    expect(doc.querySelector(".video-facade")).toBeNull();
    expect(doc.querySelector(".split figure figcaption")).toBeNull();
  });

  test("shows a plain panel behind the play button without a thumbnail", async () => {
    const doc = await getSite().getDoc("split-no-thumbnail/index.html");
    const facade = doc.querySelector(".video-facade");
    expect(facade.classList.contains("video-facade--no-thumbnail")).toBe(true);
    expect(facade.querySelector("img")).toBeNull();
  });
});

describe("video-background block with a Bunny Stream video", () => {
  test("marks the background and loads the Bunny script when it has a thumbnail", async () => {
    const doc = await getSite().getDoc("bunny-background/index.html");
    const background = doc.querySelector(".video-background");
    expect(background.hasAttribute("data-bunny-video")).toBe(true);
    expect(background.hasAttribute("data-youtube-video")).toBe(false);
    expect(
      background.querySelector(".video-background__thumbnail img"),
    ).not.toBeNull();
    expect(background.querySelector("iframe").getAttribute("src")).toBe(BUNNY);
    expect(bunnyScript(doc).getAttribute("type")).toBe("module");
  });

  test("loads no script when there is no thumbnail to fade out", async () => {
    const doc = await getSite().getDoc("bunny-background-bare/index.html");
    expect(doc.querySelector(".video-background__thumbnail")).toBeNull();
    expect(bunnyScript(doc)).toBeNull();
  });

  test("loads no Bunny script for a YouTube background", async () => {
    const doc = await getSite().getDoc("youtube-background/index.html");
    const background = doc.querySelector(".video-background");
    expect(background.hasAttribute("data-youtube-video")).toBe(true);
    expect(background.hasAttribute("data-bunny-video")).toBe(false);
    expect(bunnyScript(doc)).toBeNull();
  });
});
