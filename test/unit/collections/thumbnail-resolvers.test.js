import { describe, expect, test } from "bun:test";
import { createChildThumbnailResolver } from "#collections/thumbnail-resolvers.js";

/** Node factory: fileSlug is the default lookup key and thumbnail is optional. */
const node = (fileSlug, thumbnail, order = 0) => ({
  fileSlug,
  thumbnail,
  data: { order },
});

/** Build a childrenByParent Map from an adjacency record. */
const childrenMap = (adjacency) => new Map(Object.entries(adjacency));

const getOwnThumbnail = (n) => n.thumbnail;

describe("createChildThumbnailResolver", () => {
  test("returns the item's own thumbnail when present", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: new Map(),
      getOwnThumbnail,
    });
    expect(resolve(node("root", "own"))).toBe("own");
  });

  test("falls back to a direct child's thumbnail when own is missing", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: childrenMap({ root: [node("child", "child-thumb")] }),
      getOwnThumbnail,
    });
    expect(resolve(node("root"))).toBe("child-thumb");
  });

  test("recurses into grandchildren when intermediate nodes have no thumbnail", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: childrenMap({
        root: [node("mid")],
        mid: [node("leaf", "deep-thumb")],
      }),
      getOwnThumbnail,
    });
    expect(resolve(node("root"))).toBe("deep-thumb");
  });

  test("picks the lowest-order child when siblings have thumbnails", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: childrenMap({
        root: [node("b", "thumb-b", 2), node("a", "thumb-a", 1)],
      }),
      getOwnThumbnail,
    });
    expect(resolve(node("root"))).toBe("thumb-a");
  });

  const fallbackFn = (n) => `fallback-${n.fileSlug}`;

  test("uses a descendant's fallback before bubbling back to the root's fallback", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: childrenMap({ root: [node("child")] }),
      getOwnThumbnail,
      getFallbackThumbnail: fallbackFn,
    });
    expect(resolve(node("root"))).toBe("fallback-child");
  });

  test("uses the root's own fallback only when no descendants exist", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: new Map(),
      getOwnThumbnail,
      getFallbackThumbnail: fallbackFn,
    });
    expect(resolve(node("root"))).toBe("fallback-root");
  });

  test("returns undefined when nothing in the tree provides a thumbnail", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: childrenMap({ root: [node("child")] }),
      getOwnThumbnail,
      getFallbackThumbnail: () => undefined,
    });
    expect(resolve(node("root"))).toBeUndefined();
  });

  test("returns undefined when there are no children and no fallback is supplied", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: new Map(),
      getOwnThumbnail,
    });
    expect(resolve(node("root"))).toBeUndefined();
  });

  test("uses a caller-supplied getKey to look up children", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: childrenMap({
        root: [{ slug: "child", thumbnail: "keyed-thumb" }],
      }),
      getOwnThumbnail,
      getKey: (n) => n.slug,
    });
    expect(resolve({ slug: "root", thumbnail: undefined })).toBe("keyed-thumb");
  });

  test("searches sibling branches until a descendant yields a thumbnail", () => {
    const resolve = createChildThumbnailResolver({
      childrenByParent: childrenMap({
        root: [node("left", undefined, 1), node("right", undefined, 2)],
        left: [node("left-child")],
        right: [node("right-child", "found-via-right")],
      }),
      getOwnThumbnail,
    });
    expect(resolve(node("root"))).toBe("found-via-right");
  });
});
