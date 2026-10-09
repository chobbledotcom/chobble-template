import { describe, expect, test } from "vitest";
import siteData from "#data/site.json" with { type: "json" };
import { expectObjectProps } from "#test/test-utils.js";
import {
  createPostSchemaData,
  createSchemaData,
} from "#test/unit/utils/schema-helper-utils.js";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildSocialMeta,
} from "#utils/schema-helper.js";

// ----------------------------------------
// Curried test helpers to reduce duplication
// ----------------------------------------

/** Curried: (overrides) => buildBaseMeta result */
const baseMeta = (overrides = {}) => buildBaseMeta(createSchemaData(overrides));

/** Curried: (overrides) => buildPostMeta result */
const postMeta = (overrides = {}) =>
  buildPostMeta(createPostSchemaData(overrides));

/** Curried: (overrides) => buildOrganizationMeta result */
const orgMeta = (overrides = {}) =>
  buildOrganizationMeta(
    createSchemaData({ pageUrl: "/", name: "Home", ...overrides }),
  );

describe("buildBaseMeta", () => {
  test("returns basic meta with url, title, and description", () => {
    const result = baseMeta({
      pageUrl: "/test-page/",
      name: "Test Page",
      meta_description: "A test description",
    });
    expect(result.title).toBe("Test Page");
    expect(result.description).toBe("A test description");
    expect(result.url.includes("/test-page/")).toBe(true);
  });

  test("uses subtitle as description when meta_description is not provided", () => {
    expect(baseMeta({ subtitle: "A subtitle" }).description).toBe("A subtitle");
  });

  test("includes image from image field", () => {
    const result = baseMeta({ image: "fallback-image.jpg" });
    expect(result.image).toBeTruthy();
    expect(result.image.src.includes("fallback-image.jpg")).toBe(true);
  });

  test("uses computed thumbnail before a hero image", () => {
    const result = baseMeta({
      thumbnail: "thumbnail.jpg",
      blocks: [{ type: "image-background", image: "hero.jpg" }],
    });
    expect(result.image.src).toBe("https://example.com/images/thumbnail.jpg");
  });

  test("uses a hero image when the page has no image or thumbnail", () => {
    const result = baseMeta({
      blocks: [{ type: "hero", image: "hero.jpg" }],
    });
    expect(result.image.src).toBe("https://example.com/images/hero.jpg");
  });

  test("ignores data images in metadata", () => {
    expect(
      baseMeta({ image: "data:image/png;base64,abc" }).image,
    ).toBeUndefined();
  });

  test("handles absolute URL images (http://)", () => {
    expect(baseMeta({ image: "http://other.com/image.jpg" }).image.src).toBe(
      "http://other.com/image.jpg",
    );
  });

  test("handles absolute URL images (https://)", () => {
    expect(baseMeta({ image: "https://other.com/image.jpg" }).image.src).toBe(
      "https://other.com/image.jpg",
    );
  });

  test("handles images with leading slash", () => {
    expect(baseMeta({ image: "/images/photo.jpg" }).image.src).toBe(
      "https://example.com/images/photo.jpg",
    );
  });

  test("preserves the site path when resolving local metadata images", () => {
    expect(
      baseMeta({
        image: "/images/photo.jpg",
        siteUrl: "https://example.com/project",
      }).image.src,
    ).toBe("https://example.com/project/images/photo.jpg");
  });

  test("prepends /images/ for plain image filenames", () => {
    expect(baseMeta({ image: "photo.jpg" }).image.src).toBe(
      "https://example.com/images/photo.jpg",
    );
  });

  test("does not include image when none provided", () => {
    expect(baseMeta().image).toBeUndefined();
  });

  test("includes FAQs when provided", () => {
    const faqs = [
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ];
    expect(baseMeta({ faqs }).faq).toEqual(faqs);
  });

  test("uses FAQ block items instead of page-level fallback content", () => {
    const blockFaqs = [{ question: "Block question", answer: "Block answer" }];
    expect(
      baseMeta({
        faqs: [{ question: "Page question", answer: "Page answer" }],
        blocks: [{ type: "faqs", items: blockFaqs }],
      }).faq,
    ).toEqual(blockFaqs);
  });

  test("uses and deduplicates page FAQs for FAQ blocks without items", () => {
    const faqs = [{ question: "Question", answer: "Answer" }];
    expect(
      baseMeta({
        faqs,
        blocks: [{ type: "faqs" }, { type: "faqs" }],
      }).faq,
    ).toEqual(faqs);
  });

  test("does not include empty FAQs array", () => {
    expect(baseMeta({ faqs: [] }).faq).toBeUndefined();
  });

  test("preserves metaComputed properties", () => {
    expectObjectProps({
      customField: "custom value",
      anotherField: 123,
    })(
      baseMeta({
        metaComputed: { customField: "custom value", anotherField: 123 },
      }),
    );
  });
});

describe("buildPostMeta", () => {
  test("returns post meta with author", () => {
    const result = postMeta({ author: "John Author" });
    expect(result.author).toBeTruthy();
    expect(result.author.name).toBe("John Author");
  });

  test("uses site name as author when author not provided", () => {
    expect(postMeta().author.name).toBe("Test Site");
  });

  test("includes published from page.date", () => {
    expect(postMeta().published).toBe("2024-03-15");
  });

  test("does not include published when page.date is not provided", () => {
    expect(postMeta({ date: null }).published).toBeUndefined();
  });
});

describe("buildSocialMeta", () => {
  test("uses SEO title, canonical URL, description, image, and news type", () => {
    expect(
      buildSocialMeta(
        createSchemaData({
          name: "Page name",
          meta_title: "SEO title",
          meta_description: "Description",
          thumbnail: "/images/social.jpg",
          tags: ["news"],
        }),
      ),
    ).toEqual({
      title: "SEO title",
      description: "Description",
      url: `${siteData.url}/page/`,
      image: "https://example.com/images/social.jpg",
      type: "article",
    });
  });

  test("falls back to page title and ordinary website type", () => {
    expect(
      buildSocialMeta(
        createSchemaData({ name: undefined, title: "Legacy title" }),
      ),
    ).toEqual({
      title: "Legacy title",
      description: undefined,
      url: `${siteData.url}/page/`,
      type: "website",
    });
  });

  test("uses website type for pages that are not news", () => {
    expect(buildSocialMeta(createSchemaData({ tags: ["pages"] })).type).toBe(
      "website",
    );
  });
});

describe("buildOrganizationMeta", () => {
  test("returns organization meta with base properties", () => {
    const result = orgMeta({ siteName: "Test Organization" });
    expect(result.title).toBe("Home");
    expect(result.url).toBeTruthy();
  });

  test("includes organization from metaComputed when available", () => {
    const result = orgMeta({
      siteName: "Test Organization",
      metaComputed: {
        organization: {
          name: "Test Org",
          telephone: "+1234567890",
          address: { streetAddress: "123 Main St" },
        },
      },
    });
    expect(result.organization).toBeTruthy();
    expect(result.organization.name).toBe("Test Org");
    expect(result.organization.telephone).toBe("+1234567890");
  });

  test("does not include organization when metaComputed.organization is not set", () => {
    expect(
      orgMeta({ siteName: "Test Organization", metaComputed: {} }).organization,
    ).toBeUndefined();
  });

  test("does not include organization when metaComputed is not set", () => {
    expect(
      orgMeta({ siteName: "Test Organization" }).organization,
    ).toBeUndefined();
  });
});
