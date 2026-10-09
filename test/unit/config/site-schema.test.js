import { describe, expect, test } from "vitest";
import { SITE_SCHEMA, siteErrors } from "#config/site-schema.js";
import site from "#data/site.json" with { type: "json" };
import { getSiteConfig } from "#scripts/customise-cms/static-configs.js";

describe("siteErrors", () => {
  test("accepts the template's site data", () => {
    expect(siteErrors(site)).toEqual([]);
  });

  test("names a field site.json does not accept", () => {
    expect(siteErrors({ ...site, tagline: "Hello" })).toEqual([
      `site.json has unknown keys: tagline. Accepted keys: ${Object.keys(SITE_SCHEMA).join(", ")}`,
    ]);
  });

  test("rejects a logo or socials of the wrong type", () => {
    expect(siteErrors({ ...site, logo: true, socials: ["/feed.xml"] })).toEqual(
      [
        "site.json 'logo' must be a string, got: true",
        "site.json 'socials' must be an object, got: [\"/feed.xml\"]",
      ],
    );
  });
});

describe("SITE_SCHEMA", () => {
  test("describes every field for the generated reference", () => {
    expect(
      Object.entries(SITE_SCHEMA).filter(([, field]) => !field.description),
    ).toEqual([]);
  });

  test("feeds the CMS site editor every labelled field, in order", () => {
    const { fields, path } = getSiteConfig("src/_data");
    expect(path).toBe("src/_data/site.json");
    expect(fields.map((field) => field.name)).toEqual(
      Object.keys(SITE_SCHEMA).filter((key) => SITE_SCHEMA[key].label),
    );
    expect(fields.find((field) => field.name === "name")).toEqual({
      name: "name",
      type: "string",
      label: "Site Name",
      required: true,
    });
    expect(
      fields
        .find((field) => field.name === "socials")
        .fields.map((f) => f.name),
    ).toEqual(Object.keys(SITE_SCHEMA.socials.fields ?? {}));
  });
});
