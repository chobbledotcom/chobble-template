# The Chobble Template

**⚠️ Don't forget to change the Formspark and Botpoison info in `_data/config.json` or in your repository's action secrets ⚠️**

**See this template in action at:**

- [example.chobble.com](https://example.chobble.com)
- [tradesperson-example.chobble.com](https://tradesperson-example.chobble.com)
- [funprouk.co.uk](https://www.funprouk.co.uk)
- [southportorganics.co.uk](https://www.southportorganics.co.uk)
- [house-of-desserts.co.uk](https://www.house-of-desserts.co.uk)
- [ukegroupnorth.com](https://www.ukegroupnorth.com)
- [myalarmsecurity.co.uk](https://www.myalarmsecurity.co.uk)
- [c-results.uk](https://www.c-results.uk)
- [playsafeplayinspection.co.uk](https://www.playsafeplayinspection.co.uk)
- [garsdalecottages.co.uk](https://www.garsdalecottages.co.uk)
- [medwaymascots.co.uk](https://www.medwaymascots.co.uk)

**Want me to make you a website based on this template?** Hit me up at [chobble.com](https://chobble.com).

**💖 Want to support the development of this template? 💖** Donate at [liberapay.com/chobble](https://liberapay.com/chobble/)

An Eleventy starter for business websites. The GitHub action deploys to both Neocities and Bunny.net - you'll need to edit that for your setup.

## Content Types

- **Products** - galleries, options with SKUs, FAQs, specifications, features lists, linked reviews with ratings
- **Categories** - product groupings with inherited thumbnails
- **Events** - one-off and recurring schedules, iCal feed generation
- **News** - blog posts with Atom feed
- **Menus** - categories, items, pricing, dietary indicators (vegan, gluten-free, etc.)
- **Locations** - multi-site support with sub-locations
- **Properties** - for holiday lets, linked to locations
- **Reviews** - linked to products, aggregate ratings
- **Team** - member profiles
- **Snippets** - reusable content blocks

## Shopping Cart & Payments

- LocalStorage-based cart with quantity limits
- Stripe/Square checkout via external [ecommerce backend](https://github.com/chobbledotcom/ecommerce)
- Quote/enquiry mode (submit cart as request instead of payment)
- Auto-generated SKUs via GitHub Action

## Theming

- 10 pre-built themes: Default, Neon, 90s Computer, Floral, Hacker, Monochrome, Ocean, Old Mac, Rainbow, Sunset
- Per-page theme overrides
- Visual theme editor at `/theme-editor/` with export
- CSS custom properties for colours, fonts, borders, layout
- SCSS support
- Bunny Fonts integration

## Images

- Responsive images with `srcset` via `eleventy-img`
- [Base64 LQIP placeholders](https://blog.chobble.com/blog/25-04-16-adding-base64-image-backgrounds-to-eleventy-img/)
- Gallery component with thumbnail navigation and full-size overlay
- Custom aspect ratio cropping

## Forms

- [Formspark](https://formspark.io/) for delivery
- [Botpoison](https://botpoison.com/) spam protection
- JSON-configured fields

## SEO & Structured Data

- Schema.org markup for products (with reviews/ratings), events, FAQs, organisation
- Canonical URLs
- Sitemap
- Atom feed with XSL stylesheet
- Meta descriptions, noindex support

## Navigation & Layout

- Horizontal or left sidebar navigation
- Sticky mobile nav option
- Two-column layout with sidebar
- Slider component for horizontal scrolling
- Scroll-fade animations (respects `prefers-reduced-motion`)

## Development

- [Nix flakes](https://nixos.wiki/wiki/Flakes) with [direnv](https://direnv.net/) support
- `bin/lint` - format with Biome
- `bin/screenshot` - automated screenshots
- [Biome](https://biomejs.dev/) linting
- [jscpd](https://github.com/kucherenko/jscpd) duplicate detection
- [Knip](https://knip.dev/) unused code detection
- 17+ test files with custom runner
- [instant.page](https://instant.page/) for link prefetching on hover

## Deployment

- GitHub Actions workflow for Neocities and Bunny.net
- Forgejo Actions support
- PagesCMS integration for no-code editing
- External [ecommerce backend](https://github.com/chobbledotcom/ecommerce) for payment processing

## Configuration

- `_data/config.json` - Formspark, Botpoison, ecommerce checkout, map embed, nav options
- `_data/site.json` - name, URL, description, social links (14 platforms), opening hours
- `_data/meta.json` - language, organisation details for schema.org
- `_data/strings.json` - customisable labels and permalink directories

**Want a website based on this template? Clone this repo, or hit me up at [Chobble.com](https://chobble.com).**
