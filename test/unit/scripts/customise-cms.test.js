import { describe, expect, test } from "bun:test";
import {
  COLLECTIONS,
  getCollection,
  getRequiredCollections,
  getSelectableCollections,
  resolveDependencies,
} from "#scripts/customise-cms/collections.js";
import { createDefaultConfig } from "#scripts/customise-cms/config.js";
import {
  COMMON_FIELDS,
  createReferenceField,
  FAQS_FIELD,
  FEATURES_FIELD,
  GALLERY_FIELD,
  SPECS_FIELD,
} from "#scripts/customise-cms/fields.js";
import { generatePagesYaml } from "#scripts/customise-cms/generator.js";

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
