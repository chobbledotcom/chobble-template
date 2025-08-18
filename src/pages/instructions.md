---
header_image: /images/hacker-pexels-cottonbro-8721342.jpg
header_text: Setup Instructions
subtitle: Complete guide to creating your website with the Chobble Template
meta_description: Step-by-step instructions for setting up, customising, and
  deploying your website using the Chobble Template
meta_title: Setup Instructions | Chobble Template
layout: page.html
permalink: /instructions/
eleventyNavigation:
  key: Instructions
  order: 2
---
## Chobble Template Instructions

You can use this template to get a fully-featured website up-and-running without needing to write a single line of code, with a built-in Content Management System courtesy of [PagesCMS](https://pagescms.org), and flexible support for products, news, team members, events, menus, and more!

Before you begin, you'll need:

1. A **[GitHub Account](https://github.com)** - For hosting your site's source code and "building" it into a full site.
2. A **[Neocities Account](https://neocities.org)** - For hosting your website so the public can access it (free tier available)

I also recommend signing up for these two services for easy spam-protected contact forms:

1. **[Formspark](https://formspark.io)** - Handles contact form submissions and sends them to your email (free tier: 250 submissions/month)
2. **[Botpoison](https://botpoison.com)** - Provides reasonably effective spam protection for your contact forms (free tier available)

### Step 1: Fork or Use This Template

1. Go to the [template repository]({{ config.template_repo_url }})
2. Click "Use this template"
3. Click "Create a new repository"
4. Name your repository (e.g., `weyland-corp-site`)

![Screenshot of the 'Use this template' button in the top right of the Github desktop interface](/images/instructions-use-this-template.png)

### Step 2: Neocities Configuration

1. Create a [Neocities account](https://neocities.org)
2. Note your site name (e.g., `weyland-corp.neocities.org`)
3. Go to Settings → API → Generate API Key
4. Copy your API key for the next step

### Step 3: Contact Form Setup (Optional)

For a working contact form:

1. Sign up at [Formspark](https://formspark.io) (free tier: 250 submissions/month)
2. Create a form and copy the **form ID**
3. Optional: Sign up at [Botpoison](https://botpoison.com) for spam protection
4. Copy your Botpoison **secret** key into your Formspark settings
5. Note the Botpoison **public** key for the next step

### Step 4: GitHub Secrets Configuration

In your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:

| Secret Name            | Description            | Required |
| ---------------------- | ---------------------- | -------- |
| `NEOCITIES_API_KEY`    | Your Neocities API key | Yes      |
| `FORMSPARK_ID`         | Formspark form ID      | Optional |
| `BOTPOISON_PUBLIC_KEY` | Botpoison key          | Optional |

![Github secrets screenshot showing my three secret keys](/images/instructions-github-secrets.png)

### Step 5: Edit Your Content

1. Visit [PagesCMS.org](https://pagescms.org)
2. Sign in with GitHub
3. Select your repository
4. Start editing your site content, settings, and configuration through the visual interface

All site configuration can be managed through PagesCMS, including site name, social links, opening times, and more.

### Step 6: Automated Deployment

Your site automatically deploys to the Neocities subdomain you noted before whenever you:

- Save changes in PagesCMS (which commits to GitHub)
- Edit files directly on GitHub
- Manually trigger the workflow from GitHub Actions tab

The `build-and-deploy.yaml` Github Action [(link)]({{ config.template_repo_url }}/blob/main/.github/workflows/build-and-deploy.yaml) handles the build and deployment process.

### Available Content Types

- **Pages** - Static pages ([example](/contact/))
- **News/Blog** - Articles and announcements ([example](/news/))
- **Products** - Items for sale or showcase ([example](/products/))
- **Events** - One-time or recurring events ([example](/events/))
- **Team Members** - Staff profiles ([example](/team/))
- **Reviews** - Customer testimonials ([example](/reviews/))
- **Menus** - Restaurant/cafe menus with items ([example](/menus/))

### Theme Customisation

1. Visit the [theme editor](/theme-editor/) on this demo site
2. Customise colors, fonts, spacing, and other design variables
3. Copy the generated CSS code
4. Paste it into `src/css/theme.scss` in your repository
5. Commit and push to apply your custom theme

### Layouts & Components

The template includes various layouts for different page types. View all available layouts and their documentation at:
`src/_layouts/` [(link)]({{ config.template_repo_url }}/tree/main/src/\_layouts)

### Image Optimisation

Images are automatically optimised during build:

- Responsive sizes generated
- WebP format for modern browsers
- Lazy loading enabled
- Cache preserved between builds

### SEO & Meta Tags

- Edit page front matter for meta descriptions and titles
- OpenGraph tags automatically generated
- Sitemap created at `/sitemap.xml` ([link](/sitemap.xml))
- Prettified RSS feed at `/feed.xml` ([link](/feed.xml))

### File Structure

Understanding the file structure can help advanced users make direct edits:

```
├── src/
│   ├── _data/          # Global data files (editable via PagesCMS)
│   ├── _includes/      # Template partials
│   ├── _layouts/       # Page layouts
│   ├── css/            # Stylesheets (theme.scss for customisation)
│   ├── images/         # Image assets
│   ├── js/             # JavaScript files
│   ├── pages/          # Static pages
│   ├── news/           # Blog posts
│   ├── products/       # Product pages
│   ├── events/         # Event listings
│   └── ...             # Other content types
├── _site/              # Built output (auto-generated)
├── .eleventy.js        # Eleventy configuration
├── .pages.yml          # PagesCMS configuration
└── package.json        # Dependencies
```

### Build Errors

- Check the GitHub Actions tab for error messages
- Ensure all image files referenced in content actually exist
- Verify file names match exactly (case-sensitive)

### Deployment Issues

- Verify GitHub secrets are correctly set
- Check Neocities API key is valid
- Ensure repository has Actions enabled
- Review workflow logs in GitHub Actions tab

### Content Not Updating

- Clear browser cache
- Check if changes are committed and pushed
- Verify GitHub Action completed successfully

### Custom Domains

1. Purchase a domain
2. In Neocities settings, add your domain
3. Update DNS records as instructed by Neocities
4. Update site URL in PagesCMS under Site Configuration

### Analytics

To add analytics, override the `src/_includes/head-scripts.html` file with your tracking code.

[Chobble customers](https://chobble.com) get Goatcounter included as standard.

### Support & Resources

- **Template Repository**: [GitHub]({{ config.template_repo_url }})
- **Eleventy Documentation**: [11ty.dev](https://www.11ty.dev)
- **PagesCMS Documentation**: [pagescms.org/docs](https://pagescms.org/docs)
- **Neocities Help**: [neocities.org/help](https://neocities.org/help)
- **Contact**: Use the contact form or reach out via the repository issues

### License

This template is licensed under AGPLv3. You're free to use, modify, and distribute it, but you must:

- Keep the same license
- Provide source code if you distribute
- State your changes

### Hire Me

**Does this all sound like hard work? [Hire me](https://chobble.com) and I'll make a website for you based on the Chobble Template, with 100% transparent hourly pricing for all jobs.**
