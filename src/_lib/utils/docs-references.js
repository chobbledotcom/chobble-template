/**
 * Builds the docs-references items that publish the repository's reference
 * documents as guide pages on the template's own site.
 *
 * The sources stay where agents read them — the root architecture
 * walkthrough and the site-builder skill's references, which travel with
 * every fork — and each build renders the same files under
 * `/guide/reference/` with the guide chrome, a table of contents, and links
 * rewritten to published routes or GitHub (`#utils/docs-transform.js`).
 * A fork deletes `src/guide-pages/`, so it publishes none of this: the
 * collection simply has no consumer there.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { GITHUB_BASE } from "#utils/docs-links.js";
import { publishMarkdown, stripTitleHeading } from "#utils/docs-transform.js";

const SKILL_REFERENCES = "skills/cfa-static-site-builder/references";

/** The guide category the published reference pages file under. */
const GUIDE_CATEGORY = "reference";

/**
 * What publishes, in listing order. Each `source` is repository-relative and
 * must exist — a missing source fails the build rather than quietly
 * dropping a document.
 */
const MANIFEST = [
  {
    source: "ARCHITECTURE.md",
    slug: "architecture",
    name: "Architecture",
    subtitle: "How CfA Static works, from content files to deployable artifact",
  },
  {
    source: `${SKILL_REFERENCES}/project-setup.md`,
    slug: "project-setup",
    name: "Project setup",
    subtitle: "Starting a site: fork, identity, collections, CMS, deployment",
  },
  {
    source: `${SKILL_REFERENCES}/content-authoring.md`,
    slug: "content-authoring",
    name: "Content authoring",
    subtitle: "Pages, news, guides, snippets, and media",
  },
  {
    source: `${SKILL_REFERENCES}/blocks.md`,
    slug: "blocks",
    name: "Block reference",
    subtitle: "Every block's fields and canonical YAML examples",
  },
  {
    source: `${SKILL_REFERENCES}/layouts.md`,
    slug: "layouts",
    name: "Layouts",
    subtitle: "Rendering architecture, columns, sidebars, and styling",
  },
  {
    source: `${SKILL_REFERENCES}/i18n.md`,
    slug: "i18n",
    name: "Languages",
    subtitle: "Publishing in more than one language",
  },
  {
    source: `${SKILL_REFERENCES}/site-mirroring.md`,
    slug: "site-mirroring",
    name: "Site mirroring",
    subtitle: "Rebuilding an existing site page for page",
  },
  {
    source: `${SKILL_REFERENCES}/verification.md`,
    slug: "verification",
    name: "Verification",
    subtitle: "Checking a change before handoff",
  },
];

/**
 * Routes for documents that are not manifest entries. The DevOps walkthrough
 * is fork-deleted demo content, so documents that travel with forks link its
 * GitHub URL — which the publisher localizes to the route.
 */
const EXTRA_ROUTES = {
  [`${GITHUB_BASE}/blob/main/src/pages/deploying-sharedservices.md`]:
    "/deploying-sharedservices/",
};

/** Every published document's repo path mapped to its route. */
const PUBLISHED = {
  ...Object.fromEntries(
    MANIFEST.map(({ source, slug }) => [
      source,
      `/${["guide", GUIDE_CATEGORY, slug].join("/")}/`,
    ]),
  ),
  ...EXTRA_ROUTES,
};

/**
 * Build one item per manifest entry, ready for the paginated guide template.
 * @param {string} rootDir Repository root
 * @returns {Array<{ slug: string, name: string, subtitle: string, category: string, blocks: object[] }>}
 */
export const buildDocsReferences = (rootDir = ROOT_DIR) =>
  MANIFEST.map(({ source, slug, name, subtitle }) => {
    const raw = readFileSync(join(rootDir, source), "utf-8");
    const content = publishMarkdown(stripTitleHeading(raw), {
      sourcePath: source,
      routes: PUBLISHED,
      rootDir,
    });
    return {
      slug,
      name,
      subtitle,
      category: GUIDE_CATEGORY,
      blocks: [
        { type: "guide-header" },
        { type: "guide-navigation" },
        { type: "table-of-contents", levels: "2" },
        { type: "markdown", content },
      ],
    };
  });
