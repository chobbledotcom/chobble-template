import assert from "node:assert";
import { describe, it } from "node:test";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildProductMeta,
} from "#utils/schema-helper.js";

describe("buildBaseMeta", () => {
  it("returns basic meta with url, title, and description", () => {
    const data = {
      page: { url: "/test-page/" },
      title: "Test Page",
      meta_description: "A test description",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.title,
      "Test Page",
      "should set title from data.title",
    );
    assert.strictEqual(
      result.description,
      "A test description",
      "should set description from meta_description",
    );
    assert.ok(
      result.url.includes("/test-page/"),
      "should include page URL path",
    );
  });

  it("uses meta_title when title is not provided", () => {
    const data = {
      page: { url: "/page/" },
      meta_title: "Meta Title",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.title,
      "Meta Title",
      "should fall back to meta_title when title is missing",
    );
  });

  it("falls back to Untitled when no title or meta_title", () => {
    const data = {
      page: { url: "/page/" },
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.title,
      "Untitled",
      "should default to 'Untitled' when no title available",
    );
  });

  it("uses subtitle as description when meta_description is not provided", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      subtitle: "A subtitle",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.description,
      "A subtitle",
      "should use subtitle as description fallback",
    );
  });

  it("includes image from header_image", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      header_image: "test-image.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.ok(result.image, "should include image object");
    assert.ok(
      result.image.src.includes("test-image.jpg"),
      "should include header_image in src",
    );
  });

  it("includes image from image field when header_image is not provided", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      image: "fallback-image.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.ok(result.image, "should include image object from fallback");
    assert.ok(
      result.image.src.includes("fallback-image.jpg"),
      "should use image field when header_image missing",
    );
  });

  it("handles absolute URL images (http://)", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      header_image: "http://other.com/image.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.image.src,
      "http://other.com/image.jpg",
      "should preserve http:// absolute URLs",
    );
  });

  it("handles absolute URL images (https://)", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      header_image: "https://other.com/image.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.image.src,
      "https://other.com/image.jpg",
      "should preserve https:// absolute URLs",
    );
  });

  it("handles images with leading slash", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      header_image: "/images/photo.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.image.src,
      "https://example.com/images/photo.jpg",
      "should prepend site URL to images with leading slash",
    );
  });

  it("prepends /images/ for plain image filenames", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      header_image: "photo.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.image.src,
      "https://example.com/images/photo.jpg",
      "should prepend /images/ path for plain filenames",
    );
  });

  it("does not include image when none provided", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.image,
      undefined,
      "should not include image when none provided",
    );
  });

  it("includes FAQs when provided", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      faqs: [
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "A2" },
      ],
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.deepStrictEqual(
      result.faq,
      data.faqs,
      "should include FAQs array in result",
    );
  });

  it("does not include empty FAQs array", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      faqs: [],
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.faq,
      undefined,
      "should not include empty FAQs array",
    );
  });

  it("preserves metaComputed properties", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      metaComputed: {
        customField: "custom value",
        anotherField: 123,
      },
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(
      result.customField,
      "custom value",
      "should preserve customField from metaComputed",
    );
    assert.strictEqual(
      result.anotherField,
      123,
      "should preserve anotherField from metaComputed",
    );
  });
});

describe("buildProductMeta", () => {
  it("returns product meta with name and brand", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(
      result.name,
      "Test Product",
      "should set product name from title",
    );
    assert.strictEqual(
      result.brand,
      "Test Store",
      "should set brand from site name",
    );
  });

  it("includes offers when price is provided", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "29.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.ok(
      result.offers,
      "should include offers object when price provided",
    );
    assert.strictEqual(result.offers.price, "29.99", "should set offer price");
    assert.strictEqual(
      result.offers.priceCurrency,
      "GBP",
      "should default to GBP currency",
    );
    assert.strictEqual(
      result.offers.availability,
      "https://schema.org/InStock",
      "should set availability to InStock",
    );
    assert.ok(result.offers.priceValidUntil, "should include priceValidUntil");
  });

  it("strips currency symbols from price", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "£29.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(
      result.offers.price,
      "29.99",
      "should strip pound sign from price",
    );
  });

  it("strips dollar sign from price", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "$49.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(
      result.offers.price,
      "49.99",
      "should strip dollar sign from price",
    );
  });

  it("strips euro sign from price", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "€39.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(
      result.offers.price,
      "39.99",
      "should strip euro sign from price",
    );
  });

  it("strips commas from price", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "1,299.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(
      result.offers.price,
      "1299.99",
      "should strip commas from price",
    );
  });

  it("does not include offers when price is not provided", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(
      result.offers,
      undefined,
      "should not include offers without price",
    );
  });

  it("includes reviews and rating when reviewsField and collections.reviews are provided", () => {
    const mockReviews = [
      {
        data: { name: "Reviewer 1", rating: 5, products: ["test"] },
        date: new Date("2024-01-15"),
      },
      {
        data: { name: "Reviewer 2", rating: 4, products: ["test"] },
        date: new Date("2024-02-20"),
      },
    ];

    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      site: { url: "https://example.com", name: "Test Store" },
      collections: { reviews: mockReviews },
      reviewsField: "products",
    };

    const result = buildProductMeta(data);

    assert.ok(result.reviews, "should include reviews array");
    assert.strictEqual(
      result.reviews.length,
      2,
      "should include all matching reviews",
    );
    assert.ok(result.rating, "should include rating object");
    assert.strictEqual(
      result.rating.reviewCount,
      2,
      "should set correct review count",
    );
    assert.strictEqual(
      result.rating.bestRating,
      5,
      "should set bestRating to 5",
    );
    assert.strictEqual(
      result.rating.worstRating,
      1,
      "should set worstRating to 1",
    );
  });

  it("calculates correct average rating", () => {
    const mockReviews = [
      {
        data: { name: "Reviewer 1", rating: 5, products: ["test"] },
        date: new Date("2024-01-15"),
      },
      {
        data: { name: "Reviewer 2", rating: 3, products: ["test"] },
        date: new Date("2024-02-20"),
      },
    ];

    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      site: { url: "https://example.com", name: "Test Store" },
      collections: { reviews: mockReviews },
      reviewsField: "products",
    };

    const result = buildProductMeta(data);

    // Average of 5 and 3 is 4.0
    assert.strictEqual(
      result.rating.ratingValue,
      "4.0",
      "should calculate average rating as 4.0",
    );
  });

  it("formats review with author and rating", () => {
    const mockReviews = [
      {
        data: { name: "John Doe", rating: 5, products: ["test"] },
        date: new Date("2024-06-15"),
      },
    ];

    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      site: { url: "https://example.com", name: "Test Store" },
      collections: { reviews: mockReviews },
      reviewsField: "products",
    };

    const result = buildProductMeta(data);

    assert.strictEqual(
      result.reviews[0].author,
      "John Doe",
      "should set review author name",
    );
    assert.strictEqual(result.reviews[0].rating, 5, "should set review rating");
    assert.strictEqual(
      result.reviews[0].date,
      "2024-06-15",
      "should format review date as YYYY-MM-DD",
    );
  });

  it("defaults review rating to 5 when not specified", () => {
    const mockReviews = [
      {
        data: { name: "Reviewer", products: ["test"] },
        date: new Date("2024-01-15"),
      },
    ];

    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      site: { url: "https://example.com", name: "Test Store" },
      collections: { reviews: mockReviews },
      reviewsField: "products",
    };

    const result = buildProductMeta(data);

    assert.strictEqual(
      result.reviews[0].rating,
      5,
      "should default rating to 5 when missing",
    );
  });

  it("does not include reviews and rating when no matching reviews", () => {
    const mockReviews = [
      {
        data: { name: "Reviewer", rating: 5, products: ["other-product"] },
        date: new Date("2024-01-15"),
      },
    ];

    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      site: { url: "https://example.com", name: "Test Store" },
      collections: { reviews: mockReviews },
      reviewsField: "products",
    };

    const result = buildProductMeta(data);

    assert.strictEqual(
      result.reviews,
      undefined,
      "should not include reviews when none match",
    );
    assert.strictEqual(
      result.rating,
      undefined,
      "should not include rating when no reviews match",
    );
  });
});

describe("buildPostMeta", () => {
  it("returns post meta with author", () => {
    const data = {
      page: { url: "/news/test-post/", date: new Date("2024-03-15") },
      title: "Test Post",
      author: "John Author",
      site: { url: "https://example.com", name: "Test Site" },
    };

    const result = buildPostMeta(data);

    assert.ok(result.author, "should include author object");
    assert.strictEqual(
      result.author.name,
      "John Author",
      "should set author name from data",
    );
  });

  it("uses site name as author when author not provided", () => {
    const data = {
      page: { url: "/news/test-post/", date: new Date("2024-03-15") },
      title: "Test Post",
      site: { url: "https://example.com", name: "Test Site" },
    };

    const result = buildPostMeta(data);

    assert.strictEqual(
      result.author.name,
      "Test Site",
      "should fall back to site name when author not provided",
    );
  });

  it("includes datePublished from page.date", () => {
    const data = {
      page: { url: "/news/test-post/", date: new Date("2024-03-15") },
      title: "Test Post",
      site: { url: "https://example.com", name: "Test Site" },
    };

    const result = buildPostMeta(data);

    assert.strictEqual(
      result.datePublished,
      "2024-03-15",
      "should format datePublished as YYYY-MM-DD",
    );
  });

  it("includes publisher with name and logo", () => {
    const data = {
      page: { url: "/news/test-post/", date: new Date("2024-03-15") },
      title: "Test Post",
      site: {
        url: "https://example.com",
        name: "Test Site",
        logo: "/custom-logo.png",
      },
    };

    const result = buildPostMeta(data);

    assert.ok(result.publisher, "should include publisher object");
    assert.strictEqual(
      result.publisher.name,
      "Test Site",
      "should set publisher name from site",
    );
    assert.ok(result.publisher.logo, "should include publisher logo");
    assert.ok(
      result.publisher.logo.src.includes("custom-logo.png"),
      "should use custom logo from site",
    );
    assert.strictEqual(
      result.publisher.logo.width,
      512,
      "should set logo width to 512",
    );
    assert.strictEqual(
      result.publisher.logo.height,
      512,
      "should set logo height to 512",
    );
  });

  it("uses default logo path when site.logo not provided", () => {
    const data = {
      page: { url: "/news/test-post/", date: new Date("2024-03-15") },
      title: "Test Post",
      site: { url: "https://example.com", name: "Test Site" },
    };

    const result = buildPostMeta(data);

    assert.ok(
      result.publisher.logo.src.includes("/images/logo.png"),
      "should default to /images/logo.png",
    );
  });

  it("does not include datePublished when page.date is not provided", () => {
    const data = {
      page: { url: "/news/test-post/" },
      title: "Test Post",
      site: { url: "https://example.com", name: "Test Site" },
    };

    const result = buildPostMeta(data);

    assert.strictEqual(
      result.datePublished,
      undefined,
      "should not include datePublished when page.date missing",
    );
  });
});

describe("buildOrganizationMeta", () => {
  it("returns organization meta with base properties", () => {
    const data = {
      page: { url: "/" },
      title: "Home",
      site: { url: "https://example.com", name: "Test Organization" },
    };

    const result = buildOrganizationMeta(data);

    assert.strictEqual(result.title, "Home", "should include title in result");
    assert.ok(result.url, "should include url in result");
  });

  it("includes organization from metaComputed when available", () => {
    const data = {
      page: { url: "/" },
      title: "Home",
      site: { url: "https://example.com", name: "Test Organization" },
      metaComputed: {
        organization: {
          name: "Test Org",
          telephone: "+1234567890",
          address: { streetAddress: "123 Main St" },
        },
      },
    };

    const result = buildOrganizationMeta(data);

    assert.ok(
      result.organization,
      "should include organization object from metaComputed",
    );
    assert.strictEqual(
      result.organization.name,
      "Test Org",
      "should set organization name",
    );
    assert.strictEqual(
      result.organization.telephone,
      "+1234567890",
      "should set organization telephone",
    );
  });

  it("does not include organization when metaComputed.organization is not set", () => {
    const data = {
      page: { url: "/" },
      title: "Home",
      site: { url: "https://example.com", name: "Test Organization" },
      metaComputed: {},
    };

    const result = buildOrganizationMeta(data);

    assert.strictEqual(
      result.organization,
      undefined,
      "should not include organization when empty metaComputed",
    );
  });

  it("does not include organization when metaComputed is not set", () => {
    const data = {
      page: { url: "/" },
      title: "Home",
      site: { url: "https://example.com", name: "Test Organization" },
    };

    const result = buildOrganizationMeta(data);

    assert.strictEqual(
      result.organization,
      undefined,
      "should not include organization when no metaComputed",
    );
  });
});
