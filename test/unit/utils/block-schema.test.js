import { describe, expect, test } from "vitest";
import {
  BLOCK_DOCS,
  BLOCK_SCHEMAS,
  getBlockContainerWidth,
  getBlockTemplate,
  validateBlocks,
} from "#utils/block-schema.js";

const sampleValueFor = (fieldDef) => {
  if (fieldDef.list) return [];
  if (fieldDef.type === "number") return 1;
  if (fieldDef.type === "boolean") return true;
  if (fieldDef.type === "object") {
    return Object.fromEntries(
      Object.entries(fieldDef.fields).map(([key, childDef]) => [
        key,
        sampleValueFor(childDef),
      ]),
    );
  }
  return "test-value";
};

const validBlockFor = (blockType) => ({
  type: blockType,
  ...Object.fromEntries(
    Object.entries(BLOCK_SCHEMAS[blockType])
      .filter(([, fieldDef]) => fieldDef.required)
      .map(([key, fieldDef]) => [key, sampleValueFor(fieldDef)]),
  ),
});

const markdownWithUnknownKey = () => ({
  type: "markdown",
  content: "Valid",
  video_url: "bad",
});

describe("BLOCK_DOCS shape", () => {
  // One test per block so the failure message identifies the broken module.
  for (const [blockType, docs] of Object.entries(BLOCK_DOCS)) {
    test(`${blockType}: docs expose a non-empty summary`, () => {
      expect(typeof docs.summary).toBe("string");
      expect(docs.summary.length).toBeGreaterThan(0);
    });
  }
});

describe("validateBlocks accepts every schema-declared key", () => {
  // Data-driven replacement for the per-block "allows all valid keys for X"
  // tests. If a block schema drops a legitimate key, the corresponding
  // test case here will fail and name the block.
  for (const [blockType, fieldDefs] of Object.entries(BLOCK_SCHEMAS)) {
    test(`${blockType}: block with every schema key validates`, () => {
      const block = validBlockFor(blockType);
      for (const [key, fieldDef] of Object.entries(fieldDefs)) {
        block[key] = sampleValueFor(fieldDef);
      }
      expect(() => validateBlocks([block])).not.toThrow();
    });
  }
});

describe("validateBlocks accepts common wrapper keys on every block", () => {
  // Data-driven: `dark` is injected by the wrapper template, so it must
  // be accepted on every block type regardless of its own schema.
  for (const blockType of Object.keys(BLOCK_SCHEMAS)) {
    test(`${blockType}: dark accepted`, () => {
      const block = { ...validBlockFor(blockType), dark: true };
      expect(() => validateBlocks([block])).not.toThrow();
    });
  }
});

describe("validateBlocks error handling", () => {
  test("accepts an empty blocks array", () => {
    expect(() => validateBlocks([])).not.toThrow();
  });

  test("accepts a block with only a type (empty schema)", () => {
    // Blocks like "content" and "properties" have an empty schema.
    // Pick one dynamically so the test doesn't break if the list changes.
    const emptySchemaType = Object.entries(BLOCK_SCHEMAS).find(
      ([, fields]) => Object.keys(fields).length === 0,
    )?.[0];
    expect(emptySchemaType).toBeDefined();
    expect(() => validateBlocks([{ type: emptySchemaType }])).not.toThrow();
  });

  test("throws when a block is missing its type field", () => {
    expect(() => validateBlocks([{ title: "Hello" }])).toThrow(
      'missing required "type" field',
    );
  });

  test("throws when a block uses an unknown type", () => {
    expect(() => validateBlocks([{ type: "unknown-type" }])).toThrow(
      'Unknown block type "unknown-type"',
    );
  });

  test("throws when a block has an unknown key and lists allowed keys", () => {
    const blocks = [markdownWithUnknownKey()];
    expect(() => validateBlocks(blocks)).toThrow('unknown keys: "video_url"');
    expect(() => validateBlocks(blocks)).toThrow("Allowed keys:");
  });

  test("lists every unknown key when multiple are present", () => {
    const blocks = [{ type: "stats", foo: "bar", baz: "qux" }];
    expect(() => validateBlocks(blocks)).toThrow('"foo"');
    expect(() => validateBlocks(blocks)).toThrow('"baz"');
  });

  test("reports the offending block index (1-based) in error messages", () => {
    const blocks = [
      { type: "section-header", intro: "## Hello" },
      { type: "markdown", content: "Valid", video_url: "bad" },
    ];
    expect(() => validateBlocks(blocks)).toThrow("block 2");
  });

  test("appends caller-supplied context to the error message", () => {
    const blocks = [markdownWithUnknownKey()];
    expect(() => validateBlocks(blocks, " in test-file.html")).toThrow(
      "in test-file.html",
    );
  });

  test("rejects keys borrowed from a sibling block variant", () => {
    // split-callout and split-image share a base but diverge: figure_src
    // belongs to split-image, not split-callout. This guards against
    // cross-variant key leaks.
    const blocks = [
      { type: "split-callout", content: "Valid", figure_src: "/img.jpg" },
    ];
    expect(() => validateBlocks(blocks)).toThrow('unknown keys: "figure_src"');
  });

  test("accepts dark boolean on any block", () => {
    for (const dark of [true, false]) {
      const blocks = [{ type: "section-header", intro: "x", dark }];
      expect(() => validateBlocks(blocks)).not.toThrow();
    }
  });

  test("rejects removed container_width key", () => {
    const blocks = [
      { type: "section-header", intro: "x", container_width: "wide" },
    ];
    expect(() => validateBlocks(blocks)).toThrow(
      'unknown keys: "container_width"',
    );
  });

  test("rejects removed section_class key", () => {
    const blocks = [
      { type: "section-header", intro: "x", section_class: "dark" },
    ];
    expect(() => validateBlocks(blocks)).toThrow(
      'unknown keys: "section_class"',
    );
  });

  test("collects errors from all blocks rather than stopping at the first", () => {
    const blocks = [
      { type: "markdown", content: "Valid", video_url: "bad" },
      { type: "stats", items: [], bogus_key: "x" },
    ];
    expect(() => validateBlocks(blocks)).toThrow("block 1");
    expect(() => validateBlocks(blocks)).toThrow("block 2");
    expect(() => validateBlocks(blocks)).toThrow('"video_url"');
    expect(() => validateBlocks(blocks)).toThrow('"bogus_key"');
  });
});

describe("validateBlocks field-type validation", () => {
  // These tests lock in the fix for a cryptic "Input data should be a
  // String" markdown-it failure that surfaced when a contact-form block's
  // `content` was authored as a nested structure instead of a plain
  // string. The validator now catches the bad shape up front and names
  // the offending block, field, and file.

  test("rejects a markdown field authored as an array", () => {
    const blocks = [{ type: "markdown", content: ["a", "b"] }];
    expect(() => validateBlocks(blocks)).toThrow(
      'Block "markdown" field "content" must be a string but got array',
    );
  });

  test("rejects a markdown field authored as an object", () => {
    const blocks = [{ type: "markdown", content: { text: "hi" } }];
    expect(() => validateBlocks(blocks)).toThrow(
      'Block "markdown" field "content" must be a string but got object',
    );
  });

  test("rejects a string field authored as a number", () => {
    const blocks = [{ type: "link-button", text: 42, href: "/x" }];
    expect(() => validateBlocks(blocks)).toThrow(
      'Block "link-button" field "text" must be a string but got number',
    );
  });

  test("rejects a number field authored as a string", () => {
    const blocks = [
      {
        type: "iframe-embed",
        src: "https://example.com",
        name: "Demo",
        width: "560",
      },
    ];
    expect(() => validateBlocks(blocks)).toThrow(
      'Block "iframe-embed" field "width" must be a number but got string',
    );
  });

  test("rejects a boolean field authored as a string", () => {
    const blocks = [{ type: "features", items: [], center: "yes" }];
    expect(() => validateBlocks(blocks)).toThrow(
      'Block "features" field "center" must be a boolean but got string',
    );
  });

  test("rejects a list field authored as a scalar", () => {
    const blocks = [{ type: "downloads", items: "oops" }];
    expect(() => validateBlocks(blocks)).toThrow(
      'Block "downloads" field "items" must be an array but got string',
    );
  });

  test("rejects an object field authored as an array", () => {
    const blocks = [
      { type: "cta", content: "Hi", button: [{ text: "x", href: "/" }] },
    ];
    expect(() => validateBlocks(blocks)).toThrow(
      'Block "cta" field "button" must be an object but got array',
    );
  });

  test("rejects dark field authored as a non-boolean", () => {
    const blocks = [{ type: "section-header", intro: "x", dark: "true" }];
    expect(() => validateBlocks(blocks)).toThrow(
      'Block "section-header" field "dark" must be a boolean but got string',
    );
  });

  test("allows null to omit an optional field", () => {
    const blocks = [{ type: "markdown", content: "Valid", compact: null }];
    expect(() => validateBlocks(blocks)).not.toThrow();
  });

  test("field-type error includes the file context", () => {
    const blocks = [{ type: "markdown", content: ["a"] }];
    expect(() => validateBlocks(blocks, " in src/pages/widget.md")).toThrow(
      "in src/pages/widget.md",
    );
  });

  test("field-type error reports the block index", () => {
    const blocks = [
      { type: "section-header", intro: "x" },
      { type: "markdown", content: { bad: true } },
    ];
    expect(() => validateBlocks(blocks)).toThrow("block 2");
  });
});

describe("validateBlocks required-field validation", () => {
  test.each([
    undefined,
    null,
    "",
    "   ",
  ])("rejects a missing or blank top-level required field: %s", (content) => {
    const block = { type: "markdown" };
    if (content !== undefined) block.content = content;
    expect(() => validateBlocks([block])).toThrow(
      'Block "markdown" is missing required "content" field',
    );
  });

  test("accepts false, zero, and an empty required list as present values", () => {
    expect(() =>
      validateBlocks([
        { type: "features", items: [] },
        { type: "stats", items: [{ value: 0, label: false }] },
      ]),
    ).not.toThrow();
  });

  test("does not require children of an omitted optional object", () => {
    expect(() =>
      validateBlocks([{ type: "cta", content: "Valid" }]),
    ).not.toThrow();
  });

  test("requires children when an optional object is present", () => {
    expect(() =>
      validateBlocks([
        { type: "cta", content: "Valid", button: { text: "Go" } },
      ]),
    ).toThrow('Block "cta" "button" is missing required "href" field');
  });

  test("collects every missing required field in an object-list entry", () => {
    expect(() => validateBlocks([{ type: "downloads", items: [{}] }])).toThrow(
      /"items\[0\]" is missing required "file"[\s\S]*"items\[0\]" is missing required "label"/,
    );
  });

  test("allows non-object stat entries supported by the renderer", () => {
    expect(() =>
      validateBlocks([{ type: "stats", items: ["35+|Block types"] }]),
    ).not.toThrow();
  });

  test.each([
    null,
    "file.txt",
    0,
    false,
    [],
  ])("rejects a non-object entry in an object list: %s", (item) => {
    expect(() =>
      validateBlocks([{ type: "downloads", items: [item] }]),
    ).toThrow('Block "downloads" field "items[0]" must be an object');
  });

  test("rejects unsupported scalar stat entries", () => {
    expect(() => validateBlocks([{ type: "stats", items: [35] }])).toThrow(
      'Block "stats" field "items[0]" must be an object or pipe-delimited string',
    );
  });

  test.each([
    "",
    "35+",
    "|Block types",
    "35+|",
    "35+|Blocks|Ignored",
  ])("rejects a malformed pipe-delimited stat entry: %s", (item) => {
    expect(() => validateBlocks([{ type: "stats", items: [item] }])).toThrow(
      'Block "stats" field "items[0]" must be an object or pipe-delimited string',
    );
  });

  test("allows FAQ blocks to use page-level FAQs", () => {
    expect(() => validateBlocks([{ type: "faqs" }])).not.toThrow();
  });
});

describe("getBlockContainerWidth", () => {
  test("defaults to wide for blocks without an explicit width", () => {
    expect(getBlockContainerWidth("markdown")).toBe("wide");
    expect(getBlockContainerWidth("features")).toBe("wide");
    expect(getBlockContainerWidth("section-header")).toBe("wide");
  });

  test("returns full for full-bleed blocks", () => {
    for (const type of [
      "image-background",
      "marquee-images",
      "hero",
      "split-full",
    ]) {
      expect(getBlockContainerWidth(type)).toBe("full");
    }
  });

  test("returns narrow for icon-links", () => {
    expect(getBlockContainerWidth("icon-links")).toBe("narrow");
  });

  test("throws on unknown block types", () => {
    expect(() => getBlockContainerWidth("not-a-real-block")).toThrow(
      'Unknown block type "not-a-real-block"',
    );
  });
});

describe("getBlockTemplate", () => {
  test("derives the include-relative path from the block type", () => {
    expect(getBlockTemplate("hero")).toBe("design-system/blocks/hero.html");
    expect(getBlockTemplate("section-header")).toBe(
      "design-system/blocks/section-header.html",
    );
  });

  test("honors the per-module template override (split-* variants)", () => {
    for (const type of [
      "split-image",
      "split-code",
      "split-icon-links",
      "split-html",
    ]) {
      expect(getBlockTemplate(type)).toBe("design-system/split.html");
    }
  });

  test("throws on unknown block types and lists valid ones", () => {
    expect(() => getBlockTemplate("not-a-real-block")).toThrow(
      'Unknown block type "not-a-real-block"',
    );
    expect(() => getBlockTemplate("not-a-real-block")).toThrow("Valid types:");
  });
});
