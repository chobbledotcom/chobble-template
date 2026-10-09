import { describe, expect, test } from "vitest";
import { configureVideo } from "#eleventy/video.js";
import { withConfiguredMock } from "#test/test-utils.js";

const { videoEmbedUrl, isYouTubeId, videoThumbnail } =
  withConfiguredMock(configureVideo)().filters;

describe("video filters", () => {
  describe("isYouTubeId", () => {
    test("is true for a bare video ID", () => {
      expect(isYouTubeId("dQw4w9WgXcQ")).toBe(true);
    });

    test("is false for an embed URL", () => {
      expect(isYouTubeId("https://player.vimeo.com/video/123456")).toBe(false);
      expect(isYouTubeId("http://example.com/embed/1")).toBe(false);
    });
  });

  describe("videoThumbnail", () => {
    test("uses the author's thumbnail when one is given", () => {
      expect(videoThumbnail("dQw4w9WgXcQ", "poster.jpg")).toBe("poster.jpg");
      expect(videoThumbnail("https://vimeo.com/123456", "poster.jpg")).toBe(
        "poster.jpg",
      );
    });

    test("falls back to YouTube's thumbnail for a YouTube ID", () => {
      expect(videoThumbnail("dQw4w9WgXcQ")).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      );
    });

    test("is empty for another provider with no thumbnail given", () => {
      expect(videoThumbnail("https://vimeo.com/123456")).toBe("");
    });
  });

  describe("videoEmbedUrl for YouTube IDs", () => {
    test("builds a click-to-play embed on the no-cookie domain by default", () => {
      expect(videoEmbedUrl("dQw4w9WgXcQ")).toBe(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
      );
    });

    test("mutes an autoplaying embed and keeps it inline", () => {
      expect(videoEmbedUrl("dQw4w9WgXcQ", "autoplay")).toBe(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&playsinline=1",
      );
    });

    test("loops a background embed silently without controls", () => {
      const params = new URL(videoEmbedUrl("dQw4w9WgXcQ", "background"))
        .searchParams;
      expect(Object.fromEntries(params)).toEqual({
        autoplay: "1",
        mute: "1",
        loop: "1",
        controls: "0",
        playsinline: "1",
        enablejsapi: "1",
        playlist: "dQw4w9WgXcQ",
      });
    });
  });

  describe("videoEmbedUrl for Vimeo URLs", () => {
    test("switches on autoplay and loop for click-to-play", () => {
      expect(videoEmbedUrl("https://player.vimeo.com/video/123456")).toBe(
        "https://player.vimeo.com/video/123456?autoplay=1&loop=1",
      );
    });

    test("also mutes when the video starts without a click", () => {
      expect(videoEmbedUrl("https://vimeo.com/123456", "background")).toBe(
        "https://vimeo.com/123456?autoplay=1&loop=1&muted=1",
      );
      expect(videoEmbedUrl("https://vimeo.com/123456", "autoplay")).toBe(
        "https://vimeo.com/123456?autoplay=1&loop=1&muted=1",
      );
    });

    test("keeps parameters the author already set", () => {
      expect(
        videoEmbedUrl("https://player.vimeo.com/video/123456?loop=0&h=abc"),
      ).toBe("https://player.vimeo.com/video/123456?loop=0&h=abc&autoplay=1");
    });
  });

  describe("videoEmbedUrl for other providers", () => {
    test("uses the embed URL as written, in every mode", () => {
      const url = "https://iframe.mediadelivery.net/embed/1/abc?autoplay=true";
      expect(videoEmbedUrl(url)).toBe(url);
      expect(videoEmbedUrl(url, "background")).toBe(url);
    });
  });
});
