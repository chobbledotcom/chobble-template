import { describe, expect, test } from "vitest";
import { configureVideo } from "#eleventy/video.js";
import { withConfiguredMock, withMockFetch } from "#test/test-utils.js";

const registered = withConfiguredMock(configureVideo)();
const { videoEmbedUrl, isYouTubeId, isBunnyVideo } = registered.filters;
const { videoThumbnail } = registered.asyncFilters;

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

  describe("isBunnyVideo", () => {
    test("is true for a Bunny Stream embed URL", () => {
      expect(isBunnyVideo("https://iframe.mediadelivery.net/embed/1/abc")).toBe(
        true,
      );
      expect(
        isBunnyVideo("https://player.mediadelivery.net/embed/1/abc?loop=true"),
      ).toBe(true);
    });

    test("is false for a YouTube ID and for other providers", () => {
      expect(isBunnyVideo("dQw4w9WgXcQ")).toBe(false);
      expect(isBunnyVideo("https://player.vimeo.com/video/123456")).toBe(false);
    });
  });

  describe("videoThumbnail", () => {
    test("uses the author's thumbnail when one is given", async () => {
      expect(await videoThumbnail("dQw4w9WgXcQ", "poster.jpg")).toBe(
        "poster.jpg",
      );
      expect(
        await videoThumbnail("https://vimeo.com/123456", "poster.jpg"),
      ).toBe("poster.jpg");
    });

    test("falls back to YouTube's thumbnail for a YouTube ID", async () => {
      expect(await videoThumbnail("dQw4w9WgXcQ")).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      );
    });

    test("asks Vimeo for the thumbnail of a Vimeo URL", () =>
      withMockFetch(
        { thumbnail_url: "https://i.vimeocdn.example/1001.jpg" },
        {},
        async () => {
          expect(
            await videoThumbnail("https://player.vimeo.com/video/1001?h=abc"),
          ).toBe("https://i.vimeocdn.example/1001.jpg");
        },
      ));

    test("asks Vimeo once for a video used more than once", async () => {
      await withMockFetch({ thumbnail_url: "first.jpg" }, {}, () =>
        videoThumbnail("https://vimeo.com/1002"),
      );
      await withMockFetch({ thumbnail_url: "second.jpg" }, {}, async () => {
        expect(await videoThumbnail("https://vimeo.com/1002")).toBe(
          "first.jpg",
        );
      });
    });

    test("fails when Vimeo will not describe the video", () =>
      withMockFetch("", { ok: false, status: 404 }, () =>
        expect(videoThumbnail("https://vimeo.com/1003")).rejects.toThrow(
          "Vimeo returned HTTP 404 for the thumbnail of video 1003",
        ),
      ));

    test("is empty for another provider with no thumbnail given", async () => {
      expect(
        await videoThumbnail("https://iframe.mediadelivery.net/embed/1/abc"),
      ).toBe("");
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
