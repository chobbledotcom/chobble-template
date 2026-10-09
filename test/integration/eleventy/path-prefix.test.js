import { describe, expect, test } from "vitest";
import { useSharedSite } from "#test/test-site-factory.js";

const PATH_PREFIX = "/project/";
const SITE_URL = "https://deployment.test/project";

const getSite = useSharedSite({
  env: { PATH_PREFIX, SITE_URL },
  images: ["party.jpg"],
  processImages: true,
  files: [
    {
      path: "pages/about.md",
      frontmatter: {
        name: "About",
        permalink: "/about/",
        redirect_from: ["/old-about/"],
        image: "party.jpg",
        blocks: [
          {
            type: "markdown",
            content:
              "# About\n\n![People celebrating](/images/party.jpg)\n\n[Home](/)",
          },
        ],
      },
      content: "",
    },
    {
      path: "pages/search.md",
      frontmatter: {
        name: "Search",
        permalink: "/search/",
        blocks: [{ type: "include", file: "search-results.html" }],
      },
      content: "",
    },
    {
      path: "news/2024-01-01-update.md",
      frontmatter: {
        name: "Project update",
        blocks: [{ type: "markdown", content: "An update." }],
      },
      content: "",
    },
  ],
});

describe("project-site path prefix", () => {
  test("prefixes final HTML links and assets", async () => {
    const doc = await getSite().getDoc("about/index.html");
    expect(
      doc.querySelector('link[rel="stylesheet"]').getAttribute("href"),
    ).toMatch(/^\/project\/css\/design-system-bundle\.css\?cached=/);
    expect(doc.querySelector('a[href="/project/"]')).not.toBeNull();
    expect(
      doc.querySelector("script[data-path-prefix]").dataset.pathPrefix,
    ).toBe(PATH_PREFIX);
  });

  test("processes Markdown images before prefixing generated URLs", async () => {
    const doc = await getSite().getDoc("about/index.html");
    const picture = doc.querySelector(".image-wrapper picture");
    expect(picture).not.toBeNull();
    expect(picture.querySelector("img").getAttribute("src")).toMatch(
      /^\/project\/img\//,
    );
    for (const source of picture.querySelectorAll("source")) {
      expect(source.getAttribute("srcset")).toContain("/project/img/");
    }
  });

  test("keeps self-hosted font URLs under the project path", () => {
    const css = getSite().getOutput("css/design-system-bundle.css");
    const fontUrls = [
      ...css.matchAll(/url\(["']?([^"')]+\/fonts\/[^"')]+)/g),
    ].map(([, url]) => url);
    expect(fontUrls.length).toBeGreaterThan(0);
    for (const fontUrl of fontUrls) {
      const resolved = new URL(
        fontUrl,
        `${SITE_URL}/css/design-system-bundle.css`,
      );
      expect(resolved.pathname).toMatch(/^\/project\/assets\/fonts\//);
    }
  });

  test("prefixes feed assets while retaining absolute feed URLs", () => {
    const feed = getSite().getOutput("feed.xml");
    expect(feed).toContain(
      `<?xml-stylesheet href="${PATH_PREFIX}assets/pretty-atom-feed.xsl"`,
    );
    expect(feed).toContain(`<link href="${SITE_URL}/feed.xml" rel="self"`);
    expect(feed).toContain(`${SITE_URL}/news/update/`);
  });

  test("uses the deployment path in canonical and structured metadata", () => {
    const html = getSite().getOutput("about/index.html");
    expect(html).toContain(`content="${SITE_URL}/about/"`);
    expect(html).toContain(`${SITE_URL}/images/party.jpg`);
    expect(html).toContain(`"url": "${SITE_URL}"`);
    expect(html).not.toContain("cfa-static.example.com");
  });

  test("prefixes every redirect target exactly once", () => {
    const html = getSite().getOutput("old-about/index.html");
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/about/">`);
    expect(html).toContain(`location = "${PATH_PREFIX}about/"`);
    expect(html).toContain(`url=${PATH_PREFIX}about/`);
    expect(html).toContain(`href="${PATH_PREFIX}about/"`);
    expect(html).not.toContain("/project/project/");
  });
});
