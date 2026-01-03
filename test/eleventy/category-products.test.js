import { withTestSite } from "#test/test-site-factory.js";
import { createTestRunner, expectStrictEqual } from "#test/test-utils.js";

const testCases = [
  {
    name: "category-renders-products",
    description: "Category page renders products assigned to that category",
    asyncTest: async () => {
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

          expectStrictEqual(
            html.includes("Test Widget"),
            true,
            "Category page should include the product title",
          );
          expectStrictEqual(
            html.includes('href="/products/test-widget/#content"'),
            true,
            "Category page should include link to the product",
          );
        },
      );
    },
  },
];

export default createTestRunner("category-products", testCases);
