import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";

const widgetProduct = {
  path: "products/test-widget.md",
  frontmatter: {
    name: "Test Widget",
    categories: ["widgets"],
    blocks: [{ type: "markdown", content: "A test widget product." }],
  },
  content: "",
};

const categoryProductsBlock = { type: "category-products" };

const categoryWithProduct = [
  {
    path: "categories/widgets.md",
    frontmatter: { name: "Widgets", blocks: [categoryProductsBlock] },
    content: "",
  },
  {
    path: "products/no-image.md",
    frontmatter: { name: "No Image Product", categories: ["widgets"] },
    content: "",
  },
];

describe("category-products", () => {
  test("Category page renders products assigned to that category", async () => {
    const widgetsCategory = {
      path: "categories/widgets.md",
      frontmatter: {
        name: "Widgets",
        blocks: [
          { type: "markdown", content: "Category description." },
          categoryProductsBlock,
        ],
      },
      content: "",
    };
    await withTestSite(
      { files: [widgetsCategory, widgetProduct] },
      async (site) => {
        const doc = await site.getDoc("/categories/widgets/index.html");
        const html = doc.body.innerHTML;

        expect(html.includes("Test Widget")).toBe(true);
        expect(html.includes('href="/products/test-widget/"')).toBe(true);
      },
    );
  }, 30_000);

  test("Product without thumbnail shows placeholder by default", async () => {
    await withTestSite({ files: categoryWithProduct }, async (site) => {
      const doc = await site.getDoc("/categories/widgets/index.html");
      // With placeholder_images: true (default), products get placeholder thumbnails
      expect(doc.querySelector(".image-link") !== null).toBe(true);
    });
  }, 30_000);

  test("Product without thumbnail shows no image when placeholder_images disabled", async () => {
    await withTestSite(
      { config: { placeholder_images: false }, files: categoryWithProduct },
      async (site) => {
        const doc = await site.getDoc("/categories/widgets/index.html");
        // With placeholder_images: false, no thumbnail means no image rendered
        expect(doc.querySelector(".image-link")).toBe(null);
      },
    );
  }, 30_000);

  test("News post without thumbnail gets no placeholder when placeholder_images disabled", async () => {
    await withTestSite(
      {
        config: { placeholder_images: false },
        files: [
          {
            path: "news/2024-01-01-no-thumb.md",
            frontmatter: {
              name: "News Without Thumbnail",
              blocks: [
                {
                  type: "markdown",
                  content: "News content without any images",
                },
              ],
            },
            content: "",
          },
        ],
      },
      async (site) => {
        // News posts without thumbnails should have no placeholder image when placeholder_images: false
        // This exercises the return null path in getPlaceholderIfEnabled (lines 51-52)
        const newsDoc = await site.getDoc("/news/no-thumb/index.html");
        expect(newsDoc.querySelector(".post-meta figure")).toBe(null);
        expect(newsDoc.querySelector(".post-meta img")).toBe(null);
      },
    );
  }, 30_000);
});
