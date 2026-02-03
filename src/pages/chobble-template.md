---
layout: design-system-base.html
title: Chobble Template - Free Eleventy Starter for Small Business Websites
meta_title: Chobble Template - Free Eleventy Starter for Small Business Websites
meta_description: A free, open-source Eleventy template with e-commerce, 10 themes, and 14 content types. AGPLv3 licensed. No monthly fees.
permalink: /chobble-template/
blocks:
  # Hero
  - type: hero
    full_width: true
    class: gradient
    badge: Open Source & Free
    title: A Free Eleventy Template for Small Business Websites
    lead: >-
      An open-source Eleventy starter with e-commerce, 10 themes, and 14 content types.
      It builds to static HTML. You host it wherever you like. No monthly fees.
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
  - type: video-background
    full_width: true
    video_id: https://iframe.mediadelivery.net/embed/417100/64491289-f8e4-44a0-9d78-746cdf8f78fc?autoplay=true&loop=true&muted=true&preload=true&responsive=true
    video_title: Chobble Template Demo
    aspect_ratio: "21/9"
    content: |
      ## Video Background Block

      Add auto-playing video backgrounds with overlay text to any section.

  # Product Sliders
  - type: items
    collection: featuredProducts
    intro: |
      ## Product Sliders

      Display any collection in grids or with horizontal sliders.
    horizontal: true

  # Stats
  - type: stats
    section_class: alt

    items:
      - value: "14"
        label: Content Types
      - value: "10"
        label: Built-in Themes
      - value: "125+"
        label: Pre-built Components
      - value: "$0"
        label: Monthly Cost

  # Features - Everything Your Business Needs
  - type: features
    header_title: What's Included
    header_subtitle: >-
      Product catalogs, event calendars, holiday lets, restaurant menus, and more.
      All from one template.
    items:
      - icon: "hugeicons:shopping-cart-01"
        title: E-Commerce Ready
        description: Built-in shopping cart with Stripe and PayPal integration. Or use quote mode for service businesses.
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
        description: Full menu management with dietary indicators, categories, and pricing display.
      - icon: "hugeicons:house-01"
        title: Property Listings
        description: Built for holiday lets. Bedrooms, amenities, price per night, and booking calendars.
      - icon: "hugeicons:star"
        title: Reviews & Ratings
        description: Product reviews with 1-5 star ratings. Automatic aggregate scores for SEO.
      - icon: "hugeicons:search-02"
        title: SEO Optimized
        description: Schema.org markup, RSS feeds, sitemaps, canonical URLs, and meta descriptions.
      - icon: "hugeicons:laptop-programming"
        title: No-Code CMS
        description: PagesCMS integration lets non-technical users edit content with a visual interface.

  # Content Types Split Full
  - type: split-full
    full_width: true
    variant: dark-left
    reveal_left: left
    reveal_right: right
    left_title: 14 Content Types, One Template
    left_content: |
      Most templates give you pages and posts. This one has content types for specific business needs.

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
  - type: split
    title: 10 Themes. Pick One and Go.
    reverse: true
    reveal_content: right
    content: |
      Each theme is a set of SCSS variables that controls colours, fonts, and spacing. They all work without modification.

      **Default** - Clean and professional
      **Ocean** - Cool blues and waves
      **Sunset** - Warm gradients
      **Neon** - Bold and vibrant
      **Monochrome** - Minimalist grayscale
      **Floral** - Soft and botanical
      **Hacker** - Green-on-black terminal
      **90s Computer** - Nostalgic retro
      **Old Mac** - Classic system look
      **Rainbow** - Colorful and fun
    button:
      text: Try the Live Theme Editor
      href: https://example.chobble.com/theme-editor/
      variant: secondary
    figure_type: html
    figure_content: |
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 3rem; text-align: center; color: white;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">🎨</div>
        <strong style="font-size: 1.5rem;">Theme Switcher</strong>
        <p style="opacity: 0.8; margin: 0.5rem 0 0;">Let visitors preview themes instantly</p>
      </div>

  # E-Commerce Features (with header, grid--4 layout, custom colors)
  - type: features
    section_class: alt

    header_title: Commerce Options
    header_subtitle: Sell products, take quotes, or both. Stripe, PayPal, and enquiry forms are built in.
    grid_class: grid--4 text-center
    heading_level: 4
    items:
      - icon: "hugeicons:credit-card"
        title: Stripe Checkout
        description: Card payments via Stripe Checkout
      - icon: "hugeicons:money-bag-02"
        title: PayPal
        description: Accept PayPal payments globally
        style: "--primary-light: #fef3c7; --primary: #d97706;"
      - icon: "hugeicons:note-edit"
        title: Quote Mode
        description: Collect enquiries instead of payments
        style: "--primary-light: #d1fae5; --primary: #059669;"
      - icon: "hugeicons:calendar-03"
        title: Hire Calculator
        description: Time-based rental pricing engine
        style: "--primary-light: #fce7f3; --primary: #db2777;"

  # Performance Split
  - type: split
    section_class: gradient

    title: Static HTML, Optimised Images
    reveal_content: left
    content: |
      The output is plain HTML and CSS with no client-side framework. Images are processed at build time into multiple sizes and WebP format with blurred placeholders.

      - **LQIP Placeholders** - Inline base64 blurred previews, no extra requests
      - **Responsive Images** - Multiple sizes generated at build time via srcset
      - **Link Prefetch** - Pages preload on hover
      - **Static Output** - No server-side rendering, just HTML files
    figure_type: code
    figure_content:
      filename: Image optimization
      code: |
        srcset="
          /img/abc-240.webp 240w,
          /img/abc-480.webp 480w,
          /img/abc-900.webp 900w"
        sizes="(max-width: 768px) 100vw, 50vw"

        Automatic. No configuration needed.

  # SEO Features (with header)
  - type: features
    section_class: alt

    header_title: Built-in SEO
    header_subtitle: Structured data is generated automatically from your content.
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
  - type: split
    title: Hosting and Deployment
    reverse: true
    reveal_content: right
    content: |
      Includes a GitHub Actions workflow. Push to main and it deploys to Neocities (free) or Bunny CDN. Since the output is static files, any web host works.

      **Included deployment targets:**

      - Neocities (free static hosting)
      - Bunny CDN (global edge network)
      - Any static host (Netlify, Vercel, etc.)

      Optional Docker-based backend for advanced checkout workflows.
    figure_type: html
    figure_content: |
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
    full_width: true
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
      - **50% discount** for charities, co-ops, artists, musicians, and sustainable businesses

      All my work is open source. I donate 10% of earnings to the [Against Malaria Foundation](https://www.againstmalaria.com/).

  # Contact Form
  - type: contact_form
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
    full_width: true
    parallax: true
    image: src/images/city-traffic-night.jpg
    image_alt: Long exposure of the traffic in a city at night
    content: |
      ## Image Blocks

      [Thanks to Yam Daisy on Pexels for this photo](https://www.pexels.com/photo/long-exposure-of-the-traffic-in-a-city-at-night-25208706/)

---
