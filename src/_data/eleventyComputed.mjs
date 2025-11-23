import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default {
  header_text: (data) => data.header_text || data.title,
  meta_title: (data) => data.meta_title || data.title,
  description: (data) => data.snippet || data.meta_description || "",
  contactForm: () => require("./contact-form.json"),
  thumbnail: (data) =>
    data.thumbnail || (data.gallery && data.gallery[0]) || data.header_image,
};
