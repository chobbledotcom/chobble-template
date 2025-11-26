---
header_image: src/images/placeholder.jpg
header_text: Example Website
meta_description: Example site for the Chobble template - an Eleventy site, built on Nix and hosted on Neocities or Bunny.net
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
- It's based on [Eleventy]({{ config.template_repo_url }}/blob/main/.eleventy.js)
- With minimal-ish semantic-ish HTML and CSS, based on [MVP.css](https://andybrewer.github.io/mvp/)
- It's built with Node and [Github Actions]({{ config.template_repo_url }}/blob/main/.github/workflows/build-and-deploy.yaml)
- It's hosted on [Neocities](https://neocities.org/site/chobble-example) and [Bunny.net](https://chobble-example.b-cdn.net/), and can be adapted for any static host
- With a Formspark & Botpoison spam-protected [contact form]({{ config.template_repo_url }}/blob/main/src/\_includes/contact-form.html)
- Using [Turbo](https://turbo.hotwired.dev/) for instant page loads
- With social media links in the footer
- And customisable snippets to use wherever

The example comes pre-loaded with Markdown files in each collection (per-folder) - just delete the files you don't need, and the site will adjust its menus to suit.
