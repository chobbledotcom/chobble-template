#!/usr/bin/env node

/**
 * Fork simulation: proves the test suite tests the template, not its demo.
 *
 * A site forked from this template deletes the demo content and rewrites the
 * site data — its own name, toggles, languages and pages. The template's
 * tests travel with the fork, so they must pass there too. This copies the
 * working tree to a temporary directory, makes the changes a real fork makes
 * (see FORK_EDITS), and runs the full suite against the copy.
 *
 * Usage: npm run test:fork [-- --keep | --setup-only]
 *   --keep leaves the copy for debugging; --setup-only builds it and stops,
 *   so single test files can be run inside it.
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import matter from "gray-matter";
import { ensureDir } from "#eleventy/file-utils.js";
import { ROOT_DIR } from "#lib/paths.js";
import { isMainModule } from "#scripts/lib/is-main-module.js";
import { EN } from "#test/fixtures/languages.js";

/** Demo content a fork deletes: whole collections, pages, images, files. */
const DELETED = [
  "src/news",
  "src/guide-pages",
  "src/guide-categories",
  "src/files",
  "src/pages/about.md",
  "src/pages/blocks.md",
  "src/pages/contact.md",
  "src/pages/guide.md",
  "src/pages/home.md",
  "src/pages/how-it-works.md",
  "src/pages/news.md",
  "src/pages/search.md",
  "src/pages/deploying-sharedservices.md",
  "src/pages/theme-editor.md",
  "src/snippets/demo.md",
  "src/snippets/footer-content.md",
  "src/snippets/right-content.md",
  "src/images/breakfast.jpg",
  "src/images/city-traffic-night.jpg",
  "src/images/dinner.jpg",
  "src/images/fireworks.jpg",
  "src/images/hacker-pexels-cottonbro-8721342.jpg",
  "src/images/lunch.jpg",
  "src/images/menu.jpg",
  "src/images/party.jpg",
  "src/images/video-background-placeholder.jpg",
];

/** A language with every label a site must translate, marked with its code. */
const language = (code, overrides) => ({
  ...Object.fromEntries(
    Object.entries(EN).map(([key, value]) => [key, `${value} (${code})`]),
  ),
  code,
  hreflang: code,
  og_locale: code,
  home_url: `/${code}/`,
  is_default: false,
  ...overrides,
});

/** Site data a fork rewrites, with every toggle flipped from the template's. */
const DATA = {
  "site.json": {
    name: "Forked Site",
    url: "https://forked-site.cfa.codes",
    description: "A site forked from the template, with its demo removed.",
    cms_config: {
      collections: ["pages", "snippets"],
      features: {},
      hasSrcFolder: true,
      customBlocksCollections: [],
    },
  },
  "config.json": {
    show_breadcrumbs: false,
    placeholder_images: false,
    sticky_mobile_nav: false,
    horizontal_nav: false,
    collapse_menu: "always",
    language_switcher: "header",
    enable_theme_switcher: false,
    externalLinksTargetBlank: true,
    linkify_urls: false,
  },
  "languages.json": [language("en", { is_default: true }), language("cy", {})],
  "translations.json": [
    { en: "/en/", cy: "/cy/" },
    { en: "/en/about/", cy: "/cy/amdanom/" },
  ],
  "blockLayouts.json": {},
  "strings.json": { news_name: "Updates" },
};

/**
 * A fork's page: each language in its own folder, the default language under
 * /en/ with / redirecting to it, menus from frontmatter, and pages without a
 * permalink publishing where their file sits.
 */
const forkPage = (heading, frontmatter) => ({
  frontmatter: {
    name: heading,
    blocks: [{ type: "markdown", content: `# ${heading}` }],
    ...frontmatter,
  },
  content: "",
});

const PAGES = {
  "src/pages/en/index.md": forkPage("Forked home", {
    permalink: "/en/",
    redirect_from: ["/"],
    eleventyNavigation: { key: "Home", order: 1 },
  }),
  "src/pages/en/about.md": forkPage("About", {
    eleventyNavigation: { key: "About", order: 2 },
  }),
  "src/pages/cy/index.md": forkPage("Hafan", {
    permalink: "/cy/",
    eleventyNavigation: { key: "Hafan", order: 1 },
  }),
  "src/pages/cy/amdanom.md": forkPage("Amdanom", {
    eleventyNavigation: { key: "Amdanom", order: 2 },
  }),
  "src/snippets/footer-content.md": {
    frontmatter: { name: "Footer" },
    content: "Footer",
  },
  "src/snippets/cy/footer-content.md": {
    frontmatter: { name: "Troedyn" },
    content: "Troedyn",
  },
};

const writeText = (path, text) => {
  ensureDir(dirname(path));
  writeFileSync(path, text);
};

/** Run an npm script in the simulated fork; true when it succeeds. */
const npmRun = (target, script, stdio) =>
  spawnSync("npm", ["run", script], { cwd: target, stdio }).status === 0;

const main = () => {
  const target = mkdtempSync(join(tmpdir(), "cfa-fork-simulation-"));
  const inTarget = (file) => join(target, file);
  const workingTree = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: ROOT_DIR, encoding: "utf8" },
  );
  // The index still lists a file deleted but not yet staged; the working
  // tree, which is what a fork would hold, does not.
  for (const file of workingTree
    .split("\0")
    .filter((file) => file && existsSync(join(ROOT_DIR, file)))) {
    writeText(inTarget(file), readFileSync(join(ROOT_DIR, file)));
  }
  for (const path of DELETED) {
    rmSync(inTarget(path), { recursive: true, force: true });
  }
  for (const [file, data] of Object.entries(DATA)) {
    writeText(inTarget(`src/_data/${file}`), JSON.stringify(data, null, 2));
  }
  for (const [file, { frontmatter, content }] of Object.entries(PAGES)) {
    writeText(inTarget(file), matter.stringify(content, frontmatter));
  }
  symlinkSync(join(ROOT_DIR, "node_modules"), inTarget("node_modules"));
  // A fork regenerates its CMS config and references after changing site data
  if (!npmRun(target, "generate-references", "ignore")) {
    throw new Error(`generate-references failed in the fork at ${target}`);
  }
  console.log(`Fork simulation in ${target}`);
  if (process.argv.includes("--setup-only")) return;
  const passed = npmRun(target, "test", "inherit");
  if (!process.argv.includes("--keep")) rmSync(target, { recursive: true });
  process.exit(passed ? 0 : 1);
};

if (isMainModule(import.meta.url)) main();
