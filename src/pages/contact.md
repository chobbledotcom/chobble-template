---
header_image: src/images/placeholder.jpg
header_text: Contact Example
meta_description:
meta_title: Contact

layout: contact.html
eleventyNavigation:
  key: Contact
  order: 5
---

## Opening Hours

{% opening_times %}

## Get in Touch

The contact form on this page is configured through contact-form.json, which defines the fields, labels, and validation rules. Form submissions are sent to Formspark when a formspark_id is set in config.json, or to a custom endpoint if contact_form_target is specified. Spam protection is handled by Botpoison when a public key is configured.

Form fields can be set to appear only on certain page types using the showOn property. This allows product pages to show a product-specific message field while event pages show an event enquiry field. The opening hours displayed above are pulled from site.json and rendered using the opening_times shortcode.

**If you're looking for my real contact details check out my site at [chobble.com/contact](https://chobble.com/contact/)**
