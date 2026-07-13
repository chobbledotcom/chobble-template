import { describe, expect, test } from "bun:test";
import { useSharedSite } from "#test/test-site-factory.js";

const SITE_URL = "https://example.chobble.com";

const getSchema = async (site, outputPath) => {
  const doc = await site.getDoc(outputPath);
  const script = doc.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  return JSON.parse(script.textContent);
};

const getGraphItem = (schema, type) =>
  schema["@graph"].find((item) => item["@type"] === type);

describe("generated SEO metadata", () => {
  const getSite = useSharedSite({
    config: { placeholder_images: false },
    files: [
      {
        path: "pages/normal.md",
        frontmatter: {
          name: "Normal Page",
          meta_title: 'Normal & "Social"',
          meta_description: 'Normal & "description"',
          permalink: "/normal/",
          blocks: [
            {
              type: "image-background",
              image: "src/images/placeholders/purple.svg",
              image_alt: "Purple background",
              content: "# Normal Page",
            },
          ],
        },
      },
      {
        path: "products/schema-widget.md",
        frontmatter: {
          name: "Schema Widget",
          subtitle: "A structured widget",
          price: "From £495",
          thumbnail: "src/images/placeholders/blue.svg",
          blocks: [
            { type: "markdown", content: "# Schema Widget" },
            {
              type: "faqs",
              items: [
                {
                  question: "Does it have schema?",
                  answer: "Yes, automatically.",
                },
              ],
            },
          ],
        },
      },
      {
        path: "products/poa-widget.md",
        frontmatter: {
          name: "POA Widget",
          subtitle: "Ask for a price",
          price: "POA",
          thumbnail: "src/images/placeholders/orange.svg",
          blocks: [{ type: "markdown", content: "# POA Widget" }],
        },
      },
      {
        path: "news/2024-02-03-schema-news.md",
        frontmatter: {
          name: "Schema News",
          meta_description: "Structured news description",
          author: "src/team/jane-seo.md",
          thumbnail: "src/images/placeholders/green.svg",
          blocks: [
            { type: "markdown", content: "# Schema News" },
            { type: "news-meta" },
          ],
        },
      },
      {
        path: "team/jane-seo.md",
        frontmatter: {
          name: "Jane SEO",
          blocks: [{ type: "markdown", content: "Jane's biography." }],
        },
      },
      {
        path: "pages/private.md",
        frontmatter: {
          name: "Private Page",
          permalink: "/private/",
          no_index: true,
          blocks: [{ type: "markdown", content: "Private." }],
        },
      },
    ],
  });

  test("renders complete product, breadcrumb, FAQ, and global JSON-LD", async () => {
    const site = getSite();
    const outputPath = "/products/schema-widget/index.html";
    const schema = await getSchema(site, outputPath);
    const product = getGraphItem(schema, "Product");

    expect(product).toMatchObject({
      name: "Schema Widget",
      url: `${SITE_URL}/products/schema-widget/`,
      description: "A structured widget",
      image: `${SITE_URL}/images/placeholders/blue.svg`,
      brand: { "@type": "Brand", name: "The Chobble Template" },
      offers: { "@type": "Offer", price: 495, priceCurrency: "GBP" },
    });
    expect(getGraphItem(schema, "Organization")).toBeDefined();
    expect(getGraphItem(schema, "WebSite")).toBeDefined();

    const breadcrumbs = getGraphItem(schema, "BreadcrumbList");
    expect(breadcrumbs.itemListElement.map((item) => item.item.name)).toEqual([
      "Home",
      "Products",
      "Schema Widget",
    ]);
    expect(breadcrumbs.itemListElement.at(-1).item["@id"]).toBe(
      `${SITE_URL}/products/schema-widget/`,
    );

    const faq = getGraphItem(schema, "FAQPage");
    expect(faq.mainEntity[0]).toMatchObject({
      name: "Does it have schema?",
      acceptedAnswer: { text: "Yes, automatically." },
    });
    expect(site.getOutput(outputPath)).toContain(
      '<meta property="og:type" content="product">',
    );
  });

  test("omits product offers for unparseable prices", async () => {
    const schema = await getSchema(
      getSite(),
      "/products/poa-widget/index.html",
    );
    expect(getGraphItem(schema, "Product").offers).toBeUndefined();
  });

  test("renders complete news JSON-LD from authored content", async () => {
    const schema = await getSchema(getSite(), "/news/schema-news/index.html");
    expect(getGraphItem(schema, "BlogPosting")).toMatchObject({
      headline: "Schema News",
      url: `${SITE_URL}/news/schema-news/`,
      description: "Structured news description",
      image: `${SITE_URL}/images/placeholders/green.svg`,
      author: { "@type": "Person", name: "Jane SEO" },
      publisher: { "@type": "Organization", name: "The Chobble Template" },
      datePublished: "2024-02-03",
    });
  });

  test("renders normal page JSON-LD and escaped social cards", async () => {
    const site = getSite();
    const schema = await getSchema(site, "/normal/index.html");
    expect(getGraphItem(schema, "WebPage")).toMatchObject({
      headline: "Normal Page",
      url: `${SITE_URL}/normal/`,
      description: 'Normal & "description"',
      image: `${SITE_URL}/images/placeholders/purple.svg`,
    });

    const output = site.getOutput("/normal/index.html");
    expect(output).toContain(
      '<meta property="og:title" content="Normal & &quot;Social&quot;">',
    );
    expect(output).toContain(
      '<meta property="og:description" content="Normal & &quot;description&quot;">',
    );
    expect(output).toContain(
      `<meta property="og:url" content="${SITE_URL}/normal/">`,
    );
    expect(output).toContain(
      `<meta property="og:image" content="${SITE_URL}/images/placeholders/purple.svg">`,
    );
    expect(output).toContain('<meta property="og:type" content="website">');
    expect(output).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
    expect(output).toContain(
      `<link rel="canonical" href="${SITE_URL}/normal/">`,
    );
  });

  test("uses article social type for news", () => {
    const output = getSite().getOutput("/news/schema-news/index.html");
    expect(output).toContain('<meta property="og:type" content="article">');
    expect(output).toContain(
      `<meta name="twitter:image" content="${SITE_URL}/images/placeholders/green.svg">`,
    );
  });

  test("renders valid noindex robots metadata without JSON-LD", () => {
    const output = getSite().getOutput("/private/index.html");
    expect(output).toContain('<meta name="robots" content="noindex,nofollow">');
    expect(output).not.toContain('name="robots" value=');
    expect(output).not.toContain('type="application/ld+json"');
  });
});
