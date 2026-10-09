/**
 * The publish transforms prepare repository markdown for rendering as a
 * guide page: the page's title comes from the guide header, so the
 * document's own title heading is dropped; every repository-relative link
 * must resolve to a published route or a GitHub file, because a built page
 * has no repository layout to resolve it against; and Liquid openers are
 * escaped everywhere, because the references document Liquid syntax the
 * markdown block would otherwise execute.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { withTempDir } from "#test/test-utils.js";
import { publishMarkdown, stripTitleHeading } from "#utils/docs-transform.js";

const ROUTES = {
  "skills/references/example.md": "/guide/reference/example/",
  "https://github.com/codeforamerica/cfa-static/blob/main/skills/references/example.md":
    "/guide/reference/example/",
};

const publish = (markdown, sourcePath, rootDir) =>
  publishMarkdown(markdown, { sourcePath, routes: ROUTES, rootDir });

describe("stripTitleHeading", () => {
  test("drops the title line and keeps everything after it", () => {
    expect(stripTitleHeading("# Title\n\n## Section\n\nBody")).toBe(
      "\n## Section\n\nBody",
    );
  });

  test("keeps fenced blocks that follow the title line", () => {
    expect(
      stripTitleHeading(
        "# Title\n\n```yaml\n# a comment, not a title\n```\n\n## Section",
      ),
    ).toBe("\n```yaml\n# a comment, not a title\n```\n\n## Section");
  });

  test("fails when a fenced block precedes the title line", () => {
    expect(() =>
      stripTitleHeading("```yaml\n# not a title\n```\n\n# Real title"),
    ).toThrow("reference document must open with a level-1 title heading");
  });

  test("fails when the first line is not a level-1 heading", () => {
    expect(() => stripTitleHeading("## Only a section")).toThrow(
      "reference document must open with a level-1 title heading",
    );
  });
});

describe("publishMarkdown link targets", () => {
  test("routes a link to a published document, fragment included", () => {
    expect(
      publish("[setup](example.md#section)", "skills/references/other.md", "/"),
    ).toBe("[setup](/guide/reference/example/#section)");
  });

  test("localizes a mapped template URL to its published route", () => {
    expect(
      publish(
        "[setup](https://github.com/codeforamerica/cfa-static/blob/main/skills/references/example.md)",
        "ARCHITECTURE.md",
        "/",
      ),
    ).toBe("[setup](/guide/reference/example/)");
  });

  test("links a repository file to its GitHub blob", () => {
    withTempDir("docs-transform-blob", (root) => {
      mkdirSync(join(root, "src/css"), { recursive: true });
      writeFileSync(join(root, "src/css/theme.scss"), "");
      expect(
        publish("[theme](../src/css/theme.scss)", "docs/example.md", root),
      ).toBe(
        "[theme](https://github.com/codeforamerica/cfa-static/blob/src/css/theme.scss)",
      );
    });
  });

  test("links a repository directory to its GitHub tree", () => {
    withTempDir("docs-transform-tree", (root) => {
      mkdirSync(join(root, "src/utils/fp"), { recursive: true });
      expect(publish("[helpers](src/utils/fp)", "ARCHITECTURE.md", root)).toBe(
        "[helpers](https://github.com/codeforamerica/cfa-static/tree/src/utils/fp)",
      );
    });
  });

  test("fails on a target that exists nowhere", () => {
    expect(() => publish("[gone](missing.md)", "ARCHITECTURE.md", "/")).toThrow(
      "docs link target does not exist",
    );
  });

  test("fails on a target that escapes the repository", () => {
    withTempDir("docs-transform-escape", (root) => {
      expect(() =>
        publish(
          "[out](../../../../etc/passwd)",
          "skills/references/x.md",
          root,
        ),
      ).toThrow("docs link escapes the repository");
    });
  });

  test("leaves external, site-absolute, and same-page targets alone", () => {
    const markdown =
      "[site](/blocks/), [external](https://11ty.dev/), [here](#section)";
    expect(publish(markdown, "ARCHITECTURE.md", "/")).toBe(markdown);
  });

  test("leaves links inside fenced code blocks alone", () => {
    expect(
      publish("```\n[raw](../example.md)\n```", "ARCHITECTURE.md", "/"),
    ).toBe("```\n[raw](../example.md)\n```");
  });

  test("does not rewrite image syntax as navigation", () => {
    expect(publish("![alt](picture.png)", "ARCHITECTURE.md", "/")).toBe(
      "![alt](picture.png)",
    );
  });
});

describe("publishMarkdown Liquid escaping", () => {
  test("escapes tag and output openers on prose lines", () => {
    expect(
      publish("use `{% image %}` and `{{ page.url }}`", "ARCHITECTURE.md", "/"),
    ).toBe('use `{{ "{%" }} image %}` and `{{ "{{" }} page.url }}`');
  });

  test("escapes openers inside fenced code blocks too", () => {
    expect(publish("```liquid\n{% image %}\n```", "ARCHITECTURE.md", "/")).toBe(
      '```liquid\n{{ "{%" }} image %}\n```',
    );
  });
});
