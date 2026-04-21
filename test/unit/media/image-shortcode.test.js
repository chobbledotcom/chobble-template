import { describe, expect, test } from "bun:test";
import { imageShortcode } from "#media/image.js";

describe("imageShortcode parameter validation", () => {
  test("throws when loading is a non-string truthy value (LiquidJS null → {})", async () => {
    expect(
      imageShortcode("test.jpg", "alt", "", "", "", "", {}),
    ).rejects.toThrow("loading");
  });

  test("throws when classes is a non-string truthy value", async () => {
    expect(imageShortcode("test.jpg", "alt", "", {}, "", "")).rejects.toThrow(
      "classes",
    );
  });

  test("throws when sizes is a non-string truthy value", async () => {
    expect(imageShortcode("test.jpg", "alt", "", "", {}, "")).rejects.toThrow(
      "sizes",
    );
  });

  test("throws when aspectRatio is a non-string truthy value", async () => {
    expect(imageShortcode("test.jpg", "alt", "", "", "", {})).rejects.toThrow(
      "aspectRatio",
    );
  });

  test("error message suggests using empty string instead of null", async () => {
    expect(imageShortcode("test.jpg", "alt", "", "", {}, "")).rejects.toThrow(
      'Use "" instead of null',
    );
  });
});
