import { describe, expect, test } from "bun:test";
import { createDefaultConfig } from "#scripts/customise-cms/config.js";
import { generatePagesYaml } from "#scripts/customise-cms/generator.js";
import {
  createTestConfig,
  getSection,
} from "#test/unit/scripts/customise-cms/test-helpers.js";

describe("customise-cms generator", () => {
  describe("basic output structure", () => {
    test("produces valid YAML with media, settings, and content sections", () => {
      const yaml = generatePagesYaml(createDefaultConfig());
      expect(yaml).toContain("media:");
      expect(yaml).toContain("input: src/images");
      expect(yaml).toContain("settings:");
      expect(yaml).toContain("content:");
    });

    test("includes pages collection for minimal config", () => {
      const yaml = generatePagesYaml(createTestConfig());
      expect(yaml).toContain("name: pages");
      expect(yaml).toContain("label: Pages");
      expect(yaml).toContain("path: src/pages");
    });

    test("includes file-based configurations (homepage, site, meta, alt-tags)", () => {
      const yaml = generatePagesYaml(createDefaultConfig());
      expect(yaml).toContain("name: homepage");
      expect(yaml).toContain("name: site");
      expect(yaml).toContain("name: meta");
      expect(yaml).toContain("name: alt-tags");
    });
  });

  describe("feature flags", () => {
    test("includes feature fields when enabled", () => {
      const config = createTestConfig({
        collections: ["pages", "products", "categories"],
        features: {
          permalinks: true,
          redirects: true,
          faqs: true,
          specs: true,
          features: true,
          galleries: true,
        },
      });
      const yaml = generatePagesYaml(config);

      expect(yaml).toContain("name: faqs");
      expect(yaml).toContain("name: specs");
      expect(yaml).toContain("name: features");
      expect(yaml).toContain("name: gallery");
      expect(yaml).toContain("name: permalink");
      expect(yaml).toContain("name: redirect_from");
    });

    test("excludes optional fields when disabled", () => {
      const yaml = generatePagesYaml(createTestConfig());
      const pagesSection = getSection("pages")(yaml);
      expect(pagesSection).not.toContain("name: faqs");
      expect(pagesSection).not.toContain("name: specs");
      expect(pagesSection).not.toContain("name: redirect_from");
    });
  });

  describe("src folder paths", () => {
    test("uses src/ paths when hasSrcFolder is true", () => {
      const yaml = generatePagesYaml(createTestConfig({ hasSrcFolder: true }));
      expect(yaml).toContain("path: src/_data/site.json");
      expect(yaml).toContain("path: src/pages");
      expect(yaml).toContain("input: src/images");
    });

    test("adjusts paths when hasSrcFolder is false", () => {
      const yaml = generatePagesYaml(createTestConfig({ hasSrcFolder: false }));
      expect(yaml).toContain("path: _data/site.json");
      expect(yaml).toContain("path: pages");
      expect(yaml).toContain("input: images");
    });
  });

  describe("homepage", () => {
    test("excludes homepage when customHomePage is true", () => {
      const yaml = generatePagesYaml(
        createTestConfig({ customHomePage: true }),
      );
      expect(yaml).not.toContain("name: homepage");
    });

    test("includes homepage when customHomePage is false", () => {
      const yaml = generatePagesYaml(
        createTestConfig({ customHomePage: false }),
      );
      expect(yaml).toContain("name: homepage");
    });
  });

  describe("reference fields", () => {
    test("includes reference fields when target collection is selected", () => {
      const config = createTestConfig({
        collections: ["pages", "reviews", "products", "categories"],
      });
      const yaml = generatePagesYaml(config);
      expect(yaml).toContain("collection: products");
    });

    test("excludes reference fields when target collection is not selected", () => {
      const config = createTestConfig({
        collections: ["pages", "reviews"],
      });
      const yaml = generatePagesYaml(config);
      const reviewsSection = yaml.substring(
        yaml.indexOf("name: reviews"),
        yaml.indexOf("name: homepage"),
      );
      expect(reviewsSection).not.toContain("collection: products");
    });

    test("includes property reference on guide-categories when properties enabled", () => {
      const config = createTestConfig({
        collections: ["pages", "guide-categories", "guide-pages", "properties"],
      });
      const section = getSection("guide-categories")(generatePagesYaml(config));
      expect(section).toContain("name: property");
      expect(section).toContain("collection: properties");
    });

    test("excludes property reference on guide-categories when properties not enabled", () => {
      const config = createTestConfig({
        collections: ["pages", "guide-categories", "guide-pages"],
      });
      const section = getSection("guide-categories")(generatePagesYaml(config));
      expect(section).not.toContain("collection: properties");
    });
  });

  describe("visual editor", () => {
    test("uses code editor for body when visual editor disabled", () => {
      const config = createTestConfig({
        collections: ["pages"],
        features: { use_visual_editor: false },
      });
      const yaml = generatePagesYaml(config);
      expect(yaml).toContain("type: code");
      expect(yaml).toContain("language: markdown");
    });

    test("uses rich-text editor for body when visual editor enabled", () => {
      const config = createTestConfig({
        collections: ["pages"],
        features: { use_visual_editor: true },
      });
      const yaml = generatePagesYaml(config);
      expect(yaml).toContain("type: rich-text");
    });

    test("team Biography field uses rich-text when visual editor enabled", () => {
      const config = createTestConfig({
        collections: ["pages", "team"],
        features: { use_visual_editor: true },
      });
      const yaml = generatePagesYaml(config);
      const teamSection = yaml.substring(
        yaml.indexOf("name: team"),
        yaml.indexOf("name: homepage") || yaml.length,
      );
      expect(teamSection).toContain("label: Biography");
      expect(teamSection).toContain("type: rich-text");
    });

    test("tabs use rich-text body when visual editor enabled", () => {
      const config = createTestConfig({
        collections: ["pages", "products", "categories"],
        features: { use_visual_editor: true },
      });
      const yaml = generatePagesYaml(config);
      const componentsSection = yaml.substring(
        yaml.indexOf("components:"),
        yaml.indexOf("\ncontent:"),
      );
      const tabsStart = componentsSection.indexOf("  tabs:");
      const tabsSection = componentsSection.substring(
        tabsStart,
        tabsStart + 500,
      );
      expect(tabsSection).toContain("type: rich-text");
    });

    test("does not throw with visual editor and page layout fields", () => {
      const config = createTestConfig({
        features: { use_visual_editor: true },
      });
      expect(() => generatePagesYaml(config)).not.toThrow();
    });
  });

  describe("events fields", () => {
    const getEventsSection = getSection("events");

    test("includes location and date fields when event_locations_and_dates enabled", () => {
      const config = createTestConfig({
        collections: ["pages", "events"],
        features: { event_locations_and_dates: true },
      });
      const section = getEventsSection(generatePagesYaml(config));
      expect(section).toContain("name: event_date");
      expect(section).toContain("name: recurring_date");
      expect(section).toContain("name: event_location");
      expect(section).toContain("name: map_embed_src");
    });

    test("excludes location and date fields when event_locations_and_dates disabled", () => {
      const config = createTestConfig({
        collections: ["pages", "events"],
      });
      const section = getEventsSection(generatePagesYaml(config));
      expect(section).not.toContain("name: event_date");
      expect(section).not.toContain("name: event_location");
    });
  });

  describe("add_ons feature", () => {
    const getProductsSection = getSection("products");

    test("includes add_ons on products when enabled", () => {
      const config = createTestConfig({
        collections: ["pages", "products", "categories"],
        features: { add_ons: true },
      });
      expect(getProductsSection(generatePagesYaml(config))).toContain(
        "name: add_ons",
      );
    });

    test("excludes add_ons on products when disabled", () => {
      const config = createTestConfig({
        collections: ["pages", "products", "categories"],
      });
      expect(getProductsSection(generatePagesYaml(config))).not.toContain(
        "name: add_ons",
      );
    });

    test("add_ons only appears on collections that support it", () => {
      const config = createTestConfig({
        collections: ["pages", "products", "categories", "news"],
        features: { add_ons: true },
      });
      const yaml = generatePagesYaml(config);
      expect(getProductsSection(yaml)).toContain("name: add_ons");
      expect(getSection("news")(yaml)).not.toContain("name: add_ons");
      expect(getSection("pages")(yaml)).not.toContain("name: add_ons");
    });

    test("add_ons intro respects visual editor setting", () => {
      const config = createTestConfig({
        collections: ["pages", "products", "categories"],
        features: { add_ons: true, use_visual_editor: true },
      });
      const yaml = generatePagesYaml(config);
      const addOnsStart = yaml.indexOf("name: add_ons");
      const addOnsSection = yaml.substring(addOnsStart, addOnsStart + 500);
      expect(addOnsSection).toContain("type: rich-text");
    });
  });

  describe("below_products feature", () => {
    test("includes below_products on categories when enabled", () => {
      const config = createTestConfig({
        collections: ["pages", "categories"],
        features: { below_products: true },
      });
      const section = getSection("categories")(generatePagesYaml(config));
      expect(section).toContain("name: below_products");
    });

    test("excludes below_products on categories when disabled", () => {
      const config = createTestConfig({
        collections: ["pages", "categories"],
      });
      const section = getSection("categories")(generatePagesYaml(config));
      expect(section).not.toContain("name: below_products");
    });

    test("below_products respects visual editor setting", () => {
      const config = createTestConfig({
        collections: ["pages", "categories"],
        features: { below_products: true, use_visual_editor: true },
      });
      const section = getSection("categories")(generatePagesYaml(config));
      const belowStart = section.indexOf("name: below_products");
      const belowSection = section.substring(belowStart, belowStart + 200);
      expect(belowSection).toContain("type: rich-text");
    });
  });

  describe("view config validation", () => {
    const getViewSection = (yaml, collectionName) => {
      const pattern = new RegExp(
        `name: ${collectionName}[\\s\\S]*?view:[\\s\\S]*?(?=\\n  - name:|\\n  - type:|$)`,
      );
      const match = yaml.match(pattern);
      return match ? match[0] : null;
    };

    test("pages view includes permalink when enabled", () => {
      const config = createTestConfig({
        features: { permalinks: true },
      });
      const view = getViewSection(generatePagesYaml(config), "pages");
      expect(view).toContain("- permalink");
    });

    test("pages view excludes permalink when disabled", () => {
      const config = createTestConfig({
        features: { permalinks: false },
      });
      const view = getViewSection(generatePagesYaml(config), "pages");
      expect(view).not.toContain("- permalink");
      expect(view).toContain("- meta_title");
    });

    test("pages view includes header_text when header_images enabled", () => {
      const config = createTestConfig({
        features: { header_images: true },
      });
      const view = getViewSection(generatePagesYaml(config), "pages");
      expect(view).toContain("- header_text");
    });

    test("pages view falls back to meta_title when header_images disabled", () => {
      const config = createTestConfig({
        features: { header_images: false },
      });
      const yaml = generatePagesYaml(config);
      const view = getViewSection(yaml, "pages");
      expect(view).not.toContain("- header_text");
      expect(view).toContain("- meta_title");
      expect(yaml).toContain("primary: meta_title");
    });
  });
});
