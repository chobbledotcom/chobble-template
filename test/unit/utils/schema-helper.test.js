import { describe, expect, test } from "bun:test";
import { expectObjectProps } from "#test/test-utils.js";
import {
  createMockReview,
  createPostSchemaData,
  createProductSchemaData,
  createSchemaData,
} from "#test/unit/utils/schema-helper-utils.js";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildProductMeta,
} from "#utils/schema-helper.js";

// ----------------------------------------
// Curried test helpers to reduce duplication
// ----------------------------------------

/** Curried: (overrides) => buildBaseMeta result */
const baseMeta = (overrides = {}) => buildBaseMeta(createSchemaData(overrides));

/** Curried: (overrides) => buildProductMeta result */
const productMeta = (overrides = {}) =>
  buildProductMeta(createProductSchemaData(overrides));

/** Curried: (overrides) => buildPostMeta result */
const postMeta = (overrides = {}) =>
  buildPostMeta(createPostSchemaData(overrides));

/** Curried: (overrides) => buildOrganizationMeta result */
const orgMeta = (overrides = {}) =>
  buildOrganizationMeta(
    createSchemaData({ pageUrl: "/", title: "Home", ...overrides }),
  );

/** Curried: (price input) => stripped price string from offers */
const strippedPrice = (price) => productMeta({ price }).offers.price;

/** Build productMeta with mock reviews from specs */
const testProductMeta = (reviewSpecs) => {
  const mockReviews = reviewSpecs.map((spec) =>
    createMockReview({
      name: spec.name,
      rating: spec.rating,
      ...(spec.date && { date: new Date(spec.date) }),
    }),
  );
  return productMeta({ reviews: mockReviews, tags: ["products"] });
};

describe("buildBaseMeta", () => {
  test("returns basic meta with url, title, and description", () => {
    const result = baseMeta({
      pageUrl: "/test-page/",
      title: "Test Page",
      meta_description: "A test description",
    });
    expect(result.title).toBe("Test Page");
    expect(result.description).toBe("A test description");
    expect(result.url.includes("/test-page/")).toBe(true);
  });

  test("uses subtitle as description when meta_description is not provided", () => {
    expect(baseMeta({ subtitle: "A subtitle" }).description).toBe("A subtitle");
  });

  test("includes image from header_image", () => {
    const result = baseMeta({ header_image: "test-image.jpg" });
    expect(result.image).toBeTruthy();
    expect(result.image.src.includes("test-image.jpg")).toBe(true);
  });

  test("includes image from image field when header_image is not provided", () => {
    const result = baseMeta({ image: "fallback-image.jpg" });
    expect(result.image).toBeTruthy();
    expect(result.image.src.includes("fallback-image.jpg")).toBe(true);
  });

  test("handles absolute URL images (http://)", () => {
    expect(
      baseMeta({ header_image: "http://other.com/image.jpg" }).image.src,
    ).toBe("http://other.com/image.jpg");
  });

  test("handles absolute URL images (https://)", () => {
    expect(
      baseMeta({ header_image: "https://other.com/image.jpg" }).image.src,
    ).toBe("https://other.com/image.jpg");
  });

  test("handles images with leading slash", () => {
    expect(baseMeta({ header_image: "/images/photo.jpg" }).image.src).toBe(
      "https://example.com/images/photo.jpg",
    );
  });

  test("prepends /images/ for plain image filenames", () => {
    expect(baseMeta({ header_image: "photo.jpg" }).image.src).toBe(
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

describe("buildProductMeta", () => {
  test("returns product meta with name and brand", () => {
    expectObjectProps({
      name: "Test Product",
      brand: "Test Store",
    })(productMeta());
  });

  test("includes offers when price is provided", () => {
    const result = productMeta({ price: "29.99" });
    expect(result.offers).toBeTruthy();
    expect(result.offers.price).toBe("29.99");
    expect(result.offers.priceCurrency).toBe("GBP");
    expect(result.offers.availability).toBe("https://schema.org/InStock");
    expect(result.offers.priceValidUntil).toBeTruthy();
  });

  test("strips currency symbols from price", () => {
    expect(strippedPrice("£29.99")).toBe("29.99");
  });

  test("strips dollar sign from price", () => {
    expect(strippedPrice("$49.99")).toBe("49.99");
  });

  test("strips euro sign from price", () => {
    expect(strippedPrice("€39.99")).toBe("39.99");
  });

  test("strips commas from price", () => {
    expect(strippedPrice("1,299.99")).toBe("1299.99");
  });

  test("does not include offers when price is not provided", () => {
    expect(productMeta().offers).toBeUndefined();
  });

  test("includes reviews and rating when tags and collections.reviews are provided", () => {
    const result = testProductMeta([
      { name: "Reviewer 1", rating: 5 },
      { name: "Reviewer 2", rating: 4, date: "2024-02-20" },
    ]);
    expect(result.reviews).toBeTruthy();
    expect(result.reviews.length).toBe(2);
    expect(result.rating).toBeTruthy();
    expect(result.rating.reviewCount).toBe(2);
    expect(result.rating.bestRating).toBe(5);
    expect(result.rating.worstRating).toBe(1);
  });

  test("calculates correct average rating", () => {
    const result = testProductMeta([
      { name: "Reviewer 1", rating: 5 },
      { name: "Reviewer 2", rating: 3, date: "2024-02-20" },
    ]);
    expect(result.rating.ratingValue).toBe("4.0");
  });

  test("formats review with author and rating", () => {
    const result = testProductMeta([
      { name: "John Doe", rating: 5, date: "2024-06-15" },
    ]);
    expect(result.reviews[0].author).toBe("John Doe");
    expect(result.reviews[0].rating).toBe(5);
    expect(result.reviews[0].date).toBe("2024-06-15");
  });

  test("defaults review rating to 5 when not specified", () => {
    const result = productMeta({
      reviews: [
        {
          data: { name: "Reviewer", products: ["test"] },
          date: new Date("2024-01-15"),
        },
      ],
      tags: ["products"],
    });
    expect(result.reviews[0].rating).toBe(5);
  });

  test("does not include reviews and rating when no matching reviews", () => {
    const result = productMeta({
      reviews: [
        createMockReview({ name: "Reviewer", items: ["other-product"] }),
      ],
      tags: ["products"],
    });
    expect(result.reviews).toBeUndefined();
    expect(result.rating).toBeUndefined();
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

  test("includes datePublished from page.date", () => {
    expect(postMeta().datePublished).toBe("2024-03-15");
  });

  test("includes publisher with name and logo", () => {
    const result = postMeta({ siteLogo: "/custom-logo.png" });
    expect(result.publisher).toBeTruthy();
    expect(result.publisher.name).toBe("Test Site");
    expect(result.publisher.logo).toBeTruthy();
    expect(result.publisher.logo.src.includes("custom-logo.png")).toBe(true);
    expect(result.publisher.logo.width).toBe(512);
    expect(result.publisher.logo.height).toBe(512);
  });

  test("uses default logo path when site.logo not provided", () => {
    expect(postMeta().publisher.logo.src.includes("/images/logo.png")).toBe(
      true,
    );
  });

  test("does not include datePublished when page.date is not provided", () => {
    expect(postMeta({ date: null }).datePublished).toBeUndefined();
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
