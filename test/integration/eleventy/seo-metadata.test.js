import { describe, expect, test } from "vitest";
import siteData from "#data/site.json" with { type: "json" };
import { useSharedSite } from "#test/test-site-factory.js";

const SITE_URL = siteData.url;

const getSchema = async (site, outputPath) => {
  const doc = await site.getDoc(outputPath);
  const script = doc.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  return JSON.parse(script.textContent);
};

const getGraphItem = (schema, type) =>
  schema["@graph"].find((item) => item["@type"] === type);

const getBreadcrumbNames = (schema) =>
  getGraphItem(schema, "BreadcrumbList").itemListElement.map(
    (item) => item.item.name,
  );

describe("generated SEO metadata", () => {
  const getSite = useSharedSite({
    // The breadcrumb schema is emitted only when breadcrumbs are shown, which
    // a site's own config may turn off.
    config: { placeholder_images: false, show_breadcrumbs: true },
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
        path: "pages/faq-page.md",
        frontmatter: {
          name: "FAQ Page",
          permalink: "/faq-page/",
          blocks: [
            { type: "markdown", content: "# FAQ Page" },
            {
              type: "faqs",
              items: [
                {
                  question: "Does it have schema?",
                  answer: "Yes, automatically.",
                },
                {
                  question: "What can an answer contain?",
                  answer:
                    "**Formatted text** and a list:\n\n- First item\n- Second item",
                },
              ],
            },
          ],
        },
      },
      {
        path: "news/2024-02-03-schema-news.md",
        frontmatter: {
          name: "Schema News",
          meta_description: "Structured news description",
          author: "Jane SEO",
          thumbnail: "src/images/placeholders/green.svg",
          navigationParent: "News",
          blocks: [
            { type: "markdown", content: "# Schema News" },
            { type: "news-meta" },
          ],
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

  test("renders FAQ, breadcrumb, and global JSON-LD", async () => {
    const site = getSite();
    const outputPath = "/faq-page/index.html";
    const schema = await getSchema(site, outputPath);

    expect(getGraphItem(schema, "Organization")).toBeDefined();
    expect(getGraphItem(schema, "WebSite")).toBeDefined();

    expect(getBreadcrumbNames(schema)).toEqual(["Home", "FAQ Page"]);
    const breadcrumbs = getGraphItem(schema, "BreadcrumbList");
    expect(breadcrumbs.itemListElement.at(-1).item["@id"]).toBe(
      `${SITE_URL}/faq-page/`,
    );

    const faq = getGraphItem(schema, "FAQPage");
    expect(faq.mainEntity[0]).toMatchObject({
      name: "Does it have schema?",
      acceptedAnswer: { text: "Yes, automatically." },
    });
  });

  test("renders complete news JSON-LD from authored content", async () => {
    const schema = await getSchema(getSite(), "/news/schema-news/index.html");
    expect(getGraphItem(schema, "BlogPosting")).toMatchObject({
      headline: "Schema News",
      url: `${SITE_URL}/news/schema-news/`,
      description: "Structured news description",
      image: `${SITE_URL}/images/placeholders/green.svg`,
      author: { "@type": "Person", name: "Jane SEO" },
      publisher: { "@type": "Organization", name: siteData.name },
      datePublished: "2024-02-03",
    });
  });

  test("FAQ answers render rich text inside prose-styled definitions", async () => {
    const doc = await getSite().getDoc("/faq-page/index.html");
    const answers = [...doc.querySelectorAll("dl.faqs > dd.prose")];
    expect(answers).toHaveLength(2);
    expect(answers[1].querySelector("p > strong").textContent).toBe(
      "Formatted text",
    );
    expect(
      [...answers[1].querySelectorAll("ul > li")].map(
        (item) => item.textContent,
      ),
    ).toEqual(["First item", "Second item"]);
  });

  test("renders news breadcrumb schema through the collection index", async () => {
    const schema = await getSchema(getSite(), "/news/schema-news/index.html");
    expect(getBreadcrumbNames(schema)).toEqual(["Home", "News", "Schema News"]);
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
