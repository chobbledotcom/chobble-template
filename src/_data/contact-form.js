import { processContactForm } from "#config/form-helpers.js";
import contactFormData from "./contact-form.json" with { type: "json" };

const contactForm = processContactForm(contactFormData);

export default function () {
  return contactForm;
}
