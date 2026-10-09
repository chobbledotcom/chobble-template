import { readFileSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "tinyglobby";
import { describe, expect, test } from "vitest";
import {
  CONFIG_SCHEMA,
  configErrors,
  DEFAULTS,
} from "#config/config-schema.js";
import { SITE_SCHEMA } from "#config/site-schema.js";
import { ROOT_DIR } from "#lib/paths.js";

describe("DEFAULTS", () => {
  test("holds each setting's schema default", () => {
    expect(DEFAULTS.collapse_menu).toBe("mobile");
    expect(DEFAULTS.homepage_footer_markdown).toBeNull();
    expect(DEFAULTS.phoneNumberLength).toBe(0);
    expect(Object.keys(DEFAULTS)).toEqual(Object.keys(CONFIG_SCHEMA));
  });

  test("cannot be changed by a consumer", () => {
    expect(() => {
      DEFAULTS.horizontal_nav = false;
    }).toThrow(TypeError);
  });

  test("every default fits its own setting", () => {
    expect(configErrors({ ...DEFAULTS })).toEqual([]);
  });
});

describe("configErrors", () => {
  test("accepts an empty config and null for any setting", () => {
    expect(configErrors({})).toEqual([]);
    expect(
      configErrors({ collapse_menu: null, screenshots: null, timezone: null }),
    ).toEqual([
      expect.stringContaining("config.json has unknown keys: timezone."),
    ]);
  });

  test("names unknown keys alongside every accepted key", () => {
    const [error] = configErrors({ show_breadcrumb: true });
    expect(error).toContain("unknown keys: show_breadcrumb.");
    expect(error).toContain(
      `Accepted keys: ${Object.keys(CONFIG_SCHEMA).join(", ")}`,
    );
  });

  test.each([
    ["show_breadcrumbs", "yes", 'must be a boolean, got: "yes"'],
    ["phoneNumberLength", "11", 'must be a number, got: "11"'],
    ["screenshots", [], "must be an object, got: []"],
    ["search_collections", "pages", 'must be a list of strings, got: "pages"'],
    [
      "search_collections",
      ["pages", 3],
      'must be a list of strings, got: ["pages",3]',
    ],
  ])("rejects %s set to the wrong type", (key, value, message) => {
    expect(configErrors({ [key]: value })).toEqual([
      `config.json '${key}' ${message}`,
    ]);
  });

  test("rejects values outside a setting's choices, naming the whole list", () => {
    expect(
      configErrors({
        collapse_menu: "sometimes",
        list_item_fields: ["link", "price", "date", "rating"],
      }),
    ).toEqual([
      "config.json 'collapse_menu' must be one of mobile, always, never, got: sometimes",
      "config.json 'list_item_fields' must be one of thumbnail, link, date, subtitle, got: link, price, date, rating",
    ]);
  });

  test("accepts values inside a setting's choices", () => {
    expect(
      configErrors({ language_switcher: "header", list_item_fields: ["date"] }),
    ).toEqual([]);
  });
});

describe("CONFIG_SCHEMA", () => {
  test("declares only settings the template reads", () => {
    const sources = globSync(
      ["src/**/*.{js,html,scss}", "scripts/**/*.js", ".eleventy.js"],
      {
        cwd: ROOT_DIR,
        ignore: ["src/_lib/config/config-schema.js", "src/_lib/types/**"],
      },
    ).map((file) => readFileSync(join(ROOT_DIR, file), "utf8"));
    const unread = Object.keys(CONFIG_SCHEMA).filter(
      (key) =>
        !sources.some((source) => new RegExp(`\\.${key}\\b`).test(source)),
    );
    expect(unread).toEqual([]);
  });
});

/**
 * The keys a type in config.d.ts declares, read from its source.
 * @param {string} typeName
 */
const declaredKeys = (typeName) => {
  const source = readFileSync(
    join(ROOT_DIR, "src/_lib/types/config.d.ts"),
    "utf8",
  );
  const body = source.slice(source.indexOf(`export type ${typeName} = {`));
  return [
    ...body.slice(0, body.indexOf("\n};")).matchAll(/^ {2}([A-Za-z_]+)\??:/gm),
  ]
    .map(([, key]) => key)
    .toSorted();
};

describe("config.d.ts types", () => {
  test("SiteConfig declares exactly the config schema plus the derived suffix", () => {
    expect(declaredKeys("SiteConfig")).toEqual(
      [...Object.keys(CONFIG_SCHEMA), "internal_link_suffix"].toSorted(),
    );
  });

  test("SiteInfo declares exactly the site schema", () => {
    expect(declaredKeys("SiteInfo")).toEqual(
      Object.keys(SITE_SCHEMA).toSorted(),
    );
  });
});
