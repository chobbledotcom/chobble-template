import { createRequire } from "module";
import { existsSync } from "fs";
import { join } from "path";
const require = createRequire(import.meta.url);

function isValidImage(imagePath) {
  if (!imagePath || imagePath.trim() === "") return false;
  const fullPath = join(process.cwd(), "src", "images", imagePath);
  return existsSync(fullPath);
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
};
