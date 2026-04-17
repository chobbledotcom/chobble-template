import { describe, expect, test } from "bun:test";
import {
  configureWrapHashtags,
  splitHashtags,
} from "#eleventy/wrap-hashtags.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("wrap-hashtags", () => {
  test("registers splitHashtags filter with Eleventy", () => {
    const mockConfig = createMockEleventyConfig();
    configureWrapHashtags(mockConfig);

    expect(typeof mockConfig.filters.splitHashtags).toBe("function");
  });

  test("returns a single non-tag segment when there are no hashtags", () => {
    expect(splitHashtags("Just some prose, nothing tagged.")).toEqual([
      { text: "Just some prose, nothing tagged.", isTag: false },
    ]);
  });

  test("splits a caption with a trailing hashtag", () => {
    expect(splitHashtags("nice #gig")).toEqual([
      { text: "nice ", isTag: false },
      { text: "#gig", isTag: true },
    ]);
  });

  test("splits a caption with a leading hashtag", () => {
    expect(splitHashtags("#gig was nice")).toEqual([
      { text: "#gig", isTag: true },
      { text: " was nice", isTag: false },
    ]);
  });

  test("splits a caption with several hashtags in order", () => {
    expect(
      splitHashtags(
        "Here is a photo of a gig that relates to our services #gig #photo #here",
      ),
    ).toEqual([
      {
        text: "Here is a photo of a gig that relates to our services ",
        isTag: false,
      },
      { text: "#gig", isTag: true },
      { text: " ", isTag: false },
      { text: "#photo", isTag: true },
      { text: " ", isTag: false },
      { text: "#here", isTag: true },
    ]);
  });

  test("treats digits and underscores as part of a hashtag", () => {
    expect(splitHashtags("#mild_praise_2 rules")).toEqual([
      { text: "#mild_praise_2", isTag: true },
      { text: " rules", isTag: false },
    ]);
  });

  test("does not match a bare hash with no following word chars", () => {
    expect(splitHashtags("issue #123-followup and # alone")).toEqual([
      { text: "issue ", isTag: false },
      { text: "#123", isTag: true },
      { text: "-followup and # alone", isTag: false },
    ]);
  });

  test("returns an empty array for empty input", () => {
    expect(splitHashtags("")).toEqual([]);
  });

  test("returns an empty array for non-string input", () => {
    expect(splitHashtags(undefined)).toEqual([]);
    expect(splitHashtags(null)).toEqual([]);
  });
});
