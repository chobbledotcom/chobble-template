import { describe, test, expect } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";
import { normaliseSlug } from "#utils/slug-utils.js";

describe("news", () => {
  test("Returns simple slug unchanged", () => {
    const result = normaliseSlug("jane-doe");
    expect(result).toBe("jane-doe");
  });

  test("Extracts slug from full path reference", () => {
    const result = normaliseSlug("src/team/jane-doe.md");
    expect(result).toBe("jane-doe");
  });

  test("Removes file extension from slug", () => {
    const result = normaliseSlug("jane-doe.md");
    expect(result).toBe("jane-doe");
  });

  test("Returns null for null input", () => {
    const result = normaliseSlug(null);
    expect(result).toBe(null);
  });

  test("Returns undefined for undefined input", () => {
    const result = normaliseSlug(undefined);
    expect(result).toBe(undefined);
  });

  test("News post with author renders author link in HTML", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "news/2024-01-01-test-post.md",
            frontmatter: {
              title: "Test Post With Author",
              author: "src/team/jane-doe.md",
            },
            content: "This is a test post with an author.",
          },
          {
            path: "team/jane-doe.md",
            frontmatter: {
              title: "Jane Doe",
              snippet: "Test team member",
            },
            content: "Jane Doe bio.",
          },
        ],
      },
      (site) => {
        const doc = site.getDoc("/news/test-post/index.html");
        const content = doc.getElementById("content");
        const contentHtml = content ? content.innerHTML : "";

        expect(contentHtml.includes('href="/team/jane-doe/"')).toBe(true);
        expect(contentHtml.includes("Jane Doe")).toBe(true);
      },
    );
  });

  test("News post without author does not render author section", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "news/2024-01-01-no-author.md",
            frontmatter: {
              title: "Test Post Without Author",
            },
            content: "This is a test post without an author.",
          },
        ],
      },
      (site) => {
        const doc = site.getDoc("/news/no-author/index.html");
        const content = doc.getElementById("content");
        const contentHtml = content ? content.innerHTML : "";

        expect(contentHtml.includes('href="/team/')).toBe(false);
      },
    );
  });

  test("News post with author that has image renders grid layout with thumbnail", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "news/2024-01-01-thumbnail-post.md",
            frontmatter: {
              title: "Post With Author Thumbnail",
              author: "src/team/jane-doe.md",
            },
            content: "Post content here.",
          },
          {
            path: "team/jane-doe.md",
            frontmatter: {
              title: "Jane Doe",
              snippet: "Test team member",
              image: "src/images/placeholder-square-1.jpg",
            },
            content: "Jane Doe bio.",
          },
        ],
        images: ["placeholder-square-1.jpg"],
      },
      (site) => {
        const doc = site.getDoc("/news/thumbnail-post/index.html");
        const postMeta = doc.querySelector(".post-meta");

        expect(postMeta !== null).toBe(true);
        expect(postMeta.classList.contains("with-thumbnail")).toBe(true);
        expect(postMeta.querySelector("figure") !== null).toBe(true);
        expect(postMeta.querySelector("figure a") !== null).toBe(true);
        expect(postMeta.querySelector("address") !== null).toBe(true);
        expect(postMeta.querySelector('a[rel="author"]') !== null).toBe(true);
        expect(postMeta.querySelector("time") !== null).toBe(true);
        expect(postMeta.querySelector("time").hasAttribute("datetime")).toBe(true);
      },
    );
  });

  test("News post with author but no image renders without thumbnail class", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "news/2024-01-01-no-thumb-post.md",
            frontmatter: {
              title: "Post With Author No Thumbnail",
              author: "src/team/john-smith.md",
            },
            content: "Post content here.",
          },
          {
            path: "team/john-smith.md",
            frontmatter: {
              title: "John Smith",
              snippet: "Team member without image",
            },
            content: "John Smith bio.",
          },
        ],
      },
      (site) => {
        const doc = site.getDoc("/news/no-thumb-post/index.html");
        const postMeta = doc.querySelector(".post-meta");

        expect(postMeta !== null).toBe(true);
        expect(postMeta.classList.contains("with-thumbnail")).toBe(false);
        expect(postMeta.querySelector("figure")).toBe(null);
        expect(postMeta.querySelector("address") !== null).toBe(true);
        expect(postMeta.querySelector('a[rel="author"]') !== null).toBe(true);
        expect(postMeta.querySelector("time") !== null).toBe(true);
      },
    );
  });

  test("News post without author renders simple date-only layout", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "news/2024-01-01-anonymous-post.md",
            frontmatter: {
              title: "Anonymous Post",
            },
            content: "Post without an author.",
          },
        ],
      },
      (site) => {
        const doc = site.getDoc("/news/anonymous-post/index.html");
        const postMeta = doc.querySelector(".post-meta");

        expect(postMeta !== null).toBe(true);
        expect(postMeta.classList.contains("with-thumbnail")).toBe(false);
        expect(postMeta.querySelector("figure")).toBe(null);
        expect(postMeta.querySelector("address")).toBe(null);
        expect(postMeta.querySelector("time") !== null).toBe(true);
        expect(postMeta.querySelector("time").hasAttribute("datetime")).toBe(true);
      },
    );
  });

  test("Post meta uses semantic HTML with proper roles", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "news/2024-01-01-semantic-test.md",
            frontmatter: {
              title: "Semantic HTML Test",
              author: "src/team/jane-doe.md",
            },
            content: "Testing semantic markup.",
          },
          {
            path: "team/jane-doe.md",
            frontmatter: {
              title: "Jane Doe",
              snippet: "Test team member",
              image: "src/images/placeholder-square-1.jpg",
            },
            content: "Jane Doe bio.",
          },
        ],
        images: ["placeholder-square-1.jpg"],
      },
      (site) => {
        const doc = site.getDoc("/news/semantic-test/index.html");
        const postMeta = doc.querySelector(".post-meta");

        expect(postMeta.tagName.toLowerCase()).toBe("header");
        expect(postMeta.getAttribute("role")).toBe("doc-subtitle");
      },
    );
  });
});
