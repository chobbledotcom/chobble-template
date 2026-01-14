import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";

const categoryWithProduct = [
  {
    path: "categories/widgets.md",
    frontmatter: { title: "Widgets" },
    content: "",
  },
  {
    path: "products/no-image.md",
    frontmatter: { title: "No Image Product", categories: ["widgets"] },
    content: "",
  },
];

describe("category-products", () => {
  test("Category page renders products assigned to that category", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "categories/widgets.md",
            frontmatter: {
              title: "Widgets",
            },
            content: "Category description.",
          },
          {
            path: "products/test-widget.md",
            frontmatter: {
              title: "Test Widget",
              categories: ["widgets"],
            },
            content: "A test widget product.",
          },
        ],
      },
      (site) => {
        const doc = site.getDoc("/categories/widgets/index.html");
        const html = doc.body.innerHTML;

        expect(html.includes("Test Widget")).toBe(true);
        expect(html.includes('href="/products/test-widget/#content"')).toBe(
          true,
        );
      },
    );
  });

  test("Product without thumbnail shows placeholder by default", async () => {
    await withTestSite({ files: categoryWithProduct }, (site) => {
      const doc = site.getDoc("/categories/widgets/index.html");
      // With placeholder_images: true (default), products get placeholder thumbnails
      expect(doc.querySelector(".image-link") !== null).toBe(true);
    });
  });

  test("Product without thumbnail shows no image when placeholder_images disabled", async () => {
    await withTestSite(
      { config: { placeholder_images: false }, files: categoryWithProduct },
      (site) => {
        const doc = site.getDoc("/categories/widgets/index.html");
        // With placeholder_images: false, no thumbnail means no image rendered
        expect(doc.querySelector(".image-link")).toBe(null);
      },
    );
  });

  test("News post without thumbnail gets no placeholder when placeholder_images disabled", async () => {
    await withTestSite(
      {
        config: { placeholder_images: false },
        files: [
          {
            path: "news/2024-01-01-no-thumb.md",
            frontmatter: { title: "News Without Thumbnail" },
            content: "News content without any images",
          },
        ],
      },
      (site) => {
        // News posts without thumbnails should have no placeholder image when placeholder_images: false
        // This exercises the return null path in getPlaceholderIfEnabled (lines 51-52)
        const newsDoc = site.getDoc("/news/no-thumb/index.html");
        expect(newsDoc.querySelector(".post-meta figure")).toBe(null);
        expect(newsDoc.querySelector(".post-meta img")).toBe(null);
      },
    );
  });
});
