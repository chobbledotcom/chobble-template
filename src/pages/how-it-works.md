---
name: How It Works
meta_title: How it works
meta_description: The pipeline from a YAML frontmatter file to a deployed static page, step by step.
blocks:
  - type: hero
    badge: Under the hood
    content: |
      # How a page gets built

      From a markdown file with YAML frontmatter to a validated, rendered, deployable static page - here's the whole pipeline.
  - type: split-code
    subtitle: "Step 1 - Write"
    content: |
      ## Pages are lists of blocks

      Every page is a markdown file whose frontmatter declares a `blocks`
      array. Each entry has a `type` plus that block's fields - the full
      vocabulary is on the [blocks page](/blocks/), with live previews where
      a meaningful standalone preview is possible.
    figure_filename: src/pages/example.md
    figure_language: yaml
    figure_code: "---\nname: Example\npermalink: /example/\nblocks:\n  - type: hero\n    content: |\n      # Hello\n  - type: markdown\n    content: Body text here.\n---"
  - type: split-code
    subtitle: "Step 2 - Validate"
    content: |
      ## The build checks every block

      Unknown block types, unknown top-level keys, and missing required
      values fail the build with an error naming the file and the block.
      Nested validation does not catch every unknown or mistyped child
      field, so compare nested entries with the schema and inspect the output.
      The same schemas generate the editor config and reference docs;
      tests check that those generated files stay current.
    reverse: true
    figure_filename: terminal
    figure_language: text
    figure_code: "Unknown block type \"herro\" (block 1 in ./src/pages/example.md).\nValid types: ..."
  - type: split-code
    subtitle: "Step 3 - Build"
    content: |
      ## One command, one directory

      Eleventy renders every page, processes images into responsive
      formats, bundles CSS and JS, builds the search index, and checks
      every internal link. The result is a plain `_site/` directory.
    figure_filename: terminal
    figure_language: bash
    figure_code: "npm run build\n# -> _site/\n#    index.html, blocks/, guide/, news/ ...\n#    css/, assets/, images/, pagefind/"
  - type: split-code
    subtitle: "Step 4 - Deploy"
    content: |
      ## Push to deploy

      A bundled workflow builds the site on every push and deploys it to
      Bunny Sites: `main` goes to production and every other branch to
      staging. `_site/` is also uploaded as a build artifact, so any other
      static host can serve the same directory instead.
    reverse: true
    figure_filename: .github/workflows/build-and-deploy.yaml
    figure_language: yaml
    figure_code: "- name: Deploy to Bunny Sites\n  uses: BunnyWay/actions/deploy-site@deploy-site_0.1.1\n  with:\n    site: ${{ steps.deployment_env.outputs.site }}\n    directory: _site\n    api_key: ${{ secrets.BUNNY_ACCESS_KEY }}"
  - type: cta
    content: |
      ## Explore the blocks

      The blocks page pairs standalone previews with their YAML examples.
      Collection-restricted blocks show usage guidance instead of a preview.
    button:
      text: Browse the blocks
      href: /blocks/
      size: lg
---
