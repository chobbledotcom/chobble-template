import { createTestRunner } from "./test-utils.js";
import { buildBaseMeta } from "../src/_lib/schema-helper.mjs";

// Import the products data file to test the computed header_image property
import productsData from "../src/products/products.11tydata.mjs";

const computeHeaderImage = productsData.eleventyComputed.header_image;

const testCases = [
  {
    name: "autoHeaderImage-enabled",
    description: "Uses first gallery image when autoHeaderImage is true",
    test: () => {
      const data = {
        site: { url: "https://example.com" },
        page: { url: "/test/" },
        title: "Test Page",
        config: { autoHeaderImage: true },
        gallery: ["first-image.jpg", "second-image.jpg"],
      };

      const result = buildBaseMeta(data);

      if (result.image?.src !== "https://example.com/images/first-image.jpg") {
        throw new Error(
          `Expected image to be first gallery image, got ${result.image?.src}`,
        );
      }
    },
  },

  },
  {
    name: "autoHeaderImage-explicit-header-overrides",
    description:
      "Explicit header_image overrides gallery even when autoHeaderImage is false",
    test: () => {
      const data = {
        site: { url: "https://example.com" },
        page: { url: "/test/" },
        title: "Test Page",
        config: { autoHeaderImage: false },
        header_image: "explicit-header.jpg",
        gallery: ["first-image.jpg", "second-image.jpg"],
      };

      const result = buildBaseMeta(data);

      if (
        result.image?.src !== "https://example.com/images/explicit-header.jpg"
      ) {
        throw new Error(
          `Expected explicit header image, got ${result.image?.src}`,
        );
      }
    },
  },
  {
    name: "autoHeaderImage-default-true",
    description: "Defaults to true when config.autoHeaderImage is undefined",
    test: () => {
      const data = {
        site: { url: "https://example.com" },
        page: { url: "/test/" },
        title: "Test Page",
        config: {},
        gallery: ["first-image.jpg", "second-image.jpg"],
      };

      const result = buildBaseMeta(data);

      if (result.image?.src !== "https://example.com/images/first-image.jpg") {
        throw new Error(
          `Expected to default to true and use gallery image, got ${result.image?.src}`,
        );
      }
    },
  },

  {
    name: "computed-header-image-array-enabled",
    description:
      "Computed header_image property uses first gallery image (array) when enabled",
    test: () => {
      const data = {
        config: { autoHeaderImage: true },
        gallery: ["first.jpg", "second.jpg"],
      };

      const result = computeHeaderImage(data);

      if (result !== "first.jpg") {
        throw new Error(`Expected 'first.jpg', got '${result}'`);
      }
    },
  },
  {
    name: "computed-header-image-array-disabled",
    description:
      "Computed header_image property does not use gallery (array) when disabled",
    test: () => {
      const data = {
        config: { autoHeaderImage: false },
        gallery: ["first.jpg", "second.jpg"],
      };

      const result = computeHeaderImage(data);

      if (result !== undefined) {
        throw new Error(`Expected undefined, got '${result}'`);
      }
    },
  },
  {
    name: "computed-header-image-object-enabled",
    description:
      "Computed header_image property uses first gallery image (object) when enabled",
    test: () => {
      const data = {
        config: { autoHeaderImage: true },
        gallery: {
          "Front View": "front.jpg",
          "Back View": "back.jpg",
        },
      };

      const result = computeHeaderImage(data);

      if (result !== "front.jpg") {
        throw new Error(`Expected 'front.jpg', got '${result}'`);
      }
    },
  },
  {
    name: "computed-header-image-object-disabled",
    description:
      "Computed header_image property does not use gallery (object) when disabled",
    test: () => {
      const data = {
        config: { autoHeaderImage: false },
        gallery: {
          "Alt Text": "image.jpg",
        },
      };

      const result = computeHeaderImage(data);

      if (result !== undefined) {
        throw new Error(`Expected undefined, got '${result}'`);
      }
    },
  },
  {
    name: "computed-header-image-explicit-override",
    description:
      "Computed header_image property uses explicit value even when disabled",
    test: () => {
      const data = {
        header_image: "explicit.jpg",
        config: { autoHeaderImage: false },
        gallery: ["gallery.jpg"],
      };

      const result = computeHeaderImage(data);

      if (result !== "explicit.jpg") {
        throw new Error(`Expected 'explicit.jpg', got '${result}'`);
      }
    },
  },
  {
    name: "computed-header-image-default-enabled",
    description:
      "Computed header_image property defaults to enabled when config missing",
    test: () => {
      const data = {
        config: {},
        gallery: ["image.jpg"],
      };

      const result = computeHeaderImage(data);

      if (result !== "image.jpg") {
        throw new Error(`Expected 'image.jpg', got '${result}'`);
      }
    },
  },
];

export default createTestRunner("auto-header-image", testCases);
