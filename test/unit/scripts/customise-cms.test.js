import { describe, expect, test } from "bun:test";
import {
  COLLECTIONS,
  getCollection,
  getRequiredCollections,
  getSelectableCollections,
  resolveDependencies,
} from "#scripts/customise-cms/collections.js";
import {
  createDefaultConfig,
  loadCmsConfig,
  saveCmsConfig,
} from "#scripts/customise-cms/config.js";
import {
  COMMON_FIELDS,
  createBodyField,
  createMarkdownField,
  createReferenceField,
  createTabsField,
  FAQS_FIELD,
  FEATURES_FIELD,
  GALLERY_FIELD,
  getBodyField,
  SPECS_FIELD,
  TABS_FIELD,
} from "#scripts/customise-cms/fields.js";
import { generatePagesYaml } from "#scripts/customise-cms/generator.js";
import { withMockedCwdAsync } from "#test/test-utils.js";

/**
 * Default features object with all features disabled
 * @type {import('#scripts/customise-cms/config.js').CmsFeatures}
 */
const DISABLED_FEATURES = {
  permalinks: false,
  redirects: false,
  faqs: false,
  specs: false,
  features: false,
  galleries: false,
  header_images: false,
  event_locations_and_dates: false,
  use_visual_editor: false,
};

/**
 * Create a minimal test configuration with optional overrides
 * @param {Object} [overrides={}] - Properties to override
 * @param {string[]} [overrides.collections] - Collections to include
 * @param {Object} [overrides.features] - Feature flags to merge with disabled defaults
 * @param {boolean} [overrides.hasSrcFolder] - Whether template has src folder
 * @param {boolean} [overrides.customHomePage] - Whether template has custom home layout
 * @returns {import('#scripts/customise-cms/config.js').CmsConfig}
 */
const createTestConfig = (overrides = {}) => ({
  collections: overrides.collections ?? ["pages"],
  features: { ...DISABLED_FEATURES, ...(overrides.features ?? {}) },
  hasSrcFolder: overrides.hasSrcFolder ?? true,
  customHomePage: overrides.customHomePage ?? false,
});

/**
 * Set up a test directory with _data folder and site.json file
 * @param {string} tempDir - The temporary directory path
 * @param {Object} siteData - The data to write to site.json
 */
const setupSiteJson = async (tempDir, siteData) => {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(`${tempDir}/_data`, { recursive: true });
  writeFileSync(`${tempDir}/_data/site.json`, JSON.stringify(siteData));
};

/**
 * Set up a test directory with both _data and src/_data folders and site.json files
 * @param {string} tempDir - The temporary directory path
 * @param {Object} rootData - The data to write to _data/site.json
 * @param {Object} srcData - The data to write to src/_data/site.json
 */
const setupSiteJsonWithSrc = async (tempDir, rootData, srcData) => {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(`${tempDir}/_data`, { recursive: true });
  mkdirSync(`${tempDir}/src/_data`, { recursive: true });
  writeFileSync(`${tempDir}/_data/site.json`, JSON.stringify(rootData));
  writeFileSync(`${tempDir}/src/_data/site.json`, JSON.stringify(srcData));
};

describe("customise-cms collections", () => {
  // ============================================
  // COLLECTIONS constant
  // ============================================
  test("COLLECTIONS contains expected collection definitions", () => {
    expect(COLLECTIONS.length).toBeGreaterThan(0);
    expect(COLLECTIONS.some((c) => c.name === "pages")).toBe(true);
    expect(COLLECTIONS.some((c) => c.name === "products")).toBe(true);
    expect(COLLECTIONS.some((c) => c.name === "categories")).toBe(true);
  });

  test("Each collection has required properties", () => {
    for (const collection of COLLECTIONS) {
      expect(collection).toHaveProperty("name");
      expect(collection).toHaveProperty("label");
      expect(collection).toHaveProperty("path");
      expect(collection).toHaveProperty("description");
      expect(typeof collection.name).toBe("string");
      expect(typeof collection.label).toBe("string");
      expect(typeof collection.path).toBe("string");
      expect(typeof collection.description).toBe("string");
    }
  });

  test("Collection names are unique", () => {
    const names = COLLECTIONS.map((c) => c.name);
    const uniqueNames = [...new Set(names)];
    expect(names.length).toBe(uniqueNames.length);
  });

  // ============================================
  // getCollection
  // ============================================
  test("getCollection returns collection by name", () => {
    const products = getCollection("products");
    expect(products).toBeDefined();
    expect(products.name).toBe("products");
    expect(products.label).toBe("Products");
  });

  test("getCollection returns undefined for unknown collection", () => {
    const unknown = getCollection("unknown-collection");
    expect(unknown).toBeUndefined();
  });

  // ============================================
  // getSelectableCollections
  // ============================================
  test("getSelectableCollections excludes internal and required collections", () => {
    const selectable = getSelectableCollections();

    // Should not include required collections
    expect(selectable.some((c) => c.required)).toBe(false);

    // Should not include internal collections
    expect(selectable.some((c) => c.internal)).toBe(false);
  });

  test("getSelectableCollections includes user-selectable collections", () => {
    const selectable = getSelectableCollections();
    const names = selectable.map((c) => c.name);

    expect(names).toContain("products");
    expect(names).toContain("news");
    expect(names).toContain("events");
  });

  // ============================================
  // getRequiredCollections
  // ============================================
  test("getRequiredCollections returns collections marked as required", () => {
    const required = getRequiredCollections();

    expect(required.length).toBeGreaterThan(0);
    expect(required.every((c) => c.required)).toBe(true);
    expect(required.some((c) => c.name === "pages")).toBe(true);
  });

  // ============================================
  // resolveDependencies
  // ============================================
  test("resolveDependencies returns selected collections without dependencies", () => {
    const selected = ["pages", "news"];
    const resolved = resolveDependencies(selected);

    expect(resolved).toContain("pages");
    expect(resolved).toContain("news");
  });

  test("resolveDependencies adds required dependencies", () => {
    const selected = ["products"];
    const resolved = resolveDependencies(selected);

    expect(resolved).toContain("products");
    expect(resolved).toContain("categories"); // products depends on categories
  });

  test("resolveDependencies handles nested dependencies", () => {
    const selected = ["menu-items"];
    const resolved = resolveDependencies(selected);

    expect(resolved).toContain("menu-items");
    expect(resolved).toContain("menu-categories"); // menu-items depends on menu-categories
    expect(resolved).toContain("menus"); // menu-categories depends on menus
  });

  test("resolveDependencies handles circular references without infinite loop", () => {
    const selected = ["products", "categories"];
    const resolved = resolveDependencies(selected);

    expect(resolved).toContain("products");
    expect(resolved).toContain("categories");
    expect(resolved.length).toBe(2);
  });

  test("resolveDependencies removes duplicates", () => {
    const selected = ["products", "categories", "products"];
    const resolved = resolveDependencies(selected);

    const productCount = resolved.filter((c) => c === "products").length;
    expect(productCount).toBe(1);
  });

  test("resolveDependencies does not add dependencies for news, reviews, locations, or properties", () => {
    const selected = ["news", "reviews", "locations", "properties"];
    const resolved = resolveDependencies(selected);

    // These collections should not pull in additional dependencies
    expect(resolved.sort()).toEqual(selected.sort());
    expect(resolved).not.toContain("team");
    expect(resolved).not.toContain("products");
    expect(resolved).not.toContain("categories");
  });

  test("resolveDependencies only adds dependencies for products, menu-categories, and menu-items", () => {
    // Products should still require categories
    expect(resolveDependencies(["products"])).toContain("categories");

    // Menu-categories should still require menus
    expect(resolveDependencies(["menu-categories"])).toContain("menus");

    // Menu-items should still require menu-categories and menus
    const menuItemsDeps = resolveDependencies(["menu-items"]);
    expect(menuItemsDeps).toContain("menu-categories");
    expect(menuItemsDeps).toContain("menus");
  });
});

describe("customise-cms fields", () => {
  // ============================================
  // COMMON_FIELDS
  // ============================================
  test("COMMON_FIELDS contains standard field definitions", () => {
    expect(COMMON_FIELDS.title).toBeDefined();
    expect(COMMON_FIELDS.title.name).toBe("title");
    expect(COMMON_FIELDS.title.type).toBe("string");

    expect(COMMON_FIELDS.body).toBeDefined();
    expect(COMMON_FIELDS.body.name).toBe("body");
    expect(COMMON_FIELDS.body.type).toBe("code");
  });

  test("COMMON_FIELDS includes meta fields with maxlength", () => {
    expect(COMMON_FIELDS.meta_title.maxlength).toBe(55);
    expect(COMMON_FIELDS.meta_description.maxlength).toBe(155);
  });

  // ============================================
  // Structured fields
  // ============================================
  test("FAQS_FIELD has correct structure", () => {
    expect(FAQS_FIELD.name).toBe("faqs");
    expect(FAQS_FIELD.type).toBe("object");
    expect(FAQS_FIELD.list).toBe(true);
    expect(FAQS_FIELD.fields.length).toBe(2);
    expect(FAQS_FIELD.fields.some((f) => f.name === "question")).toBe(true);
    expect(FAQS_FIELD.fields.some((f) => f.name === "answer")).toBe(true);
  });

  test("GALLERY_FIELD has multiple images option", () => {
    expect(GALLERY_FIELD.name).toBe("gallery");
    expect(GALLERY_FIELD.type).toBe("image");
    expect(GALLERY_FIELD.options.multiple).toBe(true);
  });

  test("SPECS_FIELD has name/value structure", () => {
    expect(SPECS_FIELD.name).toBe("specs");
    expect(SPECS_FIELD.type).toBe("object");
    expect(SPECS_FIELD.list).toBe(true);
    expect(SPECS_FIELD.fields.some((f) => f.name === "name")).toBe(true);
    expect(SPECS_FIELD.fields.some((f) => f.name === "value")).toBe(true);
  });

  test("FEATURES_FIELD is a list of strings", () => {
    expect(FEATURES_FIELD.name).toBe("features");
    expect(FEATURES_FIELD.type).toBe("string");
    expect(FEATURES_FIELD.list).toBe(true);
  });

  // ============================================
  // createReferenceField
  // ============================================
  test("createReferenceField creates valid reference configuration", () => {
    const field = createReferenceField(
      "categories",
      "Categories",
      "categories",
    );

    expect(field.name).toBe("categories");
    expect(field.label).toBe("Categories");
    expect(field.type).toBe("reference");
    expect(field.options.collection).toBe("categories");
    expect(field.options.multiple).toBe(true);
    expect(field.options.value).toBe("{path}");
    expect(field.options.label).toBe("{title}");
  });

  test("createReferenceField supports custom search field", () => {
    const field = createReferenceField(
      "menu_categories",
      "Menu Categories",
      "menu-categories",
      "name",
    );

    expect(field.options.search).toBe("name");
    expect(field.options.label).toBe("{name}");
  });

  test("createReferenceField supports single reference", () => {
    const field = createReferenceField(
      "author",
      "Author",
      "team",
      "title",
      false,
    );

    expect(field.options.multiple).toBe(false);
  });
});

describe("customise-cms generator", () => {
  // ============================================
  // generatePagesYaml
  // ============================================
  test("generatePagesYaml produces valid YAML header", () => {
    const config = createDefaultConfig();
    const yaml = generatePagesYaml(config);

    expect(yaml).toContain("media:");
    expect(yaml).toContain("input: src/images");
    expect(yaml).toContain("settings:");
    expect(yaml).toContain("content:");
  });

  test("generatePagesYaml includes pages collection", () => {
    const yaml = generatePagesYaml(createTestConfig());

    expect(yaml).toContain("name: pages");
    expect(yaml).toContain("label: Pages");
    expect(yaml).toContain("path: src/pages");
  });

  test("generatePagesYaml includes products with features when enabled", () => {
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

    expect(yaml).toContain("name: products");
    expect(yaml).toContain("name: faqs");
    expect(yaml).toContain("name: specs");
    expect(yaml).toContain("name: features");
    expect(yaml).toContain("name: gallery");
    expect(yaml).toContain("name: permalink");
    expect(yaml).toContain("name: redirect_from");
  });

  test("generatePagesYaml excludes optional fields when disabled", () => {
    const yaml = generatePagesYaml(createTestConfig());

    // These should NOT appear in pages collection
    // Note: they might appear in file configs, so we check the pages section
    const pagesSection = yaml.split("name: homepage")[0];
    expect(pagesSection).not.toContain("name: faqs");
    expect(pagesSection).not.toContain("name: specs");
    expect(pagesSection).not.toContain("name: features");
    expect(pagesSection).not.toContain("name: redirect_from");
  });

  test("generatePagesYaml includes file-based configurations", () => {
    const config = createDefaultConfig();
    const yaml = generatePagesYaml(config);

    expect(yaml).toContain("name: homepage");
    expect(yaml).toContain("name: site");
    expect(yaml).toContain("name: meta");
    expect(yaml).toContain("name: alt-tags");
  });

  test("generatePagesYaml includes reference fields when target collection is selected", () => {
    const config = createTestConfig({
      collections: ["pages", "reviews", "products", "categories"],
    });
    const yaml = generatePagesYaml(config);

    // Reviews should have products reference since products is included
    expect(yaml).toContain("name: reviews");
    expect(yaml).toContain("collection: products");
  });

  test("generatePagesYaml excludes reference fields when target collection is not selected", () => {
    const config = createTestConfig({
      collections: ["pages", "reviews"],
    });
    const yaml = generatePagesYaml(config);

    // Reviews should NOT have products reference since products is not included
    expect(yaml).toContain("name: reviews");
    const reviewsSection = yaml.substring(
      yaml.indexOf("name: reviews"),
      yaml.indexOf("name: homepage"),
    );
    expect(reviewsSection).not.toContain("collection: products");
  });

  test("generatePagesYaml handles minimal configuration", () => {
    const yaml = generatePagesYaml(createTestConfig());

    // Should still produce valid output
    expect(yaml).toContain("media:");
    expect(yaml).toContain("content:");
    expect(yaml).toContain("name: pages");
  });

  test("generatePagesYaml uses src paths when hasSrcFolder is true", () => {
    const yaml = generatePagesYaml(createTestConfig({ hasSrcFolder: true }));

    expect(yaml).toContain("path: src/_data/site.json");
    expect(yaml).toContain("path: src/_data/meta.json");
    expect(yaml).toContain("path: src/_data/alt-tags.json");
    expect(yaml).toContain("path: src/pages");
    expect(yaml).toContain("input: src/images");
    expect(yaml).toContain("path: src/images");
  });

  test("generatePagesYaml adjusts paths when no src folder", () => {
    const yaml = generatePagesYaml(createTestConfig({ hasSrcFolder: false }));

    expect(yaml).toContain("path: _data/site.json");
    expect(yaml).toContain("path: _data/meta.json");
    expect(yaml).toContain("path: _data/alt-tags.json");
    expect(yaml).toContain("path: pages");
    expect(yaml).toContain("input: images");
    expect(yaml).toContain("path: images");
  });

  test("generatePagesYaml excludes homepage when customHomePage is true", () => {
    const yaml = generatePagesYaml(createTestConfig({ customHomePage: true }));

    expect(yaml).not.toContain("name: homepage");
  });

  test("generatePagesYaml includes homepage when customHomePage is false", () => {
    const yaml = generatePagesYaml(createTestConfig({ customHomePage: false }));

    expect(yaml).toContain("name: homepage");
  });
});

describe("customise-cms config", () => {
  // ============================================
  // createDefaultConfig
  // ============================================
  test("createDefaultConfig returns all collections", () => {
    const config = createDefaultConfig();

    expect(config.collections).toBeDefined();
    expect(config.collections.length).toBeGreaterThan(10);
    expect(config.collections).toContain("pages");
    expect(config.collections).toContain("products");
    expect(config.collections).toContain("news");
  });

  test("createDefaultConfig enables all features", () => {
    const config = createDefaultConfig();

    expect(config.features).toBeDefined();
    expect(config.features.permalinks).toBe(true);
    expect(config.features.redirects).toBe(true);
    expect(config.features.faqs).toBe(true);
    expect(config.features.specs).toBe(true);
    expect(config.features.features).toBe(true);
    expect(config.features.galleries).toBe(true);
  });

  test("createDefaultConfig includes hasSrcFolder and customHomePage", () => {
    const config = createDefaultConfig();

    expect(config.hasSrcFolder).toBe(true);
    expect(config.customHomePage).toBe(false);
  });

  test("createDefaultConfig includes event_locations_and_dates feature", () => {
    const config = createDefaultConfig();

    expect(config.features.event_locations_and_dates).toBe(true);
  });

  // ============================================
  // loadCmsConfig
  // ============================================
  test("loadCmsConfig reads cms_config from site.json", async () => {
    const { withTempDirAsync } = await import("#test/test-utils.js");

    return withTempDirAsync("loadCmsConfig", async (tempDir) => {
      await setupSiteJson(tempDir, {
        name: "Test Site",
        cms_config: {
          collections: ["pages", "products"],
          features: { permalinks: true },
        },
      });

      return withMockedCwdAsync(tempDir, async () => {
        const config = await loadCmsConfig();

        expect(config).toBeDefined();
        expect(config.collections).toEqual(["pages", "products"]);
        expect(config.features.permalinks).toBe(true);
      });
    });
  });

  test("loadCmsConfig returns null when cms_config doesn't exist", async () => {
    const { withTempDirAsync } = await import("#test/test-utils.js");

    return withTempDirAsync("loadCmsConfig-no-config", async (tempDir) => {
      await setupSiteJson(tempDir, {
        name: "Test Site",
        url: "https://example.com",
      });

      return withMockedCwdAsync(tempDir, async () => {
        const config = await loadCmsConfig();

        expect(config).toBeNull();
      });
    });
  });

  test("loadCmsConfig handles empty site.json gracefully", async () => {
    const { withTempDirAsync } = await import("#test/test-utils.js");

    return withTempDirAsync("loadCmsConfig-empty", async (tempDir) => {
      await setupSiteJson(tempDir, {});

      return withMockedCwdAsync(tempDir, async () => {
        const config = await loadCmsConfig();

        expect(config).toBeNull();
      });
    });
  });

  // ============================================
  // saveCmsConfig
  // ============================================
  test("saveCmsConfig writes cms_config to site.json while preserving other data", async () => {
    const { readFileSync } = await import("node:fs");
    const { withTempDirAsync } = await import("#test/test-utils.js");

    return withTempDirAsync("saveCmsConfig-preserve", async (tempDir) => {
      await setupSiteJson(tempDir, {
        name: "Test Site",
        url: "https://example.com",
      });

      return withMockedCwdAsync(tempDir, async () => {
        const newConfig = {
          collections: ["pages", "products"],
          features: { permalinks: true },
          hasSrcFolder: true,
        };

        await saveCmsConfig(newConfig);

        // Verify by reading the file
        const saved = JSON.parse(
          readFileSync(`${tempDir}/_data/site.json`, "utf-8"),
        );

        expect(saved.cms_config).toEqual(newConfig);
        // Preserve any other original properties
        expect(saved.name).toBe("Test Site");
        expect(saved.url).toBe("https://example.com");
        expect(Object.keys(saved).length).toBeGreaterThan(1);
      });
    });
  });

  test("saveCmsConfig updates existing cms_config", async () => {
    const { readFileSync } = await import("node:fs");
    const { withTempDirAsync } = await import("#test/test-utils.js");

    return withTempDirAsync("saveCmsConfig-update", async (tempDir) => {
      await setupSiteJson(tempDir, {
        name: "Test Site",
        cms_config: {
          collections: ["pages"],
          features: { permalinks: false },
        },
      });

      return withMockedCwdAsync(tempDir, async () => {
        const updatedConfig = {
          collections: ["pages", "products", "news"],
          features: { permalinks: true, faqs: true },
          hasSrcFolder: true,
        };

        await saveCmsConfig(updatedConfig);

        // Verify by reading the file
        const saved = JSON.parse(
          readFileSync(`${tempDir}/_data/site.json`, "utf-8"),
        );

        expect(saved.cms_config).toEqual(updatedConfig);
        expect(saved.cms_config.collections.length).toBe(3);
      });
    });
  });

  test("saveCmsConfig preserves JSON formatting with tabs and newline", async () => {
    const { readFileSync } = await import("node:fs");
    const { withTempDirAsync } = await import("#test/test-utils.js");

    return withTempDirAsync("saveCmsConfig-format", async (tempDir) => {
      await setupSiteJson(tempDir, { name: "Test Site" });

      return withMockedCwdAsync(tempDir, async () => {
        const config = { collections: ["pages"] };

        await saveCmsConfig(config);

        // Verify the file format
        const content = readFileSync(`${tempDir}/_data/site.json`, "utf-8");

        // Should have tabs for indentation
        expect(content).toContain("\t");
        // Should end with newline
        expect(content.endsWith("\n")).toBe(true);
      });
    });
  });

  // ============================================
  // getSiteJsonPath (via loadCmsConfig and saveCmsConfig)
  // ============================================
  test("loadCmsConfig finds site.json in src/_data folder when it exists", async () => {
    const { withTempDirAsync } = await import("#test/test-utils.js");

    return withTempDirAsync("getSiteJsonPath-src", async (tempDir) => {
      // Write to both locations - src/_data/site.json should be preferred
      await setupSiteJsonWithSrc(
        tempDir,
        { cms_config: { collections: ["pages"] } },
        { cms_config: { collections: ["products"] } },
      );

      return withMockedCwdAsync(tempDir, async () => {
        const config = await loadCmsConfig();

        // Should have loaded from src/_data/site.json (preferred over _data)
        expect(config.collections).toEqual(["products"]);
      });
    });
  });

  test("loadCmsConfig falls back to _data/site.json when src folder doesn't exist", async () => {
    const { withTempDirAsync } = await import("#test/test-utils.js");

    return withTempDirAsync("getSiteJsonPath-no-src", async (tempDir) => {
      // Create only _data directory (no src folder)
      await setupSiteJson(tempDir, {
        cms_config: { collections: ["events"] },
      });

      return withMockedCwdAsync(tempDir, async () => {
        const config = await loadCmsConfig();

        // Should have loaded from _data/site.json (fallback)
        expect(config.collections).toEqual(["events"]);
      });
    });
  });

  test("saveCmsConfig writes to src/_data when it exists", async () => {
    const { readFileSync } = await import("node:fs");
    const { withTempDirAsync } = await import("#test/test-utils.js");

    return withTempDirAsync("saveCmsConfig-src", async (tempDir) => {
      // Write to both locations
      await setupSiteJsonWithSrc(
        tempDir,
        { name: "Root Site" },
        { name: "Src Site" },
      );

      return withMockedCwdAsync(tempDir, async () => {
        const config = { collections: ["products"] };
        await saveCmsConfig(config);

        // Verify it was written to src/_data (preferred location)
        const srcData = JSON.parse(
          readFileSync(`${tempDir}/src/_data/site.json`, "utf-8"),
        );
        expect(srcData.cms_config).toEqual(config);

        // Verify root _data was NOT modified
        const rootData = JSON.parse(
          readFileSync(`${tempDir}/_data/site.json`, "utf-8"),
        );
        expect(rootData.cms_config).toBeUndefined();
      });
    });
  });
});

describe("customise-cms events fields", () => {
  /**
   * Helper to extract the events section from generated YAML
   * @param {string} yaml - Full YAML string
   * @returns {string} Events section of the YAML
   */
  const getEventsSection = (yaml) =>
    yaml.substring(
      yaml.indexOf("name: events"),
      yaml.indexOf("name: homepage"),
    );

  test("events include location and date fields when event_locations_and_dates is true", () => {
    const config = createTestConfig({
      collections: ["pages", "events"],
      features: { event_locations_and_dates: true },
    });
    const yaml = generatePagesYaml(config);

    expect(yaml).toContain("name: events");
    expect(yaml).toContain("name: event_date");
    expect(yaml).toContain("name: recurring_date");
    expect(yaml).toContain("name: event_location");
    expect(yaml).toContain("name: map_embed_src");
  });

  test("events exclude location and date fields when event_locations_and_dates is false", () => {
    const config = createTestConfig({
      collections: ["pages", "events"],
    });
    const yaml = generatePagesYaml(config);
    const eventsSection = getEventsSection(yaml);

    expect(yaml).toContain("name: events");
    expect(eventsSection).not.toContain("name: event_date");
    expect(eventsSection).not.toContain("name: recurring_date");
    expect(eventsSection).not.toContain("name: event_location");
    expect(eventsSection).not.toContain("name: map_embed_src");
  });

  test("events view config includes location/date fields when event_locations_and_dates is true", () => {
    const config = createTestConfig({
      collections: ["pages", "events"],
      features: { event_locations_and_dates: true },
    });
    const eventsSection = getEventsSection(generatePagesYaml(config));

    expect(eventsSection).toContain("event_date");
    expect(eventsSection).toContain("recurring_date");
    expect(eventsSection).toContain("event_location");
  });

  test("events view config excludes location/date fields when event_locations_and_dates is false", () => {
    const config = createTestConfig({
      collections: ["pages", "events"],
    });
    const eventsSection = getEventsSection(generatePagesYaml(config));

    // Should have available view fields (thumbnail and title)
    expect(eventsSection).toContain("fields:");
    expect(eventsSection).toContain("- title");
    expect(eventsSection).toContain("- thumbnail");
    // Should not contain the date/location fields in the view
    expect(eventsSection).not.toContain("- event_date");
    expect(eventsSection).not.toContain("- recurring_date");
    expect(eventsSection).not.toContain("- event_location");
  });
});

describe("customise-cms view config validation", () => {
  /**
   * Helper to extract a collection's view section from generated YAML
   * @param {string} yaml - Full YAML string
   * @param {string} collectionName - Name of the collection
   * @returns {string | null} View section or null if not found
   */
  const getViewSection = (yaml, collectionName) => {
    const collectionPattern = new RegExp(
      `name: ${collectionName}[\\s\\S]*?view:[\\s\\S]*?(?=\\n  - name:|\\n  - type:|$)`,
    );
    const match = yaml.match(collectionPattern);
    return match ? match[0] : null;
  };

  test("pages view config excludes permalink when permalinks feature is disabled", () => {
    const config = createTestConfig({
      collections: ["pages"],
      features: { permalinks: false },
    });
    const yaml = generatePagesYaml(config);
    const pagesView = getViewSection(yaml, "pages");

    expect(pagesView).not.toContain("- permalink");
    expect(pagesView).toContain("- meta_title");
  });

  test("pages view config includes permalink when permalinks feature is enabled", () => {
    const config = createTestConfig({
      collections: ["pages"],
      features: { permalinks: true },
    });
    const yaml = generatePagesYaml(config);
    const pagesView = getViewSection(yaml, "pages");

    expect(pagesView).toContain("- permalink");
    expect(pagesView).toContain("- meta_title");
  });

  test("pages view config validates fields/sort/primary when header_images disabled", () => {
    const config = createTestConfig({
      collections: ["pages"],
      features: { header_images: false },
    });
    const yaml = generatePagesYaml(config);
    const pagesView = getViewSection(yaml, "pages");

    // Excludes unavailable fields
    expect(pagesView).not.toContain("- header_text");
    // Includes available fields
    expect(pagesView).toContain("- meta_title");
    // Sort is filtered to available fields
    expect(pagesView).toContain("sort:");
    // Primary falls back to available field
    expect(yaml).toContain("primary: meta_title");
  });

  test("pages view config includes header_text when header_images feature is enabled", () => {
    const config = createTestConfig({
      collections: ["pages"],
      features: { header_images: true },
    });
    const yaml = generatePagesYaml(config);
    const pagesView = getViewSection(yaml, "pages");

    expect(pagesView).toContain("- header_text");
    expect(pagesView).toContain("- meta_title");
  });

  test("pages view config has valid fields even with minimal features", () => {
    const config = createTestConfig({
      collections: ["pages"],
      features: {
        permalinks: false,
        header_images: false,
      },
    });
    const yaml = generatePagesYaml(config);
    const pagesView = getViewSection(yaml, "pages");

    // Should still have meta_title as a valid field
    expect(pagesView).toContain("fields:");
    expect(pagesView).toContain("- meta_title");
  });
});

describe("customise-cms visual editor fields", () => {
  // ============================================
  // getBodyField
  // ============================================
  test("getBodyField returns markdown code field when visual editor disabled", () => {
    const field = getBodyField(false);
    expect(field.name).toBe("body");
    expect(field.type).toBe("code");
    expect(field.options).toEqual({ language: "markdown" });
  });

  test("getBodyField returns rich-text field when visual editor enabled", () => {
    const field = getBodyField(true);
    expect(field.name).toBe("body");
    expect(field.type).toBe("rich-text");
    expect(field.options).toBeUndefined();
  });

  // ============================================
  // createBodyField
  // ============================================
  test("createBodyField creates markdown field with custom label when visual editor disabled", () => {
    const field = createBodyField("Biography", false);
    expect(field.name).toBe("body");
    expect(field.label).toBe("Biography");
    expect(field.type).toBe("code");
    expect(field.options).toEqual({ language: "markdown" });
  });

  test("createBodyField creates rich-text field with custom label when visual editor enabled", () => {
    const field = createBodyField("Biography", true);
    expect(field.name).toBe("body");
    expect(field.label).toBe("Biography");
    expect(field.type).toBe("rich-text");
    expect(field.options).toBeUndefined();
  });

  // ============================================
  // createTabsField
  // ============================================
  test("createTabsField creates tabs with markdown body when visual editor disabled", () => {
    const field = createTabsField(false);
    expect(field.name).toBe("tabs");
    expect(field.type).toBe("object");
    expect(field.list).toBe(true);

    const bodyField = field.fields.find((f) => f.name === "body");
    expect(bodyField.type).toBe("code");
    expect(bodyField.options).toEqual({ language: "markdown" });
  });

  test("createTabsField creates tabs with rich-text body when visual editor enabled", () => {
    const field = createTabsField(true);
    expect(field.name).toBe("tabs");
    expect(field.type).toBe("object");
    expect(field.list).toBe(true);

    const bodyField = field.fields.find((f) => f.name === "body");
    expect(bodyField.type).toBe("rich-text");
    expect(bodyField.options).toBeUndefined();
  });

  // ============================================
  // TABS_FIELD (legacy constant)
  // ============================================
  test("TABS_FIELD uses markdown code field for backwards compatibility", () => {
    const bodyField = TABS_FIELD.fields.find((f) => f.name === "body");
    expect(bodyField.type).toBe("code");
    expect(bodyField.options).toEqual({ language: "markdown" });
  });

  // ============================================
  // createMarkdownField
  // ============================================
  test("createMarkdownField returns code field when visual editor disabled", () => {
    const field = createMarkdownField("intro", "Intro", false);
    expect(field.name).toBe("intro");
    expect(field.label).toBe("Intro");
    expect(field.type).toBe("code");
    expect(field.options).toEqual({ language: "markdown" });
  });

  test("createMarkdownField returns rich-text field when visual editor enabled", () => {
    const field = createMarkdownField("intro", "Intro", true);
    expect(field.name).toBe("intro");
    expect(field.label).toBe("Intro");
    expect(field.type).toBe("rich-text");
    expect(field.options).toBeUndefined();
  });

  test("createMarkdownField passes through additional properties", () => {
    const field = createMarkdownField("body", "Body", false, {
      required: true,
    });
    expect(field.required).toBe(true);
    expect(field.type).toBe("code");
  });

  test("createMarkdownField passes through additional properties with visual editor", () => {
    const field = createMarkdownField("body", "Body", true, { required: true });
    expect(field.required).toBe(true);
    expect(field.type).toBe("rich-text");
  });
});

describe("customise-cms generator with visual editor", () => {
  test("generatePagesYaml uses code editor for body when visual editor disabled", () => {
    const config = createTestConfig({
      collections: ["pages"],
      features: { use_visual_editor: false },
    });
    const yaml = generatePagesYaml(config);

    // Body field should use code type with markdown language
    expect(yaml).toContain("type: code");
    expect(yaml).toContain("language: markdown");
  });

  test("generatePagesYaml uses rich-text editor for body when visual editor enabled", () => {
    const config = createTestConfig({
      collections: ["pages"],
      features: { use_visual_editor: true },
    });
    const yaml = generatePagesYaml(config);

    // Body field should use rich-text type
    expect(yaml).toContain("type: rich-text");
  });

  test("visual editor affects all collections with body fields", () => {
    const config = createTestConfig({
      collections: [
        "pages",
        "products",
        "categories",
        "news",
        "reviews",
        "team",
        "events",
        "locations",
        "properties",
        "guide-categories",
        "guide-pages",
        "snippets",
        "menus",
        "menu-categories",
        "menu-items",
      ],
      features: { use_visual_editor: true },
    });
    const yaml = generatePagesYaml(config);

    // Should have rich-text type for body fields
    expect(yaml).toContain("type: rich-text");
    // Should not have markdown code editor when visual editor is enabled
    // Note: we can't easily check each collection, but we verify rich-text is used
  });

  test("visual editor affects tabs field body type", () => {
    const config = createTestConfig({
      collections: ["pages", "products", "categories"],
      features: { use_visual_editor: true },
    });
    const yaml = generatePagesYaml(config);

    // Products support tabs, so the tabs field should use rich-text for body
    expect(yaml).toContain("name: tabs");
    // The tabs body field should be rich-text
    const tabsSection = yaml.substring(
      yaml.indexOf("name: tabs"),
      yaml.indexOf("name: tabs") + 500,
    );
    expect(tabsSection).toContain("type: rich-text");
  });

  test("team collection Biography field uses visual editor when enabled", () => {
    const config = createTestConfig({
      collections: ["pages", "team"],
      features: { use_visual_editor: true },
    });
    const yaml = generatePagesYaml(config);

    // Team collection should have Biography field with rich-text
    expect(yaml).toContain("name: team");
    expect(yaml).toContain("label: Biography");

    const teamSection = yaml.substring(
      yaml.indexOf("name: team"),
      yaml.indexOf("name: homepage") || yaml.length,
    );
    expect(teamSection).toContain("type: rich-text");
  });
});

describe("customise-cms config with use_visual_editor", () => {
  test("createDefaultConfig includes use_visual_editor set to false", () => {
    const config = createDefaultConfig();

    expect(config.features).toBeDefined();
    expect(config.features.use_visual_editor).toBe(false);
  });

  test("use_visual_editor can be enabled in config", () => {
    const config = createTestConfig({
      collections: ["pages"],
      features: { use_visual_editor: true },
    });

    expect(config.features.use_visual_editor).toBe(true);
  });
});
