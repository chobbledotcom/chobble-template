import { createRequire } from "node:module";
import { processContactForm } from "#config/form-helpers.js";

const require = createRequire(import.meta.url);

const contactFormData = require("./contact-form.json");
const contactForm = processContactForm(contactFormData);

export default function () {
  return contactForm;
}
