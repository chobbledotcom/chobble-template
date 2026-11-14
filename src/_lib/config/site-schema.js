/**
 * Every field `src/_data/site.json` accepts, declared once.
 *
 * site.json is the site's identity: its name, canonical URL, description,
 * header logo, and social links, plus the CMS selection that
 * `npm run customise-cms` saves. Everything else derives from this table:
 * the startup validation in `#config/validated-config.js` (unknown keys,
 * missing required fields, wrong types; the URL and placeholder checks stay
 * there), the "Site Configuration" file the PagesCMS editor shows (every
 * field with a `label`), and the identity table in the generated Site Builder
 * Reference.
 */
import { schemaErrors } from "#config/data-schema.js";

/** @typedef {import("#config/data-schema.js").DataField} DataField */

/* jscpd:ignore-start -- site schema declaration data */
/** @type {Record<string, DataField>} */
const SITE_SCHEMA = {
  name: {
    type: "string",
    required: true,
    label: "Site Name",
    description:
      "The site's name: page titles, the logo's alt text, feeds, and structured data.",
  },
  url: {
    type: "string",
    required: true,
    label: "Site URL",
    description:
      "Canonical origin for absolute URLs: http(s), no trailing slash, query, or fragment. A deployment's `SITE_URL` overrides it.",
  },
  description: {
    type: "string",
    required: true,
    label: "Site Description",
    description:
      "Default meta description, and the organization description when meta.json gives none.",
  },
  logo: {
    type: "image",
    label: "Logo",
    description:
      "Header logo, a path under `src/images/` (for example `/images/logo.svg`), served as authored and linked to the home page.",
  },
  socials: {
    type: "object",
    label: "Social Media Links",
    fields: {
      Github: { type: "string", label: "Github" },
      Facebook: { type: "string", label: "Facebook" },
      Instagram: { type: "string", label: "Instagram" },
      TikTok: { type: "string", label: "TikTok" },
      Google: { type: "string", label: "Google" },
      WhatsApp: { type: "string", label: "WhatsApp" },
      RSS: { type: "string", label: "RSS" },
    },
    description:
      "Footer social links, network name to URL. Each name needs an icon in `src/_data/social-icons.json`; external URLs also become the organization's `sameAs`.",
  },
  cms_config: {
    type: "object",
    description:
      "The CMS collections and features `npm run customise-cms` saved; change it with that command, not by hand.",
  },
};
/* jscpd:ignore-end */

/** Every problem with a site.json object against the schema. */
const siteErrors = schemaErrors("site.json", SITE_SCHEMA);

export { SITE_SCHEMA, siteErrors };
