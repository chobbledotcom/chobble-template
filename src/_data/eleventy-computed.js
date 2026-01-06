import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { memoize } from "#utils/memoize.js";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildProductMeta,
} from "#utils/schema-helper.js";

const require = createRequire(import.meta.url);

// Memoize the file existence check since the same images are checked repeatedly
const checkImageExists = memoize((fullPath) => existsSync(fullPath));

function isValidImage(imagePath) {
  if (!imagePath || imagePath.trim() === "") return false;
  if (imagePath.indexOf("http") === 0) return true;

  // Remove leading slash and strip "src/" prefix if present
  const relativePath = imagePath.replace(/^\//, "").replace(/^src\//, "");
  const fullPath = join(process.cwd(), "src", relativePath);

  if (checkImageExists(fullPath)) return true;

  throw new Error(`Image file not found: ${fullPath}`);
}

function hasTag(data, tag) {
  const tags = data.tags || [];
  return Array.isArray(tags) ? tags.includes(tag) : tags === tag;
}

function findValidThumbnail(data) {
  if (isValidImage(data.thumbnail)) return data.thumbnail;
  if (data.gallery?.[0] && isValidImage(data.gallery[0]))
    return data.gallery[0];
  if (isValidImage(data.header_image)) return data.header_image;
  return null;
}

export default {
  header_text: (data) => data.header_text || data.title,
  meta_title: (data) => data.meta_title || data.title,
  description: (data) => data.snippet || data.meta_description || "",
  contactForm: () => require("./contact-form.js").default(),
  quoteFields: () => require("./quote-fields.js").default(),
  thumbnail: findValidThumbnail,
  faqs: (data) => (Array.isArray(data.faqs) ? data.faqs : []),
  tabs: (data) => (Array.isArray(data.tabs) ? data.tabs : []),
  meta: (data) => {
    if (hasTag(data, "product")) return buildProductMeta(data);
    if (hasTag(data, "news")) return buildPostMeta(data);
    if (data.layout === "contact.html") return buildOrganizationMeta(data);
    return buildBaseMeta(data);
  },
};
