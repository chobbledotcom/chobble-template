import MarkdownIt from "markdown-it";
import { describe, expect, test } from "vitest";
import { CONFIG_SCHEMA } from "#config/config-schema.js";
import { SITE_SCHEMA } from "#config/site-schema.js";
import { COLLECTIONS } from "#scripts/customise-cms/collections.js";
import { FEATURE_QUESTIONS } from "#scripts/customise-cms/feature-questions.js";
import {
  readDeveloperReferenceInputs,
  renderDeveloperReference,
} from "#scripts/generate-developer-reference.js";
import { getTableRows as rows } from "#test/test-utils.js";

const markdown = new MarkdownIt({ html: true });
/** Commands, collections, features, site identity, then config settings. */
const CONFIG_TABLE = 4;
const rendered = (inputs) =>
  new DOMParser().parseFromString(
    markdown.render(renderDeveloperReference(inputs)),
    "text/html",
  );

describe("site-builder reference", () => {
  test("renders the supplied Node requirement and installation command", () => {
    const inputs = readDeveloperReferenceInputs();
    const source = renderDeveloperReference({
      ...inputs,
      packageJson: { ...inputs.packageJson, engines: { node: ">=99" } },
    });
    expect(source).toContain("Use Node `>=99`");
    expect(
      markdown
        .parse(source, {})
        .filter((token) => token.type === "fence")
        .map((token) => token.content.trim()),
    ).toEqual(["npm install"]);
  });

  test("lists site-building commands rather than the maintenance command inventory", () => {
    const commands = rows(
      rendered(readDeveloperReferenceInputs()).querySelector("table"),
    ).map(([command]) => command);
    expect(commands).toEqual([
      "npm run serve",
      "npm run build",
      "npm run customise-cms",
      "npm run check:links",
      "npm run check:a11y",
      "npm run lint:scss",
      "npm run test",
      "npm run generate-references",
    ]);
  });

  test("preserves actual script definitions including literal shell syntax", () => {
    const inputs = readDeveloperReferenceInputs();
    const command = "build | tool && other `cmd` '**/*.js' <input >output";
    const document = rendered({
      ...inputs,
      packageJson: {
        ...inputs.packageJson,
        scripts: {
          ...inputs.packageJson.scripts,
          build: command,
          internal: "PRIVATE_IMPLEMENTATION",
        },
      },
    });
    expect(rows(document.querySelector("table"))).toContainEqual([
      "npm run build",
      command,
    ]);
    expect(document.body.textContent).not.toContain("PRIVATE_IMPLEMENTATION");
  });

  test("fails clearly when a selected command no longer exists", () => {
    const inputs = readDeveloperReferenceInputs();
    const { build, ...scripts } = inputs.packageJson.scripts;
    expect(build).toBeDefined();
    expect(() =>
      renderDeveloperReference({
        ...inputs,
        packageJson: { ...inputs.packageJson, scripts },
      }),
    ).toThrow("Missing site-builder script: build");
  });

  test("reads CMS choices from the same definitions used by the editor", () => {
    const inputs = readDeveloperReferenceInputs();
    expect(inputs.collections).toBe(COLLECTIONS);
    expect(inputs.features).toBe(FEATURE_QUESTIONS);
    const tables = rendered(inputs).querySelectorAll("table");
    expect(rows(tables[1]).map(([name, path]) => [name, path])).toEqual(
      COLLECTIONS.map(({ name, path }) => [name, path]),
    );
    expect(rows(tables[2])).toEqual(FEATURE_QUESTIONS);
  });

  test("shows collection requirements and dependencies without changing their order", () => {
    const inputs = readDeveloperReferenceInputs();
    const definition = {
      label: "Fixture",
      path: "content/fixture",
      description: "Fixture",
      dependencies: [],
    };
    const collections = [
      { ...definition, name: "required", required: true },
      { ...definition, name: "internal", internal: true },
      {
        ...definition,
        name: "optional",
        dependencies: ["required", "internal"],
      },
    ];
    const table = rendered({ ...inputs, collections }).querySelectorAll(
      "table",
    )[1];
    expect(rows(table)).toEqual([
      ["required", "content/fixture", "Required", "None"],
      ["internal", "content/fixture", "Internal", "None"],
      ["optional", "content/fixture", "Optional", "required, internal"],
    ]);
    expect(collections.map(({ name }) => name)).toEqual([
      "required",
      "internal",
      "optional",
    ]);
  });

  test("keeps feature labels literal in the rendered table", () => {
    const label = "Enable `editor` | **bold** <script> & [link](url)?";
    const table = rendered({
      ...readDeveloperReferenceInputs(),
      features: [["faqs", label]],
    }).querySelectorAll("table")[2];
    expect(rows(table)).toEqual([["faqs", label]]);
    expect(table.querySelectorAll("script, strong, a")).toHaveLength(0);
  });

  test("lists every site.json field from the schema the build validates against", () => {
    const inputs = readDeveloperReferenceInputs();
    expect(inputs.identity).toBe(SITE_SCHEMA);
    const table = rendered(inputs).querySelectorAll("table")[3];
    expect(rows(table)).toContainEqual([
      "url",
      "string",
      "required",
      "None",
      "Site URL",
      expect.stringContaining("SITE_URL"),
    ]);
    expect(
      rows(table)
        .map(([field]) => field)
        .filter((field) => !field.includes(".")),
    ).toEqual(Object.keys(SITE_SCHEMA));
  });

  test("lists every config setting from the schema the build validates against", () => {
    const inputs = readDeveloperReferenceInputs();
    expect(inputs.settings).toBe(CONFIG_SCHEMA);
    const table = rendered(inputs).querySelectorAll("table")[CONFIG_TABLE];
    expect(rows(table).map(([setting]) => setting)).toEqual(
      Object.keys(CONFIG_SCHEMA),
    );
  });

  test("shows each setting's type, default, choices, and literal description", () => {
    const settings = {
      menu: {
        type: "string",
        choices: ["a", "b"],
        default: "a",
        description: "Pick `one` | **literally**",
      },
      tags: { type: "string", list: true, default: [], description: "Tags" },
    };
    const table = rendered({
      ...readDeveloperReferenceInputs(),
      settings,
    }).querySelectorAll("table")[CONFIG_TABLE];
    expect(rows(table)).toEqual([
      ["menu", "string", '"a"', "a, b", "Pick `one` | **literally**"],
      ["tags", "array<string>", "[]", "Any", "Tags"],
    ]);
    expect(table.querySelectorAll("strong")).toHaveLength(0);
  });

  test("links to authoring and theme sources without embedding implementation inventories", () => {
    const document = rendered(readDeveloperReferenceInputs());
    const links = [...document.querySelectorAll("a")].map((link) =>
      link.getAttribute("href"),
    );
    expect(links).toContain(
      "../skills/cfa-static-site-builder/references/blocks.md",
    );
    expect(links).toContain("../src/css/theme.scss");
    expect(links).toContain("../src/css/_variables.scss");
    expect(
      [...document.querySelectorAll("h2")].map(
        (heading) => heading.textContent,
      ),
    ).toEqual([
      "Runtime And Commands",
      "CMS Choices",
      "Site Identity",
      "Site Configuration",
      "Content And Layouts",
      "Themes",
    ]);
    expect(document.querySelectorAll("pre")).toHaveLength(1);
  });
});
