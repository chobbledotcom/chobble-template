/* jscpd:ignore-start -- block schema declaration data */
import { formBlockFields } from "#utils/block-schema/shared.js";

export const type = "contact-form";

export const columnSafe = false;

export const fields = formBlockFields({
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "tel", required: false },
    {
      name: "message",
      label: "Message",
      type: "textarea",
      required: true,
      rows: 6,
    },
  ],
  fieldsSummary: "name, email, phone, and message",
  submitText: "Send Enquiry",
  redirect: "/thank-you/",
});

export const docs = {
  summary:
    "A contact form, optionally beside text, that posts to a form service.",
  scss: "src/css/design-system/_contact-form.scss",
  notes:
    "A static site cannot receive a form, so the block posts to the URL in the `contact_form_target` setting, or to [Formspark](https://formspark.io/) when `formspark_id` is set; with neither it shows a notice in place of the form. Setting `botpoison_public_key` adds a [Botpoison](https://botpoison.com/) spam challenge, which needs JavaScript. The submission emails are named after the site, and a field named `email` becomes their reply address on Formspark.",
};

export const example = {
  type: "contact-form",
  content:
    "## Get in touch\n\nTell us what you need and we will get back to you.",
  fields: [
    { label: "Name", name: "name", required: true },
    { label: "Email", name: "email", type: "email", required: true },
    {
      label: "What do you need?",
      name: "service",
      type: "select",
      options: [
        "A new website",
        "Help with an existing site",
        "Something else",
      ],
    },
    { label: "Message", name: "message", type: "textarea", required: true },
  ],
};
/* jscpd:ignore-end */
