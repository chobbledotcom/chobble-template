import fs from "node:fs";
import { join } from "node:path";
import metaData from "#data/meta.json" with { type: "json" };
import siteData from "#data/site.json" with { type: "json" };
import { IMAGES_DIR } from "#lib/paths.js";

const getLogoUrl = () => {
  const logoPath = join(IMAGES_DIR, "logo.png");
  return fs.existsSync(logoPath) ? `${siteData.url}/images/logo.png` : null;
};

const getUniqueFounders = () => {
  const founders = metaData.organization?.founders || [];
  return [...new Map(founders.map((f) => [f.name, f])).values()];
};

const getSameAs = () => {
  const urls = Object.values(siteData.socials || {});
  return [...new Set(urls.filter((url) => url && !url.startsWith("/")))];
};

const buildSiteMeta = (logoUrl) => ({
  name: siteData.name,
  description: siteData.description,
  url: siteData.url,
  ...(logoUrl && { logo: { src: logoUrl, width: 512, height: 512 } }),
});

const buildOrganization = (logoUrl) => ({
  name: siteData.name,
  url: siteData.url,
  description: metaData.organization?.description || siteData.description,
  ...(logoUrl && { logo: logoUrl }),
  ...metaData.organization,
  founders: getUniqueFounders(),
  sameAs: getSameAs(),
});

export default function () {
  const logoUrl = getLogoUrl();
  return {
    site: buildSiteMeta(logoUrl),
    language: metaData.language || "en-GB",
    image: { src: `${siteData.url}/images/placeholder.jpg` },
    organization: buildOrganization(logoUrl),
  };
}
