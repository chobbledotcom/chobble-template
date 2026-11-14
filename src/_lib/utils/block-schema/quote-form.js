/* jscpd:ignore-start -- block schema declaration data */
import { formBlockFields } from "#utils/block-schema/shared.js";

export const type = "quote-form";

export const columnSafe = false;

export const fields = formBlockFields({
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "tel", required: false },
    { name: "start_date", label: "Start date", type: "date", required: true },
    { name: "end_date", label: "End date", type: "date", required: true },
    {
      name: "message",
      label: "Anything else we should know?",
      type: "textarea",
      required: false,
      rows: 4,
    },
  ],
  fieldsSummary: "name, email, phone, start and end dates, and a message",
  submitText: "Request a Quote",
  redirect: "/quote-sent/",
});

export const docs = {
  summary:
    "The visitor's quote: the products they added, an estimated price, and a form that sends the request to a form service.",
  scss: "src/css/design-system/_quote.scss",
  notes:
    "Products carry an add-to-quote button; this block lists what was added, kept in the visitor's browser, with a quantity for each and an estimated total. It posts like the `contact-form` block, to `contact_form_target` or Formspark, adding the items as `cart_items`, the total as `estimated_total`, and the number of hire days as `hire_days`. Hire products are priced by the days between the `start_date` and `end_date` fields, counting both ends; a stay with no matching option is priced TBC. The quote is cleared once it is sent. Prices are shown in the `currency` setting.",
};

export const example = {
  type: "quote-form",
  content: "## Your quote\n\nAdd products to see them here.",
};
/* jscpd:ignore-end */
