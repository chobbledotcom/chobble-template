import { describe, expect, test } from "vitest";
import { analyzeBlockMarkdown } from "#test/test-utils.js";

describe("block markdown analyzer", () => {
  test.each([
    [
      "markdown",
      '{{ block.content | renderContent: "md" }}',
      "not wrapped in a .prose element",
    ],
    [
      "markdown",
      '<div class="prose">{{ block.content }}</div>',
      'typed markdown but rendered without renderContent: "md"',
    ],
    [
      "markdown",
      '<div class="prose">{{ block.content | renderContent }}</div>',
      'typed markdown but rendered without renderContent: "md"',
    ],
    [
      "markdown",
      '<div class="prose">{{ block.contnet | renderContent: "md" }}</div>',
      'unknown block field "contnet"',
    ],
    ["markdown", "{{ block.contnet }}", 'unknown block field "contnet"'],
    [
      "markdown",
      "{% assign text = block.contnet %}{{ text }}",
      'unknown block field "contnet"',
    ],
    [
      "features",
      "{% for item in block.items %}{{ item.icon_lable }}{% endfor %}",
      'unknown block field "items.icon_lable"',
    ],
    [
      "markdown",
      "{{ block.constructor }}",
      'unknown block field "constructor"',
    ],
    [
      "features",
      '<div class="prose">{% for item in block.items %}{{ item.toString | renderContent: "md" }}{% endfor %}</div>',
      'unknown block field "items.toString"',
    ],
    [
      "hero",
      '<div class="prose">{{ block.badge | renderContent: "md" }}</div>',
      "declares string",
    ],
    [
      "hero",
      '<div class="prose">{{ block.reveal | renderContent: "md" }}</div>',
      "declares string",
    ],
    [
      "features",
      '<div class="prose">{{ block.description | renderContent: "md" }}</div>',
      'unknown block field "description"',
    ],
    [
      "features",
      "{% for item in block.items %}{{ item.description }}{% endfor %}",
      'block field "items.description" is typed markdown',
    ],
    [
      "hero",
      '<div class="prose">{% for button in block.buttons %}{{ button.text | renderContent: "md" }}{% endfor %}</div>',
      "declares string",
    ],
    [
      "section-header",
      "{% assign intro = block.intro %}{{ intro }}",
      'block field "intro" is typed markdown',
    ],
    [
      "split-html",
      '<div class="prose">{{ block.figure_html | renderContent: "md" }}</div>',
      "declares intentional raw HTML",
    ],
    [
      "html",
      '<div class="prose">{{ block.content | renderContent: "md" }}</div>',
      "declares intentional raw HTML",
    ],
  ])("rejects %s output %s", (type, source, message) => {
    expect(analyzeBlockMarkdown(type, () => source)).toEqual([
      expect.stringContaining(message),
    ]);
  });

  test.each([
    [
      "markdown",
      '<div class="prose">{{ block.content | renderContent: "md" }}</div>',
    ],
    [
      "markdown",
      "<div class='prose'>{{- block.content | renderContent: 'md' -}}</div>",
    ],
    [
      "markdown",
      '<div class="prose">{{ page.content | renderContent: "md" }}</div>',
    ],
    ["features", "{{ item.description }}"],
    [
      "features",
      "{% for item in collections.news %}{{ item.description }}{% endfor %}",
    ],
    [
      "features",
      '{% for item in block.items %}<div class="prose">{{ item.description | renderContent: "md" }}</div>{% endfor %}{% for item in collections.news %}{{ item.description }}{% endfor %}',
    ],
    [
      "features",
      '{% assign cards = block.items %}{% for card in cards %}<div class="prose">{{ card.description | renderContent: "md" }}</div>{% endfor %}',
    ],
    [
      "downloads",
      "{% for item in block.items %}{% assign info = item.file | fileInfo %}{{ info.extension }}{% endfor %}",
    ],
    ["hero", "{{ block.reveal }}"],
    ["html", "{{ block.content }}"],
    ["split-html", "{{ block.figure_html }}"],
    [
      "markdown",
      '{% comment %}{{ block.typo }}{% include "missing.html" %}{% endcomment %}',
    ],
  ])("accepts %s output %s", (type, source) => {
    expect(analyzeBlockMarkdown(type, () => source)).toEqual([]);
  });

  test("rejects a missing block type at the schema resolver", () => {
    expect(() => analyzeBlockMarkdown(undefined)).toThrow(
      'Unknown block type "undefined"',
    );
  });

  test("keeps include parameter provenance under the caller's prose wrapper", () => {
    const templates = {
      "design-system/blocks/hero.html":
        '<div class="prose">{% include "body.html", body: block.content %}</div>',
      "body.html": '{{ body | renderContent: "md" }}',
    };
    expect(analyzeBlockMarkdown("hero", (path) => templates[path])).toEqual([]);
  });

  test("embedded components may alias absent optional defaults without inventing caller schema fields", () => {
    const templates = {
      "design-system/split.html": '{% include "optional.html" %}',
      "optional.html":
        "{% assign value = setting | default: block.reveal %}{% if value %}{{ value }}{% endif %}",
    };
    expect(
      analyzeBlockMarkdown("split-code", (path) => templates[path]),
    ).toEqual([]);
  });

  test("rejects string include parameters rendered as markdown", () => {
    const templates = {
      "design-system/blocks/hero.html":
        '<div class="prose">{% include "body.html", body: block.badge %}</div>',
      "body.html": '{{ body | renderContent: "md" }}',
    };
    expect(analyzeBlockMarkdown("hero", (path) => templates[path])).toEqual([
      'hero (body.html:1): block field "badge" is rendered as markdown but declares string',
    ]);
  });

  test("checks a possible block fallback for contextual include parameters", () => {
    const templates = {
      "design-system/blocks/features.html":
        '{% include "body.html", items: page.cards %}',
      "body.html":
        "{% assign cards = items | default: block.items %}{% for card in cards %}{{ card.description }}{% endfor %}",
    };
    expect(analyzeBlockMarkdown("features", (path) => templates[path])).toEqual(
      [
        'features (body.html:1): block field "items.description" is typed markdown but rendered without renderContent: "md"',
      ],
    );
  });

  test.each([
    "page.flag",
    "false",
    "nil",
  ])("checks unless branches when flag is %s", (value) => {
    const templates = {
      "design-system/blocks/markdown.html": `{% include "body.html", flag: ${value} %}`,
      "body.html":
        '{% unless flag %}<div class="prose">{{ block.contnet | renderContent: "md" }}</div>{% endunless %}',
    };
    expect(analyzeBlockMarkdown("markdown", (path) => templates[path])).toEqual(
      ['markdown (body.html:1): unknown block field "contnet"'],
    );
  });

  test.each([
    "page.cards",
    "false",
    "nil",
    "block.items",
  ])("checks unless items without a required-list contract: %s", (value) => {
    const templates = {
      "design-system/blocks/faqs.html": `{% include "body.html", items: ${value} %}`,
      "body.html": "{% unless items %}{{ block.contnet }}{% endunless %}",
    };
    expect(analyzeBlockMarkdown("faqs", (path) => templates[path])).toEqual([
      'faqs (body.html:1): unknown block field "contnet"',
    ]);
  });

  test("skips the standalone intro for a required split items override", () => {
    const templates = {
      "design-system/split.html":
        '{% include "body.html", items: block.figure_items %}',
      "body.html":
        '{% unless items %}<div class="prose">{{ block.intro_content | renderContent: "md" }}</div>{% endunless %}',
    };
    expect(
      analyzeBlockMarkdown("split-icon-links", (path) => templates[path]),
    ).toEqual([]);
  });

  test("checks only the active shared split variant against its own schema", () => {
    const source =
      '{% case block.type %}{% when "split-image" %}{{ block.figure_caption }}{% when "split-html" %}{{ block.figure_html }}{% endcase %}';
    expect(analyzeBlockMarkdown("split-html", () => source)).toEqual([]);
  });

  test("does not borrow another split variant's schema for an active branch", () => {
    const source =
      '{% case block.type %}{% when "split-html" %}{{ block.figure_caption }}{% endcase %}';
    expect(analyzeBlockMarkdown("split-html", () => source)).toEqual([
      'split-html (design-system/split.html:1): unknown block field "figure_caption"',
    ]);
  });

  test("reports actual include file and line for missing prose", () => {
    const templates = {
      "design-system/blocks/hero.html": '{% include "body.html" %}',
      "body.html": '\n{{ block.content | renderContent: "md" }}',
    };
    expect(analyzeBlockMarkdown("hero", (path) => templates[path])).toEqual([
      'hero (body.html:2): renderContent: "md" is not wrapped in a .prose element',
    ]);
  });

  test("fails loudly on cyclic static includes", () => {
    expect(() =>
      analyzeBlockMarkdown("hero", () => '{% include "body.html" %}'),
    ).toThrow("Cyclic template include:");
  });
});
