import fs from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";

const SITE = {
  name: "Configured Site",
  url: "https://configured.test",
  description: "A configured site",
  socials: {},
};

const computeWithMeta = async (meta, site = SITE) => {
  vi.doMock("#data/meta.json", () => ({ default: meta }));
  vi.doMock("#data/site.js", () => ({ default: () => site }));
  vi.resetModules();
  const { default: computeMeta } = await import("#data/metaComputed.js");
  return computeMeta();
};

afterEach(() => {
  vi.doUnmock("#data/meta.json");
  vi.doUnmock("#data/site.js");
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("metaComputed", () => {
  test.each([
    { language: "en-GB" },
    { language: "en-GB", organization: {} },
  ])("supports omitted optional organization metadata", async (meta) => {
    await expect(computeWithMeta(meta)).resolves.toMatchObject({
      organization: {
        name: SITE.name,
        description: SITE.description,
        founders: [],
      },
    });
  });

  test("rejects malformed founder metadata", async () => {
    await expect(
      computeWithMeta({ organization: { founders: "Ada Lovelace" } }),
    ).rejects.toThrow("meta.json organization.founders must be an array");
  });

  test("computes populated organization, logo, and social metadata", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const result = await computeWithMeta(
      {
        language: "cy",
        organization: {
          description: "Organization description",
          founders: [{ name: "Ada" }, { name: "Ada" }],
        },
      },
      {
        ...SITE,
        socials: {
          Github: "https://social.test/configured",
          RSS: "/feed.xml",
        },
      },
    );

    expect(result).toMatchObject({
      language: "cy",
      site: { logo: { src: "https://configured.test/images/logo.png" } },
      organization: {
        description: "Organization description",
        founders: [{ name: "Ada" }],
        sameAs: ["https://social.test/configured"],
      },
    });
  });
});
