import fs from "node:fs";
import { join } from "node:path";
import metaData from "#data/meta.json" with { type: "json" };
import getSiteData from "#data/site.js";
import { IMAGES_DIR } from "#lib/paths.js";

/**
 * Computes site metadata from configuration and social links
 * @returns {Object} Computed metadata
 */
export default function () {
  /**
   * @returns {{ description: string | null, founders: Array<{ name?: string }>, [key: string]: unknown }}
   */
  const getOrganization = () => {
    /** @param {unknown} description */
    const normalizeDescription = (description) =>
      typeof description === "string" ? description : null;

    /** @param {unknown} founders @returns {Array<{ name?: string }>} */
    const normalizeFounders = (founders) => {
      if (founders === undefined || founders === null) return [];
      if (!Array.isArray(founders)) {
        throw new Error("meta.json organization.founders must be an array");
      }
      return [...founders];
    };

    if (!metaData.organization) {
      return { description: null, founders: [] };
    }

    const configured = { ...metaData.organization };
    return {
      ...configured,
      description: normalizeDescription(configured.description),
      founders: normalizeFounders(configured.founders),
    };
  };

  const siteData = getSiteData();
  const organization = getOrganization();
  const logoPath = join(IMAGES_DIR, "logo.png");
  const logoUrl = fs.existsSync(logoPath)
    ? `${siteData.url}/images/logo.png`
    : null;

  const uniqueFounders = [
    ...new Map(
      organization.founders.map((founder) => [founder.name, founder]),
    ).values(),
  ];

  const urls = Object.values(siteData.socials || {});
  const sameAs = [
    ...new Set(urls.filter((url) => url && !url.startsWith("/"))),
  ];

  return {
    site: {
      name: siteData.name,
      description: siteData.description,
      url: siteData.url,
      ...(logoUrl && { logo: { src: logoUrl, width: 512, height: 512 } }),
    },
    language: metaData.language || "en-GB",
    image: { src: logoUrl },
    organization: {
      name: siteData.name,
      url: siteData.url,
      ...(logoUrl && { logo: logoUrl }),
      ...organization,
      description: organization.description
        ? organization.description
        : siteData.description,
      founders: uniqueFounders,
      sameAs,
    },
  };
}
