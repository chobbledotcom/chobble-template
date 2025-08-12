---
header_image: placeholder.jpg
header_text: Example Website
meta_description: Example site for the Chobble template - an Eleventy site, built on Nix and hosted on Neocities
meta_title: Chobble Template | Eleventy Starter | AGPLv3

layout: home.html
permalink: /
eleventyNavigation:
  key: Home
  order: 1
---

## This site is using the [Chobble Template](https://chobble.com/services/chobble-template/)

**It was made by Stef at [Chobble.com](https://chobble.com).** If you'd like a website just like it, clone this repo or [get in touch](/contact/)! I charge a flat hourly fee and will give you the full source code for all work I do.

You can check out [the source code for this template]({{ config.template_repo_url }}) - it's AGPLv3-licensed and:

- An [Eleventy]({{ config.template_repo_url }}/src/branch/main/.eleventy.js) site
- Using [mvp.css]({{ config.template_repo_url }}/src/branch/main/src/css/mvp.scss) and semantic HTML
- Built with Node and [Github Actions]({{ config.template_repo_url }}/src/branch/main/.github/workflows/build-and-deploy.yaml)
- Hosted on [Neocities](https://neocities.org/site/chobble-example)
- With a Formspark & Botpoison spam-protected [contact form]({{ config.template_repo_url }}/src/branch/main/src/\_includes/contact-form.html)
- Using [Turbo](https://turbo.hotwired.dev/) for instant page loads
- With a [news system]({{ config.template_repo_url }}/src/branch/main/src/\_includes/news-post-list.html)
- And [products]({{ config.template_repo_url }}/src/branch/main/src//\_includes/products-list.html) with [galleries]({{ config.template_repo_url }}/src/branch/main/src/\_includes/gallery.html)
- And [menus]({{ config.template_repo_url }}/src/branch/main/src/\_layouts/menus.html) with [items]({{ config.template_repo_url }}/raw/branch/main/src/menu-items/pad-thai.md)
- And social media links in the footer

The example comes pre-loaded with Markdown files in each collection (per-folder) - just delete the folders you don't need, and the site will adjust its menus to suit.
