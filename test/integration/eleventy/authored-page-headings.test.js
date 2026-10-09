import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";
import { describe, expect, test } from "vitest";
import { ROOT_DIR } from "#lib/paths.js";
import { useSharedSite } from "#test/test-site-factory.js";
import { getFiles } from "#test/test-utils.js";

const files = getFiles(
  /^src\/(pages|news|guide-pages|guide-categories|snippets)\/.*\.md$/,
)
  .filter((path) => !/\/README\.md$/i.test(path))
  .map((path) => {
    const { data, content } = matter(
      readFileSync(join(ROOT_DIR, path), "utf8"),
    );
    return { path: path.slice("src/".length), frontmatter: data, content };
  })
  // Snippets are nonpublishing resources, not pages to test in isolation.
  .filter(
    ({ path, frontmatter }) =>
      path.startsWith("snippets/") || frontmatter.permalink !== false,
  );

// Let Eleventy resolve gallery URLs, including its default output paths.
const galleryIndex = {
  path: "heading-gallery-urls.html",
  frontmatter: {
    layout: false,
    permalink: "heading-gallery-urls.txt",
    eleventyExcludeFromCollections: true,
  },
  content:
    "{% for entry in collections.all %}{% if entry.data.block_gallery %}{{ entry.url }}\n{% endif %}{% endfor %}",
};

// The factory's byte-preserving copier keeps downloads alongside images.
const resources = getFiles(/^src\/(images|files)\//).map((path) => ({
  src: path,
  dest: relative("src/images", path),
}));

const authoredHeadingViolations = async (site) => {
  const galleryUrls = site
    .getOutput(galleryIndex.frontmatter.permalink)
    .split("\n");
  const outputs = site
    .listOutputFiles()
    .filter((path) => path.endsWith(".html"));
  expect(outputs.length).toBeGreaterThan(0);
  return (
    await Promise.all(
      outputs.map(async (output) => {
        if (
          galleryUrls.includes(`/${output.replace(/(^|\/)index\.html$/, "$1")}`)
        )
          return [];
        const doc = await site.getDoc(output);
        const refresh = doc.querySelector('meta[http-equiv="refresh" i]');
        // A generated redirect has an immediate refresh, a canonical destination,
        // and no main region. Missing main alone must still fail this checker.
        if (
          !doc.querySelector("main") &&
          doc.querySelector('link[rel="canonical"]') &&
          /^\s*0\s*;\s*url\s*=\s*\S/i.test(refresh?.getAttribute("content"))
        )
          return [];
        const headings = [...doc.querySelectorAll("main h1")];
        return headings.length === 1
          ? []
          : [
              {
                output,
                h1Count: headings.length,
                headings: headings.map((heading) => heading.textContent.trim()),
              },
            ];
      }),
    )
  ).flat();
};

describe("authored page headings", () => {
  const getSite = useSharedSite({
    files: files.concat(galleryIndex),
    images: resources,
  });

  test("published authored pages render exactly one main H1", async () => {
    expect(files.some(({ path }) => !path.startsWith("snippets/"))).toBe(true);
    expect(await authoredHeadingViolations(getSite())).toEqual([]);
    // Parses every page the site publishes, and a fork publishes more of
    // them than the demo content; under the full suite's parallel lanes that
    // exceeds the default timeout.
  }, 5000);
});

// The block gallery renders the schema examples: the downloads example links
// a file and the snippet example references a "demo" snippet. Both come from
// fixtures, not from content the site may have deleted.
const galleryResources = [
  {
    src: "test/fixtures/files/template-overview.txt",
    dest: "../files/template-overview.txt",
  },
];

describe("authored heading output selection", () => {
  const getSite = useSharedSite({
    images: galleryResources,
    files: [
      galleryIndex,
      {
        path: "snippets/demo.md",
        frontmatter: {
          name: "Demo Snippet",
          blocks: [{ type: "markdown", content: "From a snippet." }],
        },
      },
      {
        path: "guide-categories/heading-context.md",
        frontmatter: {
          name: "Heading context",
          blocks: [{ type: "guide-header" }],
        },
      },
      {
        path: "pages/heading-target.md",
        frontmatter: {
          name: "Heading target",
          permalink: "/heading-target/",
          redirect_from: "/previous-heading-target/",
          layout: false,
        },
        content: "## Not a main heading",
      },
      {
        path: "pages/preview-catalogue.md",
        frontmatter: { name: "Preview catalogue", block_gallery: true },
      },
    ],
  });

  test("excludes rendered redirects without excluding ordinary heading failures", async () => {
    expect(getSite().listOutputFiles()).toContain(
      "previous-heading-target/index.html",
    );
    expect(await authoredHeadingViolations(getSite())).toEqual([
      { output: "heading-target/index.html", h1Count: 0, headings: [] },
    ]);
  });

  test("resolves a gallery without an explicit permalink", async () => {
    const galleryUrl = getSite()
      .getOutput(galleryIndex.frontmatter.permalink)
      .trim();
    expect(galleryUrl).not.toBe("");
    const doc = await getSite().getDoc(`${galleryUrl}index.html`);
    expect(doc.querySelectorAll("main h1").length).toBeGreaterThan(1);
    expect(await authoredHeadingViolations(getSite())).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ output: `${galleryUrl.slice(1)}index.html` }),
      ]),
    );
  });
});
