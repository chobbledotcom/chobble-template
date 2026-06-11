---
name: Contact
meta_description:
meta_title: Contact
schema_type: organization
eleventyNavigation:
  key: Contact
  order: 5
blocks:
  - type: include
    file: contact-opening-hours.html
  - type: contact-form
    intro_content: |
      ## Get in Touch

      The contact form is set up in contact-form.json. This file says what fields to show and what labels to use. When someone fills in the form, it gets sent to Formspark or to another address you choose. You can turn on Botpoison to stop spam.

      Some fields can show only on some pages. For example, you can have one message box on product pages and a different one on event pages. The opening hours above come from site.json.

      **If you're looking for my real contact details check out my site at [chobble.com/contact](https://chobble.com/contact/)**
  - type: include
    file: faq.html
  - type: include
    file: map-embed.html
---
