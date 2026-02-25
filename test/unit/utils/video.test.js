/**
 * Tests for video URL utilities
 */
import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  getVideoEmbedUrl,
  getVideoThumbnailUrl,
  isRickAstleyThumbnail,
  RICK_ASTLEY_VIDEO_ID,
} from "#utils/video.js";

describe("getVideoEmbedUrl", () => {
  describe("with YouTube video ID", () => {
    test("returns youtube-nocookie embed URL with autoplay", () => {
      const result = getVideoEmbedUrl("dQw4w9WgXcQ");
      expect(result).toBe(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
      );
    });

    test("adds background params when background option is true", () => {
      const result = getVideoEmbedUrl("dQw4w9WgXcQ", { background: true });
      expect(result).toBe(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=dQw4w9WgXcQ",
      );
    });

    test("does not add background params when background is false", () => {
      const result = getVideoEmbedUrl("dQw4w9WgXcQ", { background: false });
      expect(result).toBe(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
      );
    });
  });

  describe("with custom URL", () => {
    test("returns the URL unchanged for https URL", () => {
      const customUrl = "https://player.vimeo.com/video/123456?autoplay=1";
      expect(getVideoEmbedUrl(customUrl)).toBe(customUrl);
    });

    test("returns the URL unchanged for http URL", () => {
      const customUrl = "http://example.com/embed/video";
      expect(getVideoEmbedUrl(customUrl)).toBe(customUrl);
    });

    test("ignores background option for custom URLs", () => {
      const customUrl = "https://player.vimeo.com/video/123456";
      expect(getVideoEmbedUrl(customUrl, { background: true })).toBe(customUrl);
    });
  });
});

describe("getVideoThumbnailUrl", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns YouTube thumbnail URL for video ID", async () => {
    const result = await getVideoThumbnailUrl("dQw4w9WgXcQ");
    expect(result).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  test("returns null for non-Vimeo custom https URL", async () => {
    expect(await getVideoThumbnailUrl("https://example.com/embed/video")).toBe(
      null,
    );
  });

  test("returns null for non-Vimeo custom http URL", async () => {
    expect(await getVideoThumbnailUrl("http://example.com/embed/video")).toBe(
      null,
    );
  });

  test("fetches thumbnail for Vimeo player embed URL via oEmbed", async () => {
    const thumbnailUrl = "https://i.vimeocdn.com/video/test1_480.jpg";
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ thumbnail_url: thumbnailUrl }),
      }),
    );

    const result = await getVideoThumbnailUrl(
      "https://player.vimeo.com/video/900001",
    );
    expect(result).toBe(thumbnailUrl);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://vimeo.com/api/oembed.json?url=https://vimeo.com/900001&width=480",
    );
  });

  test("extracts numeric ID from vimeo.com URL for oEmbed lookup", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            thumbnail_url: "https://i.vimeocdn.com/video/regular_480.jpg",
          }),
      }),
    );

    expect(await getVideoThumbnailUrl("https://vimeo.com/900002")).toBe(
      "https://i.vimeocdn.com/video/regular_480.jpg",
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://vimeo.com/api/oembed.json?url=https://vimeo.com/900002&width=480",
    );
  });

  test("throws when Vimeo oEmbed API returns non-OK status", async () => {
    globalThis.fetch = mock(() => Promise.resolve({ ok: false, status: 404 }));

    await expect(
      getVideoThumbnailUrl("https://player.vimeo.com/video/900003"),
    ).rejects.toThrow("Vimeo oEmbed API returned 404 for video 900003");
  });

  test("throws when Vimeo oEmbed fetch fails with network error", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("Network error")));

    await expect(
      getVideoThumbnailUrl("https://player.vimeo.com/video/900004"),
    ).rejects.toThrow("Network error");
  });
});

describe("isRickAstleyThumbnail", () => {
  test("returns true for Rick Astley YouTube thumbnail URL", () => {
    const url = `https://img.youtube.com/vi/${RICK_ASTLEY_VIDEO_ID}/hqdefault.jpg`;
    expect(isRickAstleyThumbnail(url)).toBe(true);
  });

  test("returns false for other YouTube thumbnail URLs", () => {
    expect(
      isRickAstleyThumbnail(
        "https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg",
      ),
    ).toBe(false);
  });

  test("returns false for non-string input", () => {
    expect(isRickAstleyThumbnail(null)).toBe(false);
    expect(isRickAstleyThumbnail(undefined)).toBe(false);
  });
});

describe("RICK_ASTLEY_VIDEO_ID", () => {
  test("is the known Rick Astley video ID", () => {
    expect(RICK_ASTLEY_VIDEO_ID).toBe("dQw4w9WgXcQ");
  });
});
