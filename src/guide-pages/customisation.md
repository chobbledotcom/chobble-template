---
title: Customisation
subtitle: Tailoring the template to your needs
guide-category: advanced-topics
order: 1
faqs:
  - question: Can I change the colour scheme?
    answer: Yes, edit the CSS variables in the stylesheet to change colours throughout the site.
    order: 1
  - question: How do I add custom fonts?
    answer: Add your font files to the assets folder and update the font configuration in _data/fonts.json.
    order: 2
---

Learn how to customise the template to match your brand and requirements.

## Styling

The template uses CSS custom properties (variables) for easy theming. Key variables include:

- `--color-primary` - Main brand colour
- `--color-background` - Page background
- `--color-text` - Default text colour

## Configuration Options

Most site-wide settings can be adjusted in the `src/_data/` directory:

- `site.json` - Basic site information
- `config.json` - Feature toggles and settings
- `strings-base.json` - Customisable text labels
