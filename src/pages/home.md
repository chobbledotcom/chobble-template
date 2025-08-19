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

You can check out [the source code for this template]({{ config.template_repo_url }}) on Github.

- It's AGPLv3 licensed
- With [a theme editor](/theme-editor/) you can test live!
- Edited via the easy and free [PagesCMS](http://pagescms.org) editor
- With built-in layouts for [pages](/instructions/), [news posts](/news/), [products](/products/), [menus](/menus/), and [events](/events/)
- It's based on [Eleventy]({{ config.template_repo_url }}/src/branch/main/.eleventy.js)
- And uses [mvp.css]({{ config.template_repo_url }}/src/branch/main/src/css/mvp.scss) with minimal-ish semantic HTML
- It's built with Node and [Github Actions]({{ config.template_repo_url }}/src/branch/main/.github/workflows/build-and-deploy.yml)
- It's hosted on [Neocities](https://neocities.org/site/chobble-example) but could be easily adapted for Bunny (or anywhere else)
- With a Formspark & Botpoison spam-protected [contact form]({{ config.template_repo_url }}/src/branch/main/src/\_includes/contact-form.html)
- Using [Turbo](https://turbo.hotwired.dev/) for instant page loads
- With social media links in the footer
- And customisable snippets to use wherever

The example comes pre-loaded with Markdown files in each collection (per-folder) - just delete the files you don't need, and the site will adjust its menus to suit.
