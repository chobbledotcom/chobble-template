---
header_image: placeholder.jpg
header_text: Setup Instructions
subtitle: Complete guide to creating your website with the Chobble Template
meta_description: Step-by-step instructions for setting up, customizing, and deploying your website using the Chobble Template
meta_title: Setup Instructions | Chobble Template

layout: page.html
permalink: /instructions/
eleventyNavigation:
  key: Instructions
  order: 20
---

## Quick Start Guide

This template helps you create a professional website with built-in content management, automated deployment to Neocities, and a variety of content types. Follow these instructions to get your site up and running.

## Prerequisites

Before you begin, you'll need:

1. **GitHub Account** - For hosting your code and running automated deployments
2. **Neocities Account** - For hosting your website (free tier available)
3. **Node.js** - Version 23 or higher for local development
4. **Git** - For version control

## Initial Setup

### Step 1: Fork or Use This Template

1. Go to the [template repository]({{ config.template_repo_url }})
2. Click "Use this template" or fork the repository
3. Name your repository (e.g., `my-website`)
4. Clone it to your local machine:
   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   cd YOUR-REPO-NAME
   ```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Your Site

Edit the configuration files in `src/_data/`:

- **`site.json`** - Site name, URL, social links, opening times
- **`meta.json`** - Language, organization details, contact info
- **`config.json`** - Form handling, theme settings
- **`homepage.json`** - Control which sections appear on homepage

### Step 4: Test Locally

Run the development server:

```bash
npm run serve
```

Visit `http://localhost:8080` to see your site.

## Deployment Setup

### Neocities Configuration

1. Create a [Neocities account](https://neocities.org)
2. Note your site name (e.g., `yoursite.neocities.org`)
3. Go to Settings → API → Generate API Key
4. Copy your API key for the next step

### GitHub Secrets Configuration

In your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:

| Secret Name | Description | Required |
|------------|-------------|----------|
| `NEOCITIES_API_KEY` | Your Neocities API key | Yes |
| `FORMSPARK_ID` | Formspark form ID (for contact forms) | Optional |
| `BOTPOISON_PUBLIC_KEY` | Botpoison key (spam protection) | Optional |

### Automated Deployment

The site automatically deploys to Neocities when you:
- Push to the main branch
- Manually trigger the workflow from GitHub Actions

The deployment workflow (`.github/workflows/build-and-deploy.yaml`):
1. Builds the site with Eleventy
2. Formats HTML with Prettier
3. Deploys to Neocities

## Content Management

### Using PagesCMS

This template includes [PagesCMS](https://pagescms.org) configuration for easy content editing:

1. Visit [PagesCMS.org](https://pagescms.org)
2. Sign in with GitHub
3. Select your repository
4. Edit content using the visual interface

### Content Types

The template supports multiple content types configured in `.pages.yml`:

#### Pages
Static pages like About, Contact, etc.
- Location: `src/pages/`
- Fields: header image, text, navigation settings

#### News/Blog Posts
Time-based articles and announcements
- Location: `src/news/`
- Fields: title, date, content, featured image

#### Products
Items for sale or showcase
- Location: `src/products/`
- Fields: title, price, categories, gallery, Etsy link

#### Events
One-time or recurring events
- Location: `src/events/`
- Fields: date, location, map embed, recurring schedule

#### Team Members
Staff profiles
- Location: `src/team/`
- Fields: name, role, bio, profile image

#### Reviews
Customer testimonials
- Location: `src/reviews/`
- Fields: reviewer name, content, associated products

#### Menus & Menu Items
Restaurant/cafe menus with categories
- Locations: `src/menus/`, `src/menu-items/`, `src/menu-categories/`
- Fields: items, prices, dietary flags (vegan, gluten-free)

## Customization

### Styling

The template includes a built-in theme editor for easy customization:

1. Visit the [theme editor](/theme-editor/) on this demo site
2. Customize colors, fonts, spacing, and other design variables
3. Copy the generated CSS code
4. Paste it into `src/css/theme.scss` in your repository
5. Commit and push to apply your custom theme

All theme customizations should go in `src/css/theme.scss` - this file is specifically for your custom theme variables and overrides.

### Layouts

The template includes various layouts for different page types. View all available layouts and their documentation at:
[`src/_layouts/`]({{ config.template_repo_url }}/tree/main/src/_layouts)

### Components

Reusable components in `src/_includes/`:
- `header.html` - Site header
- `footer.html` - Site footer with social links
- `contact-form.html` - Spam-protected contact form
- `gallery.html` - Image gallery
- `products-list.html` - Product grid

## Features Configuration

### Contact Form

1. Sign up at [Formspark](https://formspark.io)
2. Create a form and copy the form ID
3. Add `FORMSPARK_ID` to GitHub secrets
4. Optional: Add [Botpoison](https://botpoison.com) for spam protection

### Image Optimization

Images are automatically optimized during build:
- Responsive sizes generated
- WebP format for modern browsers
- Lazy loading enabled
- Cache preserved between builds

### SEO & Meta Tags

- Edit page front matter for meta descriptions and titles
- OpenGraph tags automatically generated
- Sitemap created at `/sitemap.xml`
- RSS feed at `/feed.xml`

## Local Development Tips

### Development Commands

```bash
# Start development server with live reload
npm run serve

# Build site without serving
npm run build

# Format HTML output
npm run format

# Check formatting
npm run format:check
```

### File Structure

```
├── src/
│   ├── _data/          # Global data files
│   ├── _includes/      # Template partials
│   ├── _layouts/       # Page layouts
│   ├── css/            # Stylesheets
│   ├── images/         # Image assets
│   ├── js/             # JavaScript files
│   ├── pages/          # Static pages
│   ├── news/           # Blog posts
│   ├── products/       # Product pages
│   ├── events/         # Event listings
│   └── ...             # Other content types
├── _site/              # Built output (git-ignored)
├── .eleventy.js        # Eleventy configuration
├── .pages.yml          # PagesCMS configuration
└── package.json        # Node dependencies
```

## Troubleshooting

### Build Errors

- Ensure Node.js version 23+ is installed
- Delete `node_modules` and run `npm install` again
- Check for missing images referenced in content

### Deployment Issues

- Verify GitHub secrets are correctly set
- Check Neocities API key is valid
- Ensure repository has Actions enabled
- Review workflow logs in GitHub Actions tab

### Content Not Updating

- Clear browser cache
- Check if changes are committed and pushed
- Verify GitHub Action completed successfully
- Neocities may cache; wait a few minutes

## Advanced Configuration

### Custom Domain

1. Purchase a domain
2. In Neocities settings, add your domain
3. Update DNS records as instructed by Neocities
4. Update `site.url` in `src/_data/site.json`

### Analytics

Add analytics by editing `src/_includes/base.html`:
- Insert tracking code before `</head>`
- Popular options: Plausible, Fathom, SimpleAnalytics

### Environment Variables

For local development, create `.env`:
```
FORMSPARK_ID=your_id_here
BOTPOISON_PUBLIC_KEY=your_key_here
```

## Support & Resources

- **Template Repository**: [GitHub]({{ config.template_repo_url }})
- **Eleventy Documentation**: [11ty.dev](https://www.11ty.dev)
- **PagesCMS Documentation**: [pagescms.org/docs](https://pagescms.org/docs)
- **Neocities Help**: [neocities.org/help](https://neocities.org/help)
- **Contact**: Use the contact form or reach out via the repository issues

## License

This template is licensed under AGPLv3. You're free to use, modify, and distribute it, but you must:
- Keep the same license
- Provide source code if you distribute
- State your changes

---

*Built with the Chobble Template - Professional websites made simple*