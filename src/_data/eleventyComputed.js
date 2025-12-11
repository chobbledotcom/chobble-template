import { existsSync } from "fs";
import { createRequire } from "module";
import { join } from "path";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildProductMeta,
} from "../_lib/schema-helper.js";

const require = createRequire(import.meta.url);

function isValidImage(imagePath) {
  if (!imagePath || imagePath.trim() === "") return false;
  if (imagePath.indexOf("http") === 0) return true;

  // Remove leading slash and strip "src/" prefix if present
  const relativePath = imagePath.replace(/^\//, "").replace(/^src\//, "");
  const fullPath = join(process.cwd(), "src", relativePath);

  if (existsSync(fullPath)) return true;

  throw new Error(`Image file not found: ${fullPath}`);
}

function hasTag(data, tag) {
  const tags = data.tags || [];
  return Array.isArray(tags) ? tags.includes(tag) : tags === tag;
}

export default {
  header_text: (data) => data.header_text || data.title,
  meta_title: (data) => data.meta_title || data.title,
  description: (data) => data.snippet || data.meta_description || "",
  contactForm: () => require("./contact-form.json"),
  thumbnail: (data) =>
    isValidImage(data.thumbnail)
      ? data.thumbnail
      : data.gallery && data.gallery[0] && isValidImage(data.gallery[0])
        ? data.gallery[0]
        : isValidImage(data.header_image)
          ? data.header_image
          : null,
  faqs: (data) =>
    Array.isArray(data.faqs)
      ? [...data.faqs].sort((a, b) => (a.order || 0) - (b.order || 0))
      : [],
  meta: (data) => {
    if (hasTag(data, "product")) return buildProductMeta(data);
    if (hasTag(data, "news")) return buildPostMeta(data);
    if (data.layout === "contact.html") return buildOrganizationMeta(data);
    return buildBaseMeta(data);
  },
};
