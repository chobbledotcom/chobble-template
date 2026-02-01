---
layout: design-system-base.html
title: Chobble Template - Modern Static Site Generator for Small Businesses
meta_title: Chobble Template - Complete Eleventy Starter for Small Business Websites
meta_description: A free, open-source Eleventy template with e-commerce, 10 themes, 14 content types, and everything small businesses need to succeed online.
permalink: /chobble-template/
blocks:
  # Hero
  - type: hero
    class: gradient
    badge: Open Source & Free
    title: The Complete Website Solution for Small Businesses
    lead: >-
      A production-ready Eleventy template with e-commerce, 10 themes, 14 content types,
      and everything you need to build a professional website. No recurring fees. Full control.
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
    video_id: https://iframe.mediadelivery.net/embed/417100/64491289-f8e4-44a0-9d78-746cdf8f78fc?autoplay=true&loop=true&muted=true&preload=true&responsive=true
    video_title: Chobble Template Demo
    aspect_ratio: "21/9"
    content: |
      <h2>Video Background Block</h2>
      <p>Create stunning hero sections with auto-playing video backgrounds and overlay text.</p>

  # Stats
  - type: stats
    section_class: alt
    container: true
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
    section_class: ""
    container: true
    container_class: stack--lg
    header_title: Everything Your Business Needs
    header_subtitle: >-
      From product catalogs to event calendars, holiday lets to restaurant menus.
      One template, endless possibilities.
    items:
      - icon: "hugeicons:shopping-cart-01"
        title: E-Commerce Ready
        description: Built-in shopping cart with Stripe and PayPal integration. Or use quote mode for service businesses.
      - icon: "hugeicons:paint-brush-01"
        title: 10 Beautiful Themes
        description: From professional to playful. Live theme editor lets visitors preview looks instantly.
      - icon: "hugeicons:image-02"
        title: Smart Image Handling
        description: Automatic responsive images, WebP conversion, and blurred placeholders for lightning-fast loads.
      - icon: "hugeicons:calendar-03"
        title: Events & Calendars
        description: One-off or recurring events. iCal export. Property availability calendars built-in.
      - icon: "hugeicons:restaurant-01"
        title: Restaurant Menus
        description: Full menu management with dietary indicators, categories, and pricing display.
      - icon: "hugeicons:house-01"
        title: Property Listings
        description: Perfect for holiday lets. Bedrooms, amenities, price per night, and booking calendars.
      - icon: "hugeicons:star"
        title: Reviews & Ratings
        description: Product reviews with 1-5 star ratings. Automatic aggregate scores for SEO.
      - icon: "hugeicons:search-02"
        title: SEO Optimized
        description: Schema.org markup, RSS feeds, sitemaps, canonical URLs, and meta descriptions.
      - icon: "hugeicons:laptop-programming"
        title: No-Code CMS
        description: PagesCMS integration lets non-technical users edit content with a visual interface.

  # Content Types Split
  - type: split
    section_class: dark
    container: true
    title: 14 Content Types, One Template
    subtitle: Most templates give you pages and posts. We give you a complete business toolkit.
    content: |
      <ul>
        <li><strong>Products</strong> - Galleries, variants, SKUs, specifications</li>
        <li><strong>Categories</strong> - Hierarchical organization with subcategories</li>
        <li><strong>Events</strong> - One-off and recurring with iCal export</li>
        <li><strong>News</strong> - Blog posts with RSS feed</li>
        <li><strong>Menus</strong> - Restaurant menus with dietary info</li>
        <li><strong>Locations</strong> - Multi-site support with maps</li>
        <li><strong>Properties</strong> - Holiday lets with availability</li>
        <li><strong>Reviews</strong> - Ratings linked to products</li>
        <li><strong>Team</strong> - Staff profiles</li>
        <li><strong>Guides</strong> - Documentation and help articles</li>
      </ul>
    reveal_content: left
    figure_type: code
    figure_content:
      filename: products/my-product.md
      code: |
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

  # Themes Split (reversed)
  - type: split
    section_class: ""
    container: true
    title: 10 Themes. Zero Design Skills Needed.
    reverse: true
    reveal_content: right
    content: |
      <p>Choose from professionally designed themes that work out of the box. From sleek and modern to retro and playful.</p>
      <p class="text-muted">
        <strong>Default</strong> - Clean and professional<br>
        <strong>Ocean</strong> - Cool blues and waves<br>
        <strong>Sunset</strong> - Warm gradients<br>
        <strong>Neon</strong> - Bold and vibrant<br>
        <strong>Monochrome</strong> - Minimalist grayscale<br>
        <strong>Floral</strong> - Soft and botanical<br>
        <strong>Hacker</strong> - Green-on-black terminal<br>
        <strong>90s Computer</strong> - Nostalgic retro<br>
        <strong>Old Mac</strong> - Classic system look<br>
        <strong>Rainbow</strong> - Colorful and fun
      </p>
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
    container: true
    container_class: stack--lg
    header_title: Flexible Commerce Options
    header_subtitle: Sell products, take quotes, or both. Multiple payment integrations built in.
    grid_class: grid--4 text-center
    heading_level: 4
    items:
      - icon: "hugeicons:credit-card"
        title: Stripe Checkout
        description: Secure card payments with minimal setup
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
    container: true
    title: Fast. Really Fast.
    reveal_content: left
    content: |
      <p>Static sites are inherently fast, but we go further. Every image is automatically optimized with responsive sizes, WebP conversion, and blurred placeholders that load instantly.</p>
      <ul>
        <li><strong>LQIP Placeholders</strong> - Blurred previews load in milliseconds</li>
        <li><strong>Responsive Images</strong> - Right size for every screen</li>
        <li><strong>Link Prefetch</strong> - Pages preload on hover</li>
        <li><strong>Static Output</strong> - No server processing, pure HTML</li>
      </ul>
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
    container: true
    container_class: stack--lg
    header_title: SEO That Works
    header_subtitle: Rich structured data helps search engines understand your content.
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
    section_class: ""
    container: true
    title: Deploy Anywhere. Free.
    reverse: true
    reveal_content: right
    content: |
      <p>GitHub Actions workflow included. Push to deploy on Neocities (free) or Bunny CDN (fast). No ongoing server costs.</p>
      <p><strong>Included deployment targets:</strong></p>
      <ul>
        <li>Neocities (free static hosting)</li>
        <li>Bunny CDN (global edge network)</li>
        <li>Any static host (Netlify, Vercel, etc.)</li>
      </ul>
      <p class="text-muted">Optional Docker-based backend for advanced checkout workflows.</p>
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

  # CTA
  - type: cta
    section_class: ""
    container: default
    title: Ready to Build Something Great?
    description: Fork the repository, customize your content, and deploy. It's that simple.
    button:
      text: Get Started on GitHub
      href: https://github.com/chobbledotcom/chobble-template
      variant: secondary
      size: lg

  # Footer
  - type: footer
    text: <strong>Chobble Template</strong> - Open source, MIT licensed
    links:
      - text: GitHub
        href: https://github.com/chobbledotcom/chobble-template
      - text: Forgejo
        href: https://git.chobble.com/chobble/chobble-template
      - text: Demo Site
        href: https://example.chobble.com
      - text: Chobble
        href: https://chobble.com
---
