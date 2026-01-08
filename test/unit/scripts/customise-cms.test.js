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
    expect(FAQS_FIELD.fields.length).toBe(3);
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
    const config = {
      collections: ["pages"],
      features: {
        permalinks: false,
        redirects: false,
        faqs: false,
        specs: false,
        features: false,
        galleries: false,
      },
    };
    const yaml = generatePagesYaml(config);

    expect(yaml).toContain("name: pages");
    expect(yaml).toContain("label: Pages");
    expect(yaml).toContain("path: src/pages");
  });

  test("generatePagesYaml includes products with features when enabled", () => {
    const config = {
      collections: ["pages", "products", "categories"],
      features: {
        permalinks: true,
        redirects: true,
        faqs: true,
        specs: true,
        features: true,
        galleries: true,
      },
    };
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
    const config = {
      collections: ["pages"],
      features: {
        permalinks: false,
        redirects: false,
        faqs: false,
        specs: false,
        features: false,
        galleries: false,
      },
    };
    const yaml = generatePagesYaml(config);

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

  test("generatePagesYaml handles collection dependencies", () => {
    const config = {
      collections: ["pages", "reviews", "products", "categories"],
      features: {
        permalinks: false,
        redirects: false,
        faqs: false,
        specs: false,
        features: false,
        galleries: false,
      },
    };
    const yaml = generatePagesYaml(config);

    // Reviews should have products reference since products is included
    expect(yaml).toContain("name: reviews");
    expect(yaml).toContain("collection: products");
  });

  test("generatePagesYaml handles minimal configuration", () => {
    const config = {
      collections: ["pages"],
      features: {
        permalinks: false,
        redirects: false,
        faqs: false,
        specs: false,
        features: false,
        galleries: false,
      },
    };
    const yaml = generatePagesYaml(config);

    // Should still produce valid output
    expect(yaml).toContain("media:");
    expect(yaml).toContain("content:");
    expect(yaml).toContain("name: pages");
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
});
