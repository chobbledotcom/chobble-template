/**
 * Tests for video URL utilities
 */
import { describe, expect, test } from "bun:test";
import {
  getVideoEmbedUrl,
  getVideoThumbnailUrl,
  isCustomVideoUrl,
} from "#utils/video.js";

describe("isCustomVideoUrl", () => {
  test("returns false for YouTube video ID", () => {
    expect(isCustomVideoUrl("dQw4w9WgXcQ")).toBe(false);
  });

  test("returns true for https URL", () => {
    expect(isCustomVideoUrl("https://player.vimeo.com/video/123456")).toBe(
      true,
    );
  });

  test("returns true for http URL", () => {
    expect(isCustomVideoUrl("http://example.com/embed/video")).toBe(true);
  });

  test("returns false for non-string input", () => {
    expect(isCustomVideoUrl(null)).toBe(false);
    expect(isCustomVideoUrl(undefined)).toBe(false);
    expect(isCustomVideoUrl(12345)).toBe(false);
  });
});

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
  test("returns YouTube thumbnail URL for video ID", () => {
    const result = getVideoThumbnailUrl("dQw4w9WgXcQ");
    expect(result).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  test("returns null for custom https URL", () => {
    expect(getVideoThumbnailUrl("https://player.vimeo.com/video/123456")).toBe(
      null,
    );
  });

  test("returns null for custom http URL", () => {
    expect(getVideoThumbnailUrl("http://example.com/embed/video")).toBe(null);
  });
});
