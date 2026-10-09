/* jscpd:ignore-start -- block schema declaration data */
import {
  bool,
  INTRO_CONTENT_FIELD,
  md,
  num,
  objectList,
  str,
} from "#utils/block-schema/shared.js";

export const type = "contact-form";

export const columnSafe = false;

/** The form a block shows when it lists no fields of its own. */
const DEFAULT_FIELDS = [
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
];

export const fields = {
  content: {
    ...md("Content"),
    description:
      "Text shown beside the form, rendered as markdown. Without it the form takes the full width.",
  },
  fields: {
    ...objectList("Form Fields", {
      label: str("Label", { required: true }),
      name: {
        ...str("Name"),
        default: (/** @type {{ label: string }} */ field) => field.label,
        description:
          "Name the answer is submitted under. Defaults to the label.",
      },
      type: {
        ...str("Type"),
        default: "text",
        description:
          "`textarea`, `select`, `radio`, `heading` (a sub-heading between fields, with `note` as its text), or any HTML input type such as `text`, `email`, `tel`, `date`, or `number`.",
      },
      required: bool("Required", { default: false }),
      placeholder: str("Placeholder"),
      note: str("Help Note"),
      options: {
        ...str("Options"),
        list: true,
        description: "Choices of a `select` or `radio` field.",
      },
      rows: {
        ...num("Rows"),
        default: 6,
        description: "Height of a `textarea`, in lines of text.",
      },
    }),
    default: DEFAULT_FIELDS,
    description:
      "The form's fields, in order. Defaults to name, email, phone, and message.",
  },
  submit_text: str("Submit Button Text", { default: "Send Enquiry" }),
  redirect: {
    ...str("Redirect"),
    default: "/thank-you/",
    description: "Page a visitor lands on after sending the form.",
  },
  intro_content: INTRO_CONTENT_FIELD,
};

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
