import fs from "node:fs";
import { join } from "node:path";
import metaData from "#data/meta.json" with { type: "json" };
import siteData from "#data/site.json" with { type: "json" };
import { IMAGES_DIR } from "#lib/paths.js";

/**
 * Computes site metadata from configuration and social links
 * @returns {Object} Computed metadata
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
    image: { src: logoUrl },
    organization: {
      name: siteData.name,
      url: siteData.url,
      ...(logoUrl && { logo: logoUrl }),
      ...metaData.organization,
      description: metaData.organization?.description || siteData.description,
      founders: uniqueFounders,
      sameAs,
    },
  };
}
