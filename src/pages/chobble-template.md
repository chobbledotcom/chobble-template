---
layout: design-system-base.html
title: Chobble Template - Free Eleventy Starter for Small Business Websites
meta_title: Chobble Template - Free Eleventy Starter for Small Business Websites
meta_description: A free, open-source Eleventy template with e-commerce, 10 themes, and 14 content types. AGPLv3 licensed. Hosting from £5/month.
permalink: /
eleventyNavigation:
  key: Home
  order: 1
blocks:
  # Hero
  - type: hero
    container_width: full
    class: gradient
    badge: Opinionated & Complete
    title: A Free Eleventy Template for Small Business Websites
    lead: >-
      With loads of stuff included that your business might need - collections, layouts, themes, and integrations.
      It builds to static HTML. You host it wherever you like. Hosting from £10/month, or £5/month for charities — or self-host for free.
    buttons:
      - text: View on GitHub
        href: https://github.com/chobbledotcom/chobble-template
        variant: primary
        size: lg
      - text: Live Demo
        href: https://example.chobble.com
        variant: secondary
        size: lg

  # Video Background Demo
  - type: bunny-video-background
    container_width: full
    video_url: https://iframe.mediadelivery.net/embed/417100/64491289-f8e4-44a0-9d78-746cdf8f78fc?autoplay=true&loop=true&muted=true&preload=true&responsive=true
    thumbnail_url: src/images/video-background-placeholder.jpg
    video_title: Chobble Template Demo
    aspect_ratio: "21/9"
    content: |
      ## Video Background Block

      Add auto-playing video backgrounds with overlay text to any section.

  # YouTube Video Background Demo
  - type: video-background
    container_width: full
    video_id: dQw4w9WgXcQ
    video_title: YouTube Background Demo
    aspect_ratio: "21/9"
    content: |
      ## YouTube Video Backgrounds

      The same block accepts a YouTube video ID and renders a muted,
      autoplaying, looped background embed via `youtube-nocookie.com`.

  # Marquee Images Demo
  - type: marquee-images
    header_intro: "## Trusted By These Fictional Brands"
    header_align: center
    speed: "25s"
    height: "60px"
    items:
      - image: /images/placeholders/blue.svg
        alt: Blue Brand
        link_url: https://example.com/blue
      - image: /images/placeholders/green.svg
        alt: Green Brand
      - image: /images/placeholders/orange.svg
        alt: Orange Brand
      - image: /images/placeholders/pink.svg
        alt: Pink Brand
      - image: /images/placeholders/purple.svg
        alt: Purple Brand
      - image: /images/placeholders/yellow.svg
        alt: Yellow Brand
      - image: /images/placeholders/blue.svg
        alt: Azure Co
      - image: /images/placeholders/green.svg
        alt: Emerald Inc
      - image: /images/placeholders/orange.svg
        alt: Tangerine Ltd
      - image: /images/placeholders/pink.svg
        alt: Coral Corp
      - image: /images/placeholders/purple.svg
        alt: Violet Labs
      - image: /images/placeholders/yellow.svg
        alt: Saffron Group
      - image: /images/placeholders/blue.svg
        alt: Cerulean Ventures
      - image: /images/placeholders/green.svg
        alt: Jade Partners
      - image: /images/placeholders/orange.svg
        alt: Amber Dynamics

  # Product Sliders
  - type: items
    collection: featuredProducts
    intro: |
      ## Product Sliders

      Display any collection in grids or with horizontal sliders.
    horizontal: true

  # Items Array - explicit product selection
  - type: items-array
    collection: products
    masonry: true
    items:
      - src/products/mini-gizmo.md
      - src/products/ultrawidget-pro.md
      - src/products/heritage-thingy-deluxe.md
    intro: |
      ## A Selection of Products

      Hand-pick specific items from any collection using the items array block.

  # Reviews Masonry
  - type: items
    collection: reviews
    masonry: true
    intro: |
      ## Customer Reviews

      Display reviews in a masonry grid — cards flow naturally based on content height.

  # Stats (via reusable snippet)
  - type: snippet
    reference: specs

  # Features - Everything Your Business Needs
  - type: features
    header_intro: |-
      ## What's Included

      Product catalogs, event calendars, holiday lets, restaurant menus, and more. All from one template.
    items:
      - icon: "hugeicons:shopping-cart-01"
        title: E-Commerce Ready
        description: Built-in shopping cart with Stripe and Square integration. Or use quote mode for service businesses.
      - icon: "hugeicons:paint-brush-01"
        title: 10 Themes
        description: Ranges from clean to retro. Includes a live theme editor so visitors can switch between them.
      - icon: "hugeicons:image-02"
        title: Automatic Image Processing
        description: Generates responsive srcsets, converts to WebP, and creates blurred placeholders. Uses eleventy-img and sharp.
      - icon: "hugeicons:calendar-03"
        title: Events & Calendars
        description: One-off or recurring events. iCal export. Property availability calendars built-in.
      - icon: "hugeicons:restaurant-01"
        title: Restaurant Menus
        description: Full menu management with dietary indicators, categories, pricing display, and PDFs.
      - icon: "hugeicons:house-01"
        title: Property Listings
        description: Built for holiday lets. Bedrooms, amenities, price per night, and booking calendars.
      - icon: "hugeicons:star"
        title: Reviews & Ratings
        description: Product reviews with 1-5 star ratings. Automatic aggregate scores for SEO. Google imports.
      - icon: "hugeicons:search-02"
        title: SEO Optimized
        description: Schema.org markup, RSS feeds, sitemaps, canonical URLs, and meta descriptions.
      - icon: "hugeicons:laptop-programming"
        title: No-Code CMS
        description: PagesCMS integration lets non-technical users edit content with a visual interface.
      - icon: "hugeicons:gears"
        title: Bun Powered
        description: I try and keep the builds as fast as I can

  # Content Types Split Full
  - type: split-full
    container_width: full
    variant: dark-left
    reveal_left: left
    reveal_right: right
    left_title: 14 Content Types
    left_content: |
      A bunch of different collection types and layouts for all sorts of business websites:

      - **Products** - Galleries, variants, SKUs, specifications
      - **Categories** - Hierarchical organization with subcategories
      - **Events** - One-off and recurring with iCal export
      - **News** - Blog posts with RSS feed
      - **Menus** - Restaurant menus with dietary info
      - **Locations** - Multi-site support with maps
      - **Properties** - Holiday lets with availability
      - **Reviews** - Ratings linked to products
      - **Team** - Staff profiles
      - **Guides** - Documentation and help articles
    right_title: Example Product
    right_content: |
      ```
      ---
      title: Organic Coffee Beans
      price: 12.99
      categories:
        - coffee
        - organic
      gallery:
        - src/images/coffee-1.jpg
        - src/images/coffee-2.jpg
      options:
        - name: Size
          values: [250g, 500g, 1kg]
      featured: true
      ---

      Premium single-origin beans
      from ethical farms.
      ```

  # Themes Split (reversed)
  - type: split-html
    title: 10 Themes.
    reverse: true
    reveal_content: right
    content: |
      Each theme is a set of SCSS variables that controls colours, fonts, and spacing. They all work without modification.

      There's also a theme editor so you can test new CSS variables live (kinda buggy atm)
    button:
      text: Try the Live Theme Editor
      href: https://example.chobble.com/theme-editor/
      variant: secondary
    figure_html: |
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 3rem; text-align: center; color: white;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">🎨</div>
        <strong style="font-size: 1.5rem;">Theme Switcher</strong>
        <p style="opacity: 0.8; margin: 0.5rem 0 0;">Let visitors preview themes instantly (in the bottom right)</p>
      </div>

  # E-Commerce Features (with header, grid--4 layout, custom colors)
  - type: features

    header_intro: |-
      ## Commerce Options

      Sell products, take quotes, or both. Card payments and enquiry forms are built in.
    grid_class: grid--4 text-center
    heading_level: 4
    items:
      - icon: "hugeicons:credit-card"
        title: Card Checkout
        description: Powered by a Bunny Edge Script
      - icon: "hugeicons:note-edit"
        title: Quote Mode
        description: Collect enquiries instead of payments
        style: "--primary-light: #d1fae5; --primary: #059669;"

  # Performance Split
  - type: split-code
    section_class: gradient

    title: Static HTML, Optimised Images
    reveal_content: left
    content: |
      The output is plain HTML and CSS with no client-side framework. Images are processed at build time into multiple sizes and WebP format with blurred placeholders.

      - **LQIP Placeholders** - Inline base64 blurred previews, no extra requests
      - **Responsive Images** - Multiple sizes generated at build time via srcset
      - **Link Prefetch** - Pages preload on hover
      - **Static Output** - No server-side rendering, just HTML files
    figure_filename: Image optimization
    figure_code: |
      srcset="
        /img/abc-240.webp 240w,
        /img/abc-480.webp 480w,
        /img/abc-900.webp 900w"
      sizes="(max-width: 768px) 100vw, 50vw"

      Automatic. No configuration needed.

  # SEO Features (with header)
  - type: features

    header_intro: |-
      ## Built-in SEO

      Structured data is generated automatically from your content.
    grid_class: grid
    heading_level: 4
    items:
      - title: Schema.org Markup
        description: Products, events, FAQs, organizations, and breadcrumbs - all with proper JSON-LD.
      - title: RSS & iCal Feeds
        description: Atom feeds for news, iCal exports for events. Let people subscribe to your content.
      - title: Aggregate Ratings
        description: Product reviews automatically generate aggregate ratings for rich snippets.

  # Deployment Split (reversed)
  - type: split-html
    title: Hosting and Deployment
    reverse: true
    reveal_content: right
    content: |
      Includes a GitHub Actions workflow. Push to main and it deploys to Neocities or Bunny CDN. Since the output is static files, any web host works.

      **Included deployment targets:**

      - Neocities (has a free tier)
      - Bunny CDN (global edge network)
      - Any static host (Netlify, Vercel, etc.)

      I can host your site for **£10/month** (or **£5/month** for charities, co-ops, artists, musicians, and sustainable businesses) — hosting and backups included, no support. Or self-host wherever you like.

      Bunny Edge Script-based backend.
    figure_html: |
      <div class="code-block">
        <div class="code-block-toolbar">
          <div class="dots" aria-hidden="true"><span></span><span></span><span></span></div>
          <span>Terminal</span>
        </div>
        <pre><code style="color: #9ca3af;"><span style="color: #10b981;">$</span> git push origin main

      <span style="color: #fbbf24;">[GitHub Actions]</span>
      Building site...
      Optimizing images...
      Deploying to Neocities...

      <span style="color: #10b981;">Done!</span> Site live in 47 seconds.</code></pre>
      </div>

  # Get It Built For You
  - type: split-full
    container_width: full
    variant: primary-left
    reveal_left: left
    reveal_right: right
    left_title: Want It Built For You?
    left_content: |
      Not everyone wants to DIY — and that's fine.

      I'm **Stef**, the developer behind Chobble Template. I've been building websites and software for over 20 years from Manchester, UK.

      If you'd rather skip the setup and get straight to running your business, I can build your site for you using this template — customised to your brand, your content, and your needs.
    left_button:
      text: Get in touch at chobble.com
      href: https://chobble.com
      variant: secondary
    right_content: |
      - **Flat hourly rate** — no hidden fees, no surprises
      - **You own the code** — it's yours to keep, host anywhere, modify freely
      - **No lock-in** — no contracts, no monthly retainers, walk away any time
      - **Basic hosting** — £10/month (£5/month discounted), hosting and backups, no support
      - **50% discount** for charities, co-ops, artists, musicians, and sustainable businesses

      All my work is open source. I donate 10% of earnings to the [Against Malaria Foundation](https://www.againstmalaria.com/).

  # Icon Links
  - type: icon-links
    intro: |
      ## Quick Links
    items:
      - icon: "hugeicons:github"
        text: View the source code on GitHub
        url: https://github.com/chobbledotcom/chobble-template
      - icon: "hugeicons:global"
        text: Visit chobble.com
        url: https://chobble.com
      - icon: "hugeicons:mail-01"
        text: Get in touch
        url: "#contact"

  # Contact Form
  - type: contact-form
    content: |
      ## Contact Chobble

      You can use the contact form to the right to get in touch with Stef at Chobble.

  # CTA
  - type: cta
    title: Get the Template
    description: Fork the repository, add your content, and deploy. Or get in touch and Stef will set it up for you.
    button:
      text: Get Started on GitHub
      href: https://github.com/chobbledotcom/chobble-template
      variant: secondary
      size: lg

  # Image Background Demo
  - type: image-background
    container_width: full
    parallax: true
    image: src/images/city-traffic-night.jpg
    image_alt: Long exposure of the traffic in a city at night
    content: |
      ## Image Blocks

      [Thanks to Yam Daisy on Pexels for this photo](https://www.pexels.com/photo/long-exposure-of-the-traffic-in-a-city-at-night-25208706/)
---
