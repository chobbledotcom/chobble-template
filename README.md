# Empty Eleventy Template, using Nix

This template should let you get started with the Eleventy static site builder on NixOS / Nix, really easily.

Featuring Nix'y features like:

- [direnv](https://direnv.net/) support via `flake.nix` - run `direnv allow`
- or run `nix develop` if you don't have direnv
- `nix-build` support using `flake-compat`
- `serve` shell script to run Eleventy and SASS locally
- `build` shell script to build the site into `_site`

And Eleventy features like:

- Canonical URLs
- A directory to store favicon cruft
- A `_data/site.json` metadata store
- An `collection.images` collection of the files in `src/images`

## Changing Packages

If you want to change the packages in `packages.json`, here's the steps:

- Remove all `nodeModules` lines from `node-deps.nix` and `flake.nix`
- Use `direnv reload` or `nix develop` to get a dev shell
- Add the new packages to `node-deps.nix` and run `direnv reload` to re-build `packages.json`
- Run `yarn -l` to create a new `yard.lock`
- Re-add the `nodeModule` lines to `node-deps.nix` and `flake.nix`

## Upgrading Packages

This is a little fiddlier:

- Remove all `nodeModules` lines from `node-deps.nix` and `flake.nix`
- Copy the generated `package.json` to your clipboard
- Delete `package.json` to remove the symbolic link
- Paste your clipbard back into a new `package.json`
- Run `yarn upgrade` to create a new `yarn.lock` and update `package.json`
- Copy those new version numbers from `package.json` to `node-deps.nix`
- Re-add the `nodeModule` lines to `node-deps.nix` and `flake.nix`

..I do intend to make those steps simpler some day. If you've got ideas of how I could, please contact me!
