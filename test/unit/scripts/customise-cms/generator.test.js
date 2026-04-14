import { describe, expect, test } from "bun:test";
import YAML from "yaml";
import { createDefaultConfig } from "#scripts/customise-cms/config.js";
import { generatePagesYaml } from "#scripts/customise-cms/generator.js";

/**
 * @type {import('#scripts/customise-cms/config.js').CmsFeatures}
 */
const DISABLED_FEATURES = {
  permalinks: false,
  redirects: false,
  faqs: false,
  specs: false,
  features: false,
  galleries: false,
  add_ons: false,
  header_images: false,
  event_locations_and_dates: false,
  use_visual_editor: false,
  below_products: false,
  use_blocks: false,
};

/**
 * @param {Object} [overrides]
 * @returns {import('#scripts/customise-cms/config.js').CmsConfig}
 */
const createTestConfig = (overrides = {}) => ({
  collections: overrides.collections ?? ["pages"],
  features: { ...DISABLED_FEATURES, ...(overrides.features ?? {}) },
  hasSrcFolder: overrides.hasSrcFolder ?? true,
  customHomePage: overrides.customHomePage ?? false,
  customBlocksCollections: overrides.customBlocksCollections ?? [],
});

/**
 * Extract a named collection section from YAML output.
 * @param {string} collectionName
 * @returns {(yaml: string) => string}
 */
const getSection = (collectionName) => (yaml) => {
  const marker = `name: ${collectionName}`;
  const start = yaml.indexOf(marker);
  if (start === -1) return "";
  const remainder = yaml.substring(start + 1);
  const nextCollectionMatch = remainder.match(/\n {2}- name: /);
  return nextCollectionMatch
    ? yaml.substring(start, start + 1 + nextCollectionMatch.index)
    : yaml.substring(start);
};

describe("generatePagesYaml output validity", () => {
  test("produces parseable YAML", () => {
    const yaml = generatePagesYaml(createDefaultConfig());
    const parsed = YAML.parse(yaml);

    expect(parsed).toHaveProperty("media");
    expect(parsed).toHaveProperty("content");
    expect(Array.isArray(parsed.content)).toBe(true);
  });

  test("default config generates collections for all enabled types", () => {
    const yaml = generatePagesYaml(createDefaultConfig());
    const parsed = YAML.parse(yaml);
    const collectionNames = parsed.content
      .filter((c) => c.name)
      .map((c) => c.name);

    expect(collectionNames).toContain("pages");
    expect(collectionNames).toContain("products");
    expect(collectionNames).toContain("homepage");
    expect(collectionNames).toContain("site");
  });
});

describe("generatePagesYaml collections", () => {
  test("includes pages collection", () => {
    const yaml = generatePagesYaml(createTestConfig());

    expect(yaml).toContain("name: pages");
    expect(yaml).toContain("path: src/pages");
  });

  test("includes snippets when in collections list", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ collections: ["pages", "snippets"] }),
    );

    expect(yaml).toContain("name: snippets");
    expect(yaml).toContain("path: src/snippets");
  });

  test("excludes snippets when not in collections list", () => {
    const yaml = generatePagesYaml(createTestConfig());

    expect(yaml).not.toContain("name: snippets");
  });

  test("always includes file-based configs (homepage, site, meta)", () => {
    const yaml = generatePagesYaml(createTestConfig());

    expect(yaml).toContain("name: homepage");
    expect(yaml).toContain("name: site");
    expect(yaml).toContain("name: meta");
  });

  test("excludes homepage when customHomePage is true", () => {
    const yaml = generatePagesYaml(createTestConfig({ customHomePage: true }));

    expect(yaml).not.toContain("name: homepage");
  });
});

describe("generatePagesYaml paths", () => {
  test("uses src/ paths when hasSrcFolder is true", () => {
    const yaml = generatePagesYaml(createTestConfig({ hasSrcFolder: true }));

    expect(yaml).toContain("path: src/_data/site.json");
    expect(yaml).toContain("path: src/pages");
    expect(yaml).toContain("input: src/images");
  });

  test("strips src/ prefix when hasSrcFolder is false", () => {
    const yaml = generatePagesYaml(createTestConfig({ hasSrcFolder: false }));

    expect(yaml).toContain("path: _data/site.json");
    expect(yaml).toContain("path: pages");
    expect(yaml).toContain("input: images");
  });
});

describe("generatePagesYaml feature flags", () => {
  test("includes faqs/specs/features/gallery fields when enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "products", "categories"],
        features: { faqs: true, specs: true, features: true, galleries: true },
      }),
    );

    expect(yaml).toContain("name: faqs");
    expect(yaml).toContain("name: specs");
    expect(yaml).toContain("name: features");
    expect(yaml).toContain("name: gallery");
  });

  test("excludes optional fields from pages when disabled", () => {
    const yaml = generatePagesYaml(createTestConfig());
    const pagesSection = getSection("pages")(yaml);

    expect(pagesSection).not.toContain("name: faqs");
    expect(pagesSection).not.toContain("name: specs");
    expect(pagesSection).not.toContain("name: redirect_from");
  });

  test("includes permalink and redirect_from when enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "products", "categories"],
        features: { permalinks: true, redirects: true },
      }),
    );

    expect(yaml).toContain("name: permalink");
    expect(yaml).toContain("name: redirect_from");
  });
});

describe("generatePagesYaml reference fields", () => {
  test("includes product reference on reviews when products is selected", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "reviews", "products", "categories"],
      }),
    );

    expect(yaml).toContain("name: reviews");
    expect(yaml).toContain("collection: products");
  });

  test("excludes product reference on reviews when products is not selected", () => {
    const config = createTestConfig({ collections: ["pages", "reviews"] });
    const yaml = generatePagesYaml(config);
    const reviewsSection = getSection("reviews")(yaml);

    expect(reviewsSection).not.toContain("collection: products");
  });

  test("includes property reference on guide-categories when properties selected", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "guide-categories", "guide-pages", "properties"],
      }),
    );
    const section = getSection("guide-categories")(yaml);

    expect(section).toContain("collection: properties");
  });

  test("excludes property reference on guide-categories when properties not selected", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "guide-categories", "guide-pages"],
      }),
    );
    const section = getSection("guide-categories")(yaml);

    expect(section).not.toContain("collection: properties");
  });
});

describe("generatePagesYaml visual editor", () => {
  test("uses code editor when visual editor disabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ features: { use_visual_editor: false } }),
    );

    expect(yaml).toContain("type: code");
    expect(yaml).toContain("language: markdown");
  });

  test("uses rich-text editor when visual editor enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ features: { use_visual_editor: true } }),
    );

    expect(yaml).toContain("type: rich-text");
  });

  test("team Biography field respects visual editor", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "team"],
        features: { use_visual_editor: true },
      }),
    );
    const teamSection = getSection("team")(yaml);

    expect(teamSection).toContain("label: Biography");
    expect(teamSection).toContain("type: rich-text");
  });

  test("tabs component uses rich-text body when visual editor enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "products", "categories"],
        features: { use_visual_editor: true },
      }),
    );

    expect(yaml).toContain("component: tabs");
    const componentsSection = yaml.substring(
      yaml.indexOf("components:"),
      yaml.indexOf("\ncontent:"),
    );
    expect(componentsSection).toContain("type: rich-text");
  });
});

describe("generatePagesYaml events", () => {
  const getEventsSection = getSection("events");

  test("includes location/date fields when event_locations_and_dates enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "events"],
        features: { event_locations_and_dates: true },
      }),
    );
    const section = getEventsSection(yaml);

    expect(section).toContain("name: event_date");
    expect(section).toContain("name: event_location");
    expect(section).toContain("name: map_embed_src");
  });

  test("excludes location/date fields when disabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ collections: ["pages", "events"] }),
    );
    const section = getEventsSection(yaml);

    expect(section).not.toContain("name: event_date");
    expect(section).not.toContain("name: event_location");
  });

  test("view config includes date fields only when enabled", () => {
    const enabled = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "events"],
        features: { event_locations_and_dates: true },
      }),
    );
    const disabled = generatePagesYaml(
      createTestConfig({ collections: ["pages", "events"] }),
    );

    expect(getEventsSection(enabled)).toContain("event_date");
    expect(getEventsSection(disabled)).not.toContain("- event_date");
  });
});

describe("generatePagesYaml add_ons", () => {
  test("products include add_ons when enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "products", "categories"],
        features: { add_ons: true },
      }),
    );
    const section = getSection("products")(yaml);

    expect(section).toContain("name: add_ons");
  });

  test("products exclude add_ons when disabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "products", "categories"],
      }),
    );
    const section = getSection("products")(yaml);

    expect(section).not.toContain("name: add_ons");
  });

  test("add_ons never appears on non-product collections", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "products", "categories", "news"],
        features: { add_ons: true },
      }),
    );

    expect(getSection("news")(yaml)).not.toContain("name: add_ons");
    expect(getSection("pages")(yaml)).not.toContain("name: add_ons");
  });

  test("add_ons intro respects visual editor setting", () => {
    const withEditor = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "products", "categories"],
        features: { add_ons: true, use_visual_editor: true },
      }),
    );
    const addOnsStart = withEditor.indexOf("name: add_ons");
    const addOnsSection = withEditor.substring(addOnsStart, addOnsStart + 500);

    expect(addOnsSection).toContain("type: rich-text");
  });
});

describe("generatePagesYaml below_products", () => {
  test("categories include below_products when enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "categories"],
        features: { below_products: true },
      }),
    );
    const section = getSection("categories")(yaml);

    expect(section).toContain("name: below_products");
  });

  test("categories exclude below_products when disabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ collections: ["pages", "categories"] }),
    );
    const section = getSection("categories")(yaml);

    expect(section).not.toContain("name: below_products");
  });
});

describe("generatePagesYaml view config", () => {
  const getViewSection = (yaml, collectionName) => {
    const pattern = new RegExp(
      `name: ${collectionName}[\\s\\S]*?view:[\\s\\S]*?(?=\\n  - name:|\\n  - type:|$)`,
    );
    const match = yaml.match(pattern);
    return match ? match[0] : null;
  };

  test("pages view excludes permalink when feature disabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ features: { permalinks: false } }),
    );
    const view = getViewSection(yaml, "pages");

    expect(view).not.toContain("- permalink");
  });

  test("pages view includes permalink when feature enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ features: { permalinks: true } }),
    );
    const view = getViewSection(yaml, "pages");

    expect(view).toContain("- permalink");
  });

  test("pages view excludes header_text when header_images disabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ features: { header_images: false } }),
    );
    const view = getViewSection(yaml, "pages");

    expect(view).not.toContain("- header_text");
    expect(view).toContain("- meta_title");
  });
});

describe("generatePagesYaml blocks", () => {
  test("adds blocks field to products when use_blocks enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "products", "categories"],
        features: { use_blocks: true },
      }),
    );

    expect(getSection("products")(yaml)).toContain("name: blocks");
  });

  test("does not add blocks to products when use_blocks disabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "products", "categories"],
      }),
    );

    expect(getSection("products")(yaml)).not.toContain("name: blocks");
  });

  test("does not duplicate blocks on pages when use_blocks enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ features: { use_blocks: true } }),
    );
    const pagesSection = getSection("pages")(yaml);
    const matches = pagesSection.match(/name: blocks/g);

    expect(matches).toHaveLength(1);
  });

  test("does not add blocks to snippets", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "snippets"],
        features: { use_blocks: true },
      }),
    );

    expect(getSection("snippets")(yaml)).not.toContain("name: blocks");
  });
});

describe("generatePagesYaml custom blocks collections", () => {
  test("generates collection entries for custom blocks", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ customBlocksCollections: ["clients", "services"] }),
    );

    expect(yaml).toContain("name: clients");
    expect(yaml).toContain("label: Clients");
    expect(yaml).toContain("name: services");
    expect(yaml).toContain("label: Services");
  });

  test("custom blocks collections include blocks and standard fields", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ customBlocksCollections: ["clients"] }),
    );
    const section = getSection("clients")(yaml);

    expect(section).toContain("name: blocks");
    expect(section).toContain("name: title");
    expect(section).toContain("name: body");
  });

  test("custom blocks collections respect hasSrcFolder", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        hasSrcFolder: false,
        customBlocksCollections: ["clients"],
      }),
    );

    expect(yaml).toContain("path: clients");
    expect(yaml).not.toContain("path: src/clients");
  });

  test("custom blocks collections respect optional features", () => {
    const withFeatures = generatePagesYaml(
      createTestConfig({
        features: { permalinks: true, galleries: true },
        customBlocksCollections: ["clients"],
      }),
    );
    const withoutFeatures = generatePagesYaml(
      createTestConfig({
        features: { permalinks: false, galleries: false },
        customBlocksCollections: ["clients"],
      }),
    );

    expect(getSection("clients")(withFeatures)).toContain("name: permalink");
    expect(getSection("clients")(withoutFeatures)).not.toContain(
      "name: permalink",
    );
  });

  test("handles multi-word slugs correctly", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ customBlocksCollections: ["case-studies"] }),
    );

    expect(yaml).toContain("name: case-studies");
    expect(yaml).toContain("label: Case Studies");
  });

  test("handles empty customBlocksCollections", () => {
    const yaml = generatePagesYaml(
      createTestConfig({ customBlocksCollections: [] }),
    );

    expect(yaml).toContain("name: pages");
  });
});
