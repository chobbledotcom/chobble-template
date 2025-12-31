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

    assert.strictEqual(result.title, "Test Page");
    assert.strictEqual(result.description, "A test description");
    assert.ok(result.url.includes("/test-page/"));
  });

  it("uses meta_title when title is not provided", () => {
    const data = {
      page: { url: "/page/" },
      meta_title: "Meta Title",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(result.title, "Meta Title");
  });

  it("falls back to Untitled when no title or meta_title", () => {
    const data = {
      page: { url: "/page/" },
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(result.title, "Untitled");
  });

  it("uses subtitle as description when meta_description is not provided", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      subtitle: "A subtitle",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(result.description, "A subtitle");
  });

  it("includes image from header_image", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      header_image: "test-image.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.ok(result.image);
    assert.ok(result.image.src.includes("test-image.jpg"));
  });

  it("includes image from image field when header_image is not provided", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      image: "fallback-image.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.ok(result.image);
    assert.ok(result.image.src.includes("fallback-image.jpg"));
  });

  it("handles absolute URL images (http://)", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      header_image: "http://other.com/image.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(result.image.src, "http://other.com/image.jpg");
  });

  it("handles absolute URL images (https://)", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      header_image: "https://other.com/image.jpg",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(result.image.src, "https://other.com/image.jpg");
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
    );
  });

  it("does not include image when none provided", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(result.image, undefined);
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

    assert.deepStrictEqual(result.faq, data.faqs);
  });

  it("does not include empty FAQs array", () => {
    const data = {
      page: { url: "/page/" },
      title: "Test",
      faqs: [],
      site: { url: "https://example.com" },
    };

    const result = buildBaseMeta(data);

    assert.strictEqual(result.faq, undefined);
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

    assert.strictEqual(result.customField, "custom value");
    assert.strictEqual(result.anotherField, 123);
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

    assert.strictEqual(result.name, "Test Product");
    assert.strictEqual(result.brand, "Test Store");
  });

  it("includes offers when price is provided", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "29.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.ok(result.offers);
    assert.strictEqual(result.offers.price, "29.99");
    assert.strictEqual(result.offers.priceCurrency, "GBP");
    assert.strictEqual(
      result.offers.availability,
      "https://schema.org/InStock",
    );
    assert.ok(result.offers.priceValidUntil);
  });

  it("strips currency symbols from price", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "£29.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(result.offers.price, "29.99");
  });

  it("strips dollar sign from price", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "$49.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(result.offers.price, "49.99");
  });

  it("strips euro sign from price", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "€39.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(result.offers.price, "39.99");
  });

  it("strips commas from price", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      price: "1,299.99",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(result.offers.price, "1299.99");
  });

  it("does not include offers when price is not provided", () => {
    const data = {
      page: { url: "/products/test/", fileSlug: "test" },
      title: "Test Product",
      site: { url: "https://example.com", name: "Test Store" },
    };

    const result = buildProductMeta(data);

    assert.strictEqual(result.offers, undefined);
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

    assert.ok(result.reviews);
    assert.strictEqual(result.reviews.length, 2);
    assert.ok(result.rating);
    assert.strictEqual(result.rating.reviewCount, 2);
    assert.strictEqual(result.rating.bestRating, 5);
    assert.strictEqual(result.rating.worstRating, 1);
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
    assert.strictEqual(result.rating.ratingValue, "4.0");
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

    assert.strictEqual(result.reviews[0].author, "John Doe");
    assert.strictEqual(result.reviews[0].rating, 5);
    assert.strictEqual(result.reviews[0].date, "2024-06-15");
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

    assert.strictEqual(result.reviews[0].rating, 5);
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

    assert.strictEqual(result.reviews, undefined);
    assert.strictEqual(result.rating, undefined);
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

    assert.ok(result.author);
    assert.strictEqual(result.author.name, "John Author");
  });

  it("uses site name as author when author not provided", () => {
    const data = {
      page: { url: "/news/test-post/", date: new Date("2024-03-15") },
      title: "Test Post",
      site: { url: "https://example.com", name: "Test Site" },
    };

    const result = buildPostMeta(data);

    assert.strictEqual(result.author.name, "Test Site");
  });

  it("includes datePublished from page.date", () => {
    const data = {
      page: { url: "/news/test-post/", date: new Date("2024-03-15") },
      title: "Test Post",
      site: { url: "https://example.com", name: "Test Site" },
    };

    const result = buildPostMeta(data);

    assert.strictEqual(result.datePublished, "2024-03-15");
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

    assert.ok(result.publisher);
    assert.strictEqual(result.publisher.name, "Test Site");
    assert.ok(result.publisher.logo);
    assert.ok(result.publisher.logo.src.includes("custom-logo.png"));
    assert.strictEqual(result.publisher.logo.width, 512);
    assert.strictEqual(result.publisher.logo.height, 512);
  });

  it("uses default logo path when site.logo not provided", () => {
    const data = {
      page: { url: "/news/test-post/", date: new Date("2024-03-15") },
      title: "Test Post",
      site: { url: "https://example.com", name: "Test Site" },
    };

    const result = buildPostMeta(data);

    assert.ok(result.publisher.logo.src.includes("/images/logo.png"));
  });

  it("does not include datePublished when page.date is not provided", () => {
    const data = {
      page: { url: "/news/test-post/" },
      title: "Test Post",
      site: { url: "https://example.com", name: "Test Site" },
    };

    const result = buildPostMeta(data);

    assert.strictEqual(result.datePublished, undefined);
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

    assert.strictEqual(result.title, "Home");
    assert.ok(result.url);
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

    assert.ok(result.organization);
    assert.strictEqual(result.organization.name, "Test Org");
    assert.strictEqual(result.organization.telephone, "+1234567890");
  });

  it("does not include organization when metaComputed.organization is not set", () => {
    const data = {
      page: { url: "/" },
      title: "Home",
      site: { url: "https://example.com", name: "Test Organization" },
      metaComputed: {},
    };

    const result = buildOrganizationMeta(data);

    assert.strictEqual(result.organization, undefined);
  });

  it("does not include organization when metaComputed is not set", () => {
    const data = {
      page: { url: "/" },
      title: "Home",
      site: { url: "https://example.com", name: "Test Organization" },
    };

    const result = buildOrganizationMeta(data);

    assert.strictEqual(result.organization, undefined);
  });
});
