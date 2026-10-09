/**
 * Static singleton-file configs for the CMS.
 *
 * These aren't collections — they're single JSON files in the site's `_data`
 * directory (homepage settings, site metadata, schema.org meta, alt tags).
 * Each generator takes the resolved `dataPath` so the same function works for
 * templates with or without a `src/` folder.
 */

import { SITE_SCHEMA } from "#config/site-schema.js";
import { toCmsField } from "#scripts/customise-cms/blocks.js";
import { createObjectListField } from "#scripts/customise-cms/fields.js";

/**
 * @typedef {import('./generator-helpers.js').CollectionConfig} CollectionConfig
 */

/**
 * Generate site configuration: the site.json fields the site schema labels
 * for the editor.
 * @param {string} dataPath - Path to data directory
 * @returns {CollectionConfig} Site configuration
 */
export const getSiteConfig = (dataPath) => ({
  name: "site",
  label: "Site Configuration",
  type: "file",
  path: `${dataPath}/site.json`,
  fields: Object.entries(SITE_SCHEMA)
    .filter(([, field]) => field.label)
    .map(([name, field]) => toCmsField(name, field)),
});

/**
 * Generate meta configuration
 * @param {string} dataPath - Path to data directory
 * @returns {CollectionConfig} Meta configuration
 */
export const getMetaConfig = (dataPath) => ({
  name: "meta",
  label: "Meta Configuration",
  type: "file",
  path: `${dataPath}/meta.json`,
  fields: [
    {
      name: "language",
      type: "string",
      label: "Language Code",
      default: "en-GB",
    },
    {
      name: "organization",
      label: "Organization",
      type: "object",
      fields: [
        {
          name: "description",
          type: "string",
          label: "Organization Description",
        },
        { name: "legalName", type: "string", label: "Legal Name" },
        { name: "foundingDate", type: "string", label: "Founding Date" },
        createObjectListField("founders", "Founders", [
          { name: "name", type: "string", label: "Name" },
        ]),
        {
          name: "address",
          label: "Address",
          type: "object",
          fields: [
            { name: "streetAddress", type: "string", label: "Street Address" },
            { name: "addressLocality", type: "string", label: "City" },
            { name: "addressRegion", type: "string", label: "Region/State" },
            { name: "postalCode", type: "string", label: "Postal Code" },
            { name: "addressCountry", type: "string", label: "Country Code" },
          ],
        },
        {
          name: "contactPoint",
          label: "Contact Points",
          type: "object",
          list: true,
          fields: [
            { name: "telephone", type: "string", label: "Telephone" },
            { name: "contactType", type: "string", label: "Contact Type" },
            { name: "areaServed", type: "string", label: "Area Served" },
            {
              name: "availableLanguage",
              type: "string",
              label: "Available Languages",
              list: true,
            },
          ],
        },
      ],
    },
  ],
});

/**
 * Generate alt tags configuration
 * @param {string} dataPath - Path to data directory
 * @returns {CollectionConfig} Alt tags configuration
 */
export const getAltTagsConfig = (dataPath) => ({
  name: "alt-tags",
  label: "Image Alt Tags",
  type: "file",
  path: `${dataPath}/alt-tags.json`,
  fields: [
    {
      name: "images",
      type: "object",
      list: true,
      fields: [
        { name: "path", type: "image", label: "Image" },
        { name: "alt", type: "string", label: "Alt Text" },
      ],
    },
  ],
});
