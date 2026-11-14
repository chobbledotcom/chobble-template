import { describe, expect, test } from "vitest";
import YAML from "yaml";
import { createDefaultConfig } from "#scripts/customise-cms/config.js";
import { generatePagesYaml } from "#scripts/customise-cms/generator.js";
import {
  collectReferenceFields,
  getCollectionMap,
} from "#test/unit/utils/pages-yml-helpers.js";

/**
 * @type {import('#scripts/customise-cms/config.js').CmsFeatures}
 */
const DISABLED_FEATURES = {
  permalinks: false,
  redirects: false,
  faqs: false,
  galleries: false,
  no_index: false,
};

/**
 * @param {Object} [overrides]
 * @returns {import('#scripts/customise-cms/config.js').CmsConfig}
 */
const createTestConfig = (overrides = {}) => ({
  collections: overrides.collections ?? ["pages"],
  features: { ...DISABLED_FEATURES, ...(overrides.features ?? {}) },
  hasSrcFolder: overrides.hasSrcFolder ?? true,
  customBlocksCollections: overrides.customBlocksCollections ?? [],
});

/**
 * Extract a named top-level collection section from YAML output.
 * Anchors on the 2-space collection indent so names that also appear
 * as block references (e.g. `{ name: guide-categories, component: ... }`)
 * deeper in the tree don't match.
 * @param {string} collectionName
 * @returns {(yaml: string) => string}
 */
const getSection = (collectionName) => (yaml) => {
  const marker = `\n  - name: ${collectionName}\n`;
  const markerIndex = yaml.indexOf(marker);
  if (markerIndex === -1) return "";
  const start = markerIndex + 1;
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
    expect(collectionNames).toContain("news");
    expect(collectionNames).toContain("guide-categories");
    expect(collectionNames).toContain("guide-pages");
    expect(collectionNames).toContain("site");
  });

  test("uses required names in every collection filename", () => {
    const config = createDefaultConfig();
    config.customBlocksCollections = ["clients"];
    const parsed = YAML.parse(generatePagesYaml(config));
    const collections = parsed.content.filter(
      (entry) => entry.type === "collection",
    );

    for (const collection of collections) {
      expect(collection.filename).toContain("{name}");
      expect(collection.fields).toContainEqual(
        expect.objectContaining({ name: "name", required: true }),
      );
    }
  });

  test("does not generate primary placeholders", () => {
    expect(generatePagesYaml(createDefaultConfig())).not.toContain("{primary}");
  });

  test("references existing collections by required frontmatter name", () => {
    const parsed = YAML.parse(generatePagesYaml(createDefaultConfig()));
    const collections = getCollectionMap(parsed);

    for (const reference of collectReferenceFields(parsed)) {
      const target = collections.get(reference.options.collection);
      expect(target).toBeDefined();
      expect(target.fields).toContainEqual(
        expect.objectContaining({ name: "name", required: true }),
      );
      expect(reference.options.search).toBe("fields.name");
      expect(reference.options.label).toBe("{fields.name}");
    }
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
    expect(getSection("snippets")(yaml)).toContain("- README.md");
    expect(getSection("snippets")(yaml)).toContain("name: body");
  });

  test("excludes snippets when not in collections list", () => {
    const yaml = generatePagesYaml(createTestConfig());

    expect(yaml).not.toContain("name: snippets");
  });

  test("always includes file-based configs (site, meta, alt-tags)", () => {
    const yaml = generatePagesYaml(createTestConfig());

    expect(yaml).toContain("name: site");
    expect(yaml).toContain("name: meta");
    expect(yaml).toContain("name: alt-tags");
  });

  test("requires the complete site identity", () => {
    const parsed = YAML.parse(generatePagesYaml(createTestConfig()));
    const site = parsed.content.find((entry) => entry.name === "site");

    for (const name of ["name", "url", "description"]) {
      expect(site.fields).toContainEqual(
        expect.objectContaining({ name, required: true }),
      );
    }
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
  test("includes faqs/gallery fields when enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "news"],
        features: { faqs: true, galleries: true },
      }),
    );

    expect(yaml).toContain("name: faqs");
    expect(yaml).toContain("name: gallery");
  });

  test("excludes optional fields from pages when disabled", () => {
    const yaml = generatePagesYaml(createTestConfig());
    const parsed = YAML.parse(yaml);
    const pagesCollection = parsed.content.find((c) => c.name === "pages");
    const fieldNames = pagesCollection.fields.map((f) => f.name);

    expect(fieldNames).not.toContain("faqs");
    expect(fieldNames).not.toContain("redirect_from");
  });

  test("includes permalink and redirect_from when enabled", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "news"],
        features: { permalinks: true, redirects: true },
      }),
    );

    expect(yaml).toContain("name: permalink");
    expect(yaml).toContain("name: redirect_from");
  });
});

describe("generatePagesYaml reference fields", () => {
  test("includes guide-category reference on guide-pages when selected", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "guide-categories", "guide-pages"],
      }),
    );
    const section = getSection("guide-pages")(yaml);

    expect(section).toContain("collection: guide-categories");
  });

  test("excludes guide-category reference when guide-categories not selected", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "guide-pages"],
      }),
    );
    const section = getSection("guide-pages")(yaml);

    expect(section).not.toContain("collection: guide-categories");
  });

  test("news author is a plain string, not a reference", () => {
    const parsed = YAML.parse(
      generatePagesYaml(createTestConfig({ collections: ["pages", "news"] })),
    );
    const news = parsed.content.find((entry) => entry.name === "news");
    const author = news.fields.find((field) => field.name === "author");

    expect(author).toMatchObject({ type: "string" });
  });
});

describe("generatePagesYaml markdown editing", () => {
  test("edits every markdown field in the visual rich-text editor", () => {
    const yaml = generatePagesYaml(createDefaultConfig());

    expect(yaml).toContain("type: rich-text");
    expect(yaml).not.toContain("type: code");
    expect(yaml).not.toContain("language: markdown");
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
});

describe("generatePagesYaml blocks", () => {
  test("adds blocks field to news", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "news"],
      }),
    );

    expect(getSection("news")(yaml)).toContain("name: blocks");
  });

  test("does not duplicate blocks on pages", () => {
    const yaml = generatePagesYaml(createTestConfig());
    const pagesSection = getSection("pages")(yaml);
    const matches = pagesSection.match(/name: blocks/g);

    expect(matches).toHaveLength(1);
  });

  test("does not add blocks to snippets", () => {
    const yaml = generatePagesYaml(
      createTestConfig({
        collections: ["pages", "snippets"],
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
    expect(section).toContain("name: name");
    expect(section).not.toContain("name: body");
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

describe("generatePagesYaml validation", () => {
  test("throws on a collection name with no definition", () => {
    const config = {
      ...createDefaultConfig(),
      collections: ["pages", "bogus-collection"],
    };

    expect(() => generatePagesYaml(config)).toThrow(
      'Unknown collection "bogus-collection"',
    );
  });
});
