import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";
import { getVideoThumbnailUrl } from "#utils/video.js";

describe("eleventyComputed.videos", () => {
  test("returns undefined when videos is not set", async () => {
    expect(await eleventyComputed.videos({})).toBeUndefined();
  });

  test("adds a YouTube thumbnail_url derived from the video id", async () => {
    const id = "dQw4w9WgXcQ";
    const [video] = await eleventyComputed.videos({
      videos: [{ id, title: "YouTube Video" }],
    });
    // Delegate the expected URL to the production helper so the assertion
    // tracks any change to how thumbnails are resolved.
    expect(video.thumbnail_url).toBe(await getVideoThumbnailUrl(id));
  });

  test("sets thumbnail_url to null for embed URLs that have no known thumbnail", async () => {
    const [video] = await eleventyComputed.videos({
      videos: [{ id: "http://example.com/embed", title: "Custom Embed" }],
    });
    expect(video.thumbnail_url).toBe(null);
  });

  test("preserves non-thumbnail video properties while injecting thumbnail_url", async () => {
    const [video] = await eleventyComputed.videos({
      videos: [{ id: "dQw4w9WgXcQ", title: "Test", customField: "value" }],
    });
    expect(video.id).toBe("dQw4w9WgXcQ");
    expect(video.title).toBe("Test");
    expect(video.customField).toBe("value");
    expect(video.thumbnail_url).toBe(await getVideoThumbnailUrl("dQw4w9WgXcQ"));
  });
});
