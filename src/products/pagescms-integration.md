---
title: PagesCMS Integration
subtitle: Integrates with the free and customisable PagesCMS editor
categories:
  - open-source
features:
  - Free and open source CMS
  - GitHub integration with automatic deployments
  - Customizable interface via `.pages.yml`
  - Magic link authentication (no passwords)
  - Version history and easy restoration
  - Image upload and linking
  - Support for all content types (pages, products, categories, etc.)
---

The Chobble template is an Eleventy static site, and like most static sites it's generated from simple text files. You could edit those text files manually, but their syntax is a bit clunky and it's easy to make a mistake. The [PagesCMS](https://pagescms.org) editor makes this wayyy easier!

PagesCMS is a free CMS which connects to [GitHub](https://github.com) repositories, where your site's source code can be stored. Unlike many CMS systems PagesCMS is very flexible and the developer can create an admin interface that aligns with all sorts of collections or standalone pages. This means the interface only displays exactly what is needed for your site, with no cruft. And logging in is just a magic link via email - no passwords needed. It's very easy to use and intuitive.

## The .pages.yml File

The PagesCMS interface is configured through the `.pages.yml` file, a single file which tells the editor that, for example, your site has "Menus", and each "Menu" has items, and each item has a price. And then it uses this info to create an editor for menus and items and prices for you.

That's the full extent of the PagesCMS configuration: one surprisingly-flexible config file. It lets us build very expansive interfaces that you can use to edit thousands of records, easy peasy.

## GitHub Integration

There are lots of types of "source code repositories", but GitHub is the most popular one and is where Chobble Sites are best suited for. It's free to store your site's source code there, and then PagesCMS connects to that source code repository to let you edit your files.

Whenever you make a change, GitHub runs a script which turns the source code text files into your pretty new website. This happens in the background automatically, which means that a minute or so after hitting "Save" in the PagesCMS editor you can see your updates on your live site.

A big benefit of this all being based in Git and GitHub is that every version of your files is stored. This means you can always restore to an earlier version - it makes your site very hard to break.

## Content Management Features

Users can create, edit, and delete any page or item on their site. That might be a full page like "About Us", or a product category, or an individual product, or maybe even just the small text that appears in the footer, something like "Copyright Chobble 2025".

The editor is really simple: There are no complex font options, it just happens through plain text boxes. You can use the [Markdown language](https://www.markdownguide.org/cheat-sheet/) for advanced formatting. This might feel confusing initially, but you'll quickly get used to it, and it's much harder to make a mistake through this editor than through a full HTML editor.

You can also upload images through the PagesCMS editor, and link those images to products, menu items, page headers, and anywhere else we use an image. Likewise you can link products to categories, reviews to products, and so on.

## Getting Started

Setting it up is really easy. Once you've [got your source code stored](/instructions/) on Github, you just need to go to [PagesCMS.org](https://pagescms.org) and follow the big buttons. It's all free and just takes a few clicks for you to add the PagesCMS editor to your repository.

If you're a paying Chobble customer, I'll manage all this for you and you'll get an invite link in your emails. But if you're using the Chobble Template yourself, it's really easy to get working.
