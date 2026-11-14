import { siteUrl } from "#config/validated-config.js";
import siteData from "./site.json" with { type: "json" };

// SITE_URL lets a deployment (e.g. a staging deploy) override
// the canonical origin without editing site.json.
/** @type {import("#lib/types").SiteInfo} */
const site = {
  ...siteData,
  url: siteUrl,
};

export default function () {
  return site;
}
