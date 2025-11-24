# The Chobble Template

**⚠️ Don't forget to change the Formspark and Botpoison info in `_site/data.json`!! ⚠️ or in your repository's action's secrets**

**See this template in action at:**

- [example.chobble.com](https://example.chobble.com)
- [tradesperson-example.chobble.com](https://tradesperson-example.chobble.com)
- [southportorganics.co.uk](https://www.southportorganics.co.uk)
- [house-of-desserts.co.uk](https://www.house-of-desserts.co.uk)
- [ukegroupnorth.com](https://www.ukegroupnorth.com)
- [myalarmsecurity.co.uk](https://www.myalarmsecurity.co.uk)
- [c-results.uk](https://www.c-results.uk)

**Want me to make you a website based on this template?** Hit me up at [chobble.com](https://chobble.com).

**💖 Want to support the development of this template? 💖** Donate at [liberapay.com/chobble](https://liberapay.com/chobble/)

This should let you get started with the Eleventy static site builder, really easily.

The Github action is set to deploy to both Neocities and Bunny.net - you'll need to edit that.

Featuring common business website features like:

- News posts
- Reviews
- Events (one-off and recurring)
- Products (with linked reviews)
- Categories (with linked products)
- Galleries (on products and events)
- Team member profiles
- Menus
- A contact form using [Formspark](https://formspark.io/) and [Botpoison](https://botpoison.com/)
- Heading images
- Customisable strings
- Responsive images with `srcset`, [base64 low quality placeholders](https://blog.chobble.com/blog/25-04-16-adding-base64-image-backgrounds-to-eleventy-img/), optional custom cropping
- Github actions to deploy to Bunny and Neocities
- Sitemap and pretty blog feed

And Nix'y features like:

- [direnv](https://direnv.net/) support via `flake.nix` - run `direnv allow`
- or run `nix develop` if you don't have direnv
- `lint` shell script to format code with Biome (requires Nix)
- `screenshot` shell script to take website screenshots (requires Nix)

And Eleventy features like:

- Canonical URLs
- A directory to store favicon cruft
- A `_data/site.json` metadata store
- A `collection.images` collection of the files in `src/images`

And quality of life features like:

- Linting with [Biome](https://biomejs.dev/)
- CSS bundling (but not in dev)
- Instant page navigation from [Turbo](https://turbo.hotwired.dev/)

**Want a website based on this template? Clone this repo, or hit me up at [Chobble.com](https://chobble.com).**
