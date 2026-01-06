import { describe, expect, test } from "bun:test";
import {
  createMockReview,
  createPostSchemaData,
  createProductSchemaData,
  createSchemaData,
} from "#test/test-utils.js";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildProductMeta,
} from "#utils/schema-helper.js";

describe("buildBaseMeta", () => {
  test("returns basic meta with url, title, and description", () => {
    const data = createSchemaData({
      pageUrl: "/test-page/",
      title: "Test Page",
      meta_description: "A test description",
    });

    const result = buildBaseMeta(data);

    expect(result.title).toBe("Test Page");
    expect(result.description).toBe("A test description");
    expect(result.url.includes("/test-page/")).toBe(true);
  });

  test("uses meta_title when title is not provided", () => {
    const data = createSchemaData({
      title: undefined,
      meta_title: "Meta Title",
    });

    const result = buildBaseMeta(data);

    expect(result.title).toBe("Meta Title");
  });

  test("falls back to Untitled when no title or meta_title", () => {
    const data = createSchemaData({ title: undefined });

    const result = buildBaseMeta(data);

    expect(result.title).toBe("Untitled");
  });

  test("uses subtitle as description when meta_description is not provided", () => {
    const data = createSchemaData({ subtitle: "A subtitle" });

    const result = buildBaseMeta(data);

    expect(result.description).toBe("A subtitle");
  });

  test("includes image from header_image", () => {
    const data = createSchemaData({ header_image: "test-image.jpg" });

    const result = buildBaseMeta(data);

    expect(result.image).toBeTruthy();
    expect(result.image.src.includes("test-image.jpg")).toBe(true);
  });

  test("includes image from image field when header_image is not provided", () => {
    const data = createSchemaData({ image: "fallback-image.jpg" });

    const result = buildBaseMeta(data);

    expect(result.image).toBeTruthy();
    expect(result.image.src.includes("fallback-image.jpg")).toBe(true);
  });

  test("handles absolute URL images (http://)", () => {
    const data = createSchemaData({
      header_image: "http://other.com/image.jpg",
    });

    const result = buildBaseMeta(data);

    expect(result.image.src).toBe("http://other.com/image.jpg");
  });

  test("handles absolute URL images (https://)", () => {
    const data = createSchemaData({
      header_image: "https://other.com/image.jpg",
    });

    const result = buildBaseMeta(data);

    expect(result.image.src).toBe("https://other.com/image.jpg");
  });

  test("handles images with leading slash", () => {
    const data = createSchemaData({ header_image: "/images/photo.jpg" });

    const result = buildBaseMeta(data);

    expect(result.image.src).toBe("https://example.com/images/photo.jpg");
  });

  test("prepends /images/ for plain image filenames", () => {
    const data = createSchemaData({ header_image: "photo.jpg" });

    const result = buildBaseMeta(data);

    expect(result.image.src).toBe("https://example.com/images/photo.jpg");
  });

  test("does not include image when none provided", () => {
    const data = createSchemaData();

    const result = buildBaseMeta(data);

    expect(result.image).toBeUndefined();
  });

  test("includes FAQs when provided", () => {
    const faqs = [
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ];
    const data = createSchemaData({ faqs });

    const result = buildBaseMeta(data);

    expect(result.faq).toEqual(faqs);
  });

  test("does not include empty FAQs array", () => {
    const data = createSchemaData({ faqs: [] });

    const result = buildBaseMeta(data);

    expect(result.faq).toBeUndefined();
  });

  test("preserves metaComputed properties", () => {
    const data = createSchemaData({
      metaComputed: { customField: "custom value", anotherField: 123 },
    });

    const result = buildBaseMeta(data);

    expect(result.customField).toBe("custom value");
    expect(result.anotherField).toBe(123);
  });
});

describe("buildProductMeta", () => {
  test("returns product meta with name and brand", () => {
    const data = createProductSchemaData();

    const result = buildProductMeta(data);

    expect(result.name).toBe("Test Product");
    expect(result.brand).toBe("Test Store");
  });

  test("includes offers when price is provided", () => {
    const data = createProductSchemaData({ price: "29.99" });

    const result = buildProductMeta(data);

    expect(result.offers).toBeTruthy();
    expect(result.offers.price).toBe("29.99");
    expect(result.offers.priceCurrency).toBe("GBP");
    expect(result.offers.availability).toBe("https://schema.org/InStock");
    expect(result.offers.priceValidUntil).toBeTruthy();
  });

  test("strips currency symbols from price", () => {
    const data = createProductSchemaData({ price: "£29.99" });

    const result = buildProductMeta(data);

    expect(result.offers.price).toBe("29.99");
  });

  test("strips dollar sign from price", () => {
    const data = createProductSchemaData({ price: "$49.99" });

    const result = buildProductMeta(data);

    expect(result.offers.price).toBe("49.99");
  });

  test("strips euro sign from price", () => {
    const data = createProductSchemaData({ price: "€39.99" });

    const result = buildProductMeta(data);

    expect(result.offers.price).toBe("39.99");
  });

  test("strips commas from price", () => {
    const data = createProductSchemaData({ price: "1,299.99" });

    const result = buildProductMeta(data);

    expect(result.offers.price).toBe("1299.99");
  });

  test("does not include offers when price is not provided", () => {
    const data = createProductSchemaData();

    const result = buildProductMeta(data);

    expect(result.offers).toBeUndefined();
  });

  test("includes reviews and rating when reviewsField and collections.reviews are provided", () => {
    const mockReviews = [
      createMockReview({ name: "Reviewer 1", rating: 5 }),
      createMockReview({
        name: "Reviewer 2",
        rating: 4,
        date: new Date("2024-02-20"),
      }),
    ];
    const data = createProductSchemaData({
      reviews: mockReviews,
      reviewsField: "products",
    });

    const result = buildProductMeta(data);

    expect(result.reviews).toBeTruthy();
    expect(result.reviews.length).toBe(2);
    expect(result.rating).toBeTruthy();
    expect(result.rating.reviewCount).toBe(2);
    expect(result.rating.bestRating).toBe(5);
    expect(result.rating.worstRating).toBe(1);
  });

  test("calculates correct average rating", () => {
    const mockReviews = [
      createMockReview({ name: "Reviewer 1", rating: 5 }),
      createMockReview({
        name: "Reviewer 2",
        rating: 3,
        date: new Date("2024-02-20"),
      }),
    ];
    const data = createProductSchemaData({
      reviews: mockReviews,
      reviewsField: "products",
    });

    const result = buildProductMeta(data);

    expect(result.rating.ratingValue).toBe("4.0");
  });

  test("formats review with author and rating", () => {
    const mockReviews = [
      createMockReview({
        name: "John Doe",
        rating: 5,
        date: new Date("2024-06-15"),
      }),
    ];
    const data = createProductSchemaData({
      reviews: mockReviews,
      reviewsField: "products",
    });

    const result = buildProductMeta(data);

    expect(result.reviews[0].author).toBe("John Doe");
    expect(result.reviews[0].rating).toBe(5);
    expect(result.reviews[0].date).toBe("2024-06-15");
  });

  test("defaults review rating to 5 when not specified", () => {
    const mockReviews = [
      {
        data: { name: "Reviewer", products: ["test"] },
        date: new Date("2024-01-15"),
      },
    ];
    const data = createProductSchemaData({
      reviews: mockReviews,
      reviewsField: "products",
    });

    const result = buildProductMeta(data);

    expect(result.reviews[0].rating).toBe(5);
  });

  test("does not include reviews and rating when no matching reviews", () => {
    const mockReviews = [
      createMockReview({ name: "Reviewer", items: ["other-product"] }),
    ];
    const data = createProductSchemaData({
      reviews: mockReviews,
      reviewsField: "products",
    });

    const result = buildProductMeta(data);

    expect(result.reviews).toBeUndefined();
    expect(result.rating).toBeUndefined();
  });
});

describe("buildPostMeta", () => {
  test("returns post meta with author", () => {
    const data = createPostSchemaData({ author: "John Author" });

    const result = buildPostMeta(data);

    expect(result.author).toBeTruthy();
    expect(result.author.name).toBe("John Author");
  });

  test("uses site name as author when author not provided", () => {
    const data = createPostSchemaData();

    const result = buildPostMeta(data);

    expect(result.author.name).toBe("Test Site");
  });

  test("includes datePublished from page.date", () => {
    const data = createPostSchemaData();

    const result = buildPostMeta(data);

    expect(result.datePublished).toBe("2024-03-15");
  });

  test("includes publisher with name and logo", () => {
    const data = createPostSchemaData({ siteLogo: "/custom-logo.png" });

    const result = buildPostMeta(data);

    expect(result.publisher).toBeTruthy();
    expect(result.publisher.name).toBe("Test Site");
    expect(result.publisher.logo).toBeTruthy();
    expect(result.publisher.logo.src.includes("custom-logo.png")).toBe(true);
    expect(result.publisher.logo.width).toBe(512);
    expect(result.publisher.logo.height).toBe(512);
  });

  test("uses default logo path when site.logo not provided", () => {
    const data = createPostSchemaData();

    const result = buildPostMeta(data);

    expect(result.publisher.logo.src.includes("/images/logo.png")).toBe(true);
  });

  test("does not include datePublished when page.date is not provided", () => {
    const data = createPostSchemaData({ date: null });

    const result = buildPostMeta(data);

    expect(result.datePublished).toBeUndefined();
  });
});

describe("buildOrganizationMeta", () => {
  test("returns organization meta with base properties", () => {
    const data = createSchemaData({
      pageUrl: "/",
      title: "Home",
      siteName: "Test Organization",
    });

    const result = buildOrganizationMeta(data);

    expect(result.title).toBe("Home");
    expect(result.url).toBeTruthy();
  });

  test("includes organization from metaComputed when available", () => {
    const data = createSchemaData({
      pageUrl: "/",
      title: "Home",
      siteName: "Test Organization",
      metaComputed: {
        organization: {
          name: "Test Org",
          telephone: "+1234567890",
          address: { streetAddress: "123 Main St" },
        },
      },
    });

    const result = buildOrganizationMeta(data);

    expect(result.organization).toBeTruthy();
    expect(result.organization.name).toBe("Test Org");
    expect(result.organization.telephone).toBe("+1234567890");
  });

  test("does not include organization when metaComputed.organization is not set", () => {
    const data = createSchemaData({
      pageUrl: "/",
      title: "Home",
      siteName: "Test Organization",
      metaComputed: {},
    });

    const result = buildOrganizationMeta(data);

    expect(result.organization).toBeUndefined();
  });

  test("does not include organization when metaComputed is not set", () => {
    const data = createSchemaData({
      pageUrl: "/",
      title: "Home",
      siteName: "Test Organization",
    });

    const result = buildOrganizationMeta(data);

    expect(result.organization).toBeUndefined();
  });
});
