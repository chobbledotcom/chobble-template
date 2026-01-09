import fs from "node:fs";
import { join } from "node:path";
import metaData from "#data/meta.json" with { type: "json" };
import siteData from "#data/site.json" with { type: "json" };
import { IMAGES_DIR } from "#lib/paths.js";

/**
 * Computes site metadata from configuration and social links
 * @typedef {Object} ComputedMetaData
 * @property {Object} site - Site information
 * @property {string} site.name - Site name
 * @property {string} site.description - Site description
 * @property {string} site.url - Site URL
 * @property {Object} [site.logo] - Logo object
 * @property {string} language - Site language
 * @property {Object} image - Placeholder image
 * @property {import("#lib/types").Organization} organization - Organization schema
 *
 * @param {Object} metaData - Meta data from meta.json
 * @param {import("#lib/types").Organization|undefined} metaData.organization - Organization info
 * @param {string} [metaData.language] - Language code
 * @param {Object} siteData - Site data from site.json
 * @param {string} siteData.name - Site name
 * @param {string} siteData.url - Site URL
 * @param {string} siteData.description - Site description
 * @param {import("#lib/types").Social|undefined} siteData.socials - Social media links
 * @returns {ComputedMetaData} Computed metadata
 */
export default function () {
  const logoPath = join(IMAGES_DIR, "logo.png");
  const logoUrl = fs.existsSync(logoPath)
    ? `${siteData.url}/images/logo.png`
    : null;

  const founders = metaData.organization?.founders || [];
  const uniqueFounders = [
    ...new Map(founders.map((f) => [f.name, f])).values(),
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
    image: { src: `${siteData.url}/images/placeholder.jpg` },
    organization: {
      name: siteData.name,
      url: siteData.url,
      description: metaData.organization?.description || siteData.description,
      ...(logoUrl && { logo: logoUrl }),
      ...metaData.organization,
      founders: uniqueFounders,
      sameAs,
    },
  };
}
