---
header_image: placeholder.jpg
header_text: Example Website
meta_description: Example site for the Chobble template - an Eleventy site, built on Nix and hosted on Neocities
meta_title: Home

layout: home.html
permalink: /
eleventyNavigation:
  key: Home
  order: 1
---

## This is an example website

**It was made by Stef at [Chobble.com](https://chobble.com).** If you'd like a website just like it, [get in touch](/contact/)! I charge a flat hourly fee and will give you the full source code for all work I do.

You can check out [the source code for this template]({{ site.template_repo_url }}) - it's:

- An [Eleventy]({{ site.template_repo_url }}/src/branch/main/.eleventy.js) site
- Using [mvp.css]({{ site.template_repo_url }}/src/branch/main/src/\_scss/mvp.scss) and semantic HTML
- Built with Nix and [Forgejo Actions]({{ site.template_repo_url }}/src/branch/main/.forgejo/workflows/neocities.yaml)
- Hosted on [Neocities](https://neocities.org/site/chobble-example)
- With a Formspark & Botpoison spam-protected [contact form]({{ site.template_repo_url }}/src/branch/main/src/\_includes/contact-form.html)
- Using [Turbo](https://turbo.hotwired.dev/) for instant page loads
- With a [news system]({{ site.template_repo_url }}/src/branch/main/src/\_includes/news-post-list.html)
- And [products]({{ site.template_repo_url }}/chobble/chobble-template/src/branch/main/src/products) with [galleries]({{ site.template_repo_url }}/src/branch/main/src/\_includes/gallery.html)
- And social media links in the footer
