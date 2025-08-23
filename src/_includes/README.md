# Layouts

This directory contains all the HTML layouts used by the Chobble Template. Each layout serves a specific purpose and extends the base layout.

## Base Layout

- **`base.html`** - The foundation layout that all other layouts extend. Contains the HTML structure, head tags, header, footer, and common elements.

## Page Layouts

- **`page.html`** - Standard page layout for general content pages
- **`home.html`** - Homepage layout with sections for products, news, events, and more
- **`contact.html`** - Contact page with integrated contact form

## Content Type Layouts

### Item Layout (Multi-purpose)
- **`item.html`** - Versatile layout used for both individual products and events. Features:
  - Full image gallery with lightbox functionality
  - Header image and text
  - Main content area
  - Automatically adapts to display product-specific fields (price, categories, Etsy link) or event-specific fields (date, location, map)
  - Used by both products and events for consistent presentation

### Products & Categories
- **`products.html`** - Product listing page showing all products
- **`product-gallery.html`** - Alternative product display layout
- **`categories.html`** - Category listing page
- **`category.html`** - Individual category page showing related products

### News/Blog
- **`news-archive.html`** - News listing page with pagination
- **`news-post.html`** - Individual news article/blog post

### Events
- **`events.html`** - Events listing page
- **`event.html`** - Individual event page with date, location, and map

### Team
- **`team.html`** - Team listing page showing all members
- **`team-member.html`** - Individual team member profile page

### Menus (Restaurant/Cafe)
- **`menus.html`** - Menu listing page
- **`menu.html`** - Individual menu display with categories and items

### Reviews
- **`reviews.html`** - Customer reviews and testimonials page

### Tags
- **`tags.html`** - Tag cloud/listing page
- **`tag.html`** - Individual tag page showing tagged content

### Special
- **`theme-editor.html`** - Interactive theme customization tool

## Usage

Layouts are specified in the front matter of content files:

```yaml
---
layout: page.html
---
```

Most layouts extend `base.html` and add specific content areas and functionality for their content type.

## Customization

To modify a layout:
1. Edit the HTML file directly
2. Use Nunjucks/Liquid templating syntax
3. Access page data through template variables
4. Include partials from `src/_includes/` as needed

## Template Variables

Common variables available in layouts:
- `title` - Page title
- `content` - Page content
- `header_image` - Header background image
- `header_text` - Header display text
- `meta_description` - SEO description
- `meta_title` - SEO title
- `site` - Global site configuration
- `config` - Template configuration