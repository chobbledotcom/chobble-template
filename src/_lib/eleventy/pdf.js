import { createWriteStream } from "node:fs";
import { dirname } from "node:path";
import site from "#data/site.json" with { type: "json" };
import strings from "#data/strings.js";
import { ensureDir } from "#eleventy/file-utils.js";
import {
  filter,
  flatMap,
  join,
  map,
  mapAsync,
  pipe,
  sort,
} from "#toolkit/fp/array.js";
import { memoize } from "#toolkit/fp/memoize.js";
import { log, error as logError } from "#utils/console.js";
import { uniqueDietaryKeys } from "#utils/dietary-utils.js";
import { buildPdfFilename } from "#utils/slug-utils.js";
import { sortItems } from "#utils/sorting.js";

const getPdfRenderer = memoize(
  async () => (await import("json-to-pdf")).renderPdfTemplate,
);

function buildMenuPdfData(menu, { menuCategories, menuItems }) {
  const items = menuItems;

  const categories = pipe(
    filter((cat) => cat.data.menus?.includes(menu.fileSlug)),
    sort(sortItems),
  )(menuCategories);

  const inCategory = (category) => (item) =>
    item.data.menu_categories?.includes(category.fileSlug);

  const itemsInCategory = (category) =>
    pipe(
      filter(inCategory(category)),
      map((item) => ({
        name: item.data.name,
        price: item.data.price,
        description: item.data.description,
        dietarySymbols: pipe(
          map((k) => k.symbol),
          join(" "),
        )(item.data.dietaryKeys),
      })),
    )(items);

  const pdfCategories = map((category) => ({
    name: category.data.name,
    description: category.templateContent
      ? category.templateContent.replace(/<[^>]*>/g, "").trim()
      : "",
    items: itemsInCategory(category),
  }))(categories);

  const allDietaryKeys = pipe(
    flatMap((category) =>
      items
        .filter(inCategory(category))
        .flatMap((item) => item.data.dietaryKeys),
    ),
    uniqueDietaryKeys,
  )(categories);

  const dietaryKeyString = pipe(
    map((k) => `(${k.symbol}) ${k.label}`),
    join(", "),
  )(allDietaryKeys);

  return {
    businessName: site.name,
    menuTitle: menu.data.title,
    subtitle: menu.data.subtitle,
    categories: pdfCategories,
    dietaryKeyString,
    hasDietaryKeys: allDietaryKeys.length > 0,
  };
}

function createMenuPdfTemplate() {
  const centeredText = (text, style, margin) => ({
    text,
    style,
    alignment: "center",
    margin,
  });

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content: [
      centeredText("{{businessName}}", "businessName", [0, 0, 0, 5]),
      centeredText("{{menuTitle}}", "menuTitle", [0, 0, 0, 5]),
      centeredText("{{subtitle}}", "subtitle", [0, 0, 0, 20]),
      {
        "{{#each categories:category}}": [
          {
            text: "{{category.name}}",
            style: "categoryHeader",
            margin: [0, 15, 0, 5],
          },
          {
            "{{#if category.description}}": {
              text: "{{category.description}}",
              style: "categoryDescription",
              margin: [0, 0, 0, 8],
            },
          },
          {
            "{{#each category.items:item}}": {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: [
                        { text: "{{item.name}}", style: "itemName" },
                        {
                          "{{#if item.dietarySymbols}}": {
                            text: " ({{item.dietarySymbols}})",
                            style: "dietary",
                          },
                        },
                      ],
                    },
                    {
                      "{{#if item.description}}": {
                        text: "{{item.description}}",
                        style: "itemDescription",
                      },
                    },
                  ],
                },
                {
                  width: "auto",
                  text: "{{item.price}}",
                  style: "price",
                  alignment: "right",
                },
              ],
              margin: [0, 0, 0, 8],
            },
          },
        ],
      },
      {
        "{{#if hasDietaryKeys}}": {
          text: [
            { text: "Dietary Key: ", style: "dietaryKeyLabel" },
            { text: "{{dietaryKeyString}}", style: "dietaryKeyText" },
          ],
          margin: [0, 25, 0, 0],
        },
      },
    ],
    styles: {
      businessName: {
        fontSize: 24,
        bold: true,
      },
      menuTitle: {
        fontSize: 18,
        bold: true,
        color: "#333333",
      },
      subtitle: {
        fontSize: 12,
        italics: true,
        color: "#666666",
      },
      categoryHeader: {
        fontSize: 16,
        bold: true,
        color: "#333333",
      },
      categoryDescription: {
        fontSize: 10,
        italics: true,
        color: "#666666",
      },
      itemName: {
        fontSize: 11,
        bold: true,
      },
      itemDescription: {
        fontSize: 9,
        color: "#666666",
        margin: [0, 2, 0, 0],
      },
      price: {
        fontSize: 11,
        bold: true,
      },
      dietary: {
        fontSize: 9,
        color: "#888888",
      },
      dietaryKeyLabel: {
        fontSize: 9,
        bold: true,
        color: "#666666",
      },
      dietaryKeyText: {
        fontSize: 9,
        color: "#666666",
      },
    },
    defaultStyle: {
      font: "Helvetica",
    },
  };
}

async function generateMenuPdf(menu, state, outputDir) {
  const data = buildMenuPdfData(menu, state);
  const template = createMenuPdfTemplate();

  const renderPdfTemplate = await getPdfRenderer();
  const pdfDoc = renderPdfTemplate(template, data);
  if (!pdfDoc) {
    logError(`Failed to generate PDF for menu: ${menu.data.title}`);
    return null;
  }

  const filename = buildPdfFilename(site.name, menu.fileSlug);
  const outputPath = `${outputDir}/${strings.menus_permalink_dir}/${menu.fileSlug}/${filename}`;
  ensureDir(dirname(outputPath));

  return new Promise((resolve, reject) => {
    const stream = createWriteStream(outputPath);
    pdfDoc.pipe(stream);
    pdfDoc.end();
    stream.on("finish", () => {
      log(`Generated PDF: ${outputPath}`);
      resolve(outputPath);
    });
    stream.on("error", (err) => {
      logError(`Error writing PDF: ${outputPath}`, err);
      reject(err);
    });
  });
}

export const configurePdf = (eleventyConfig) => {
  let state = null;

  eleventyConfig.addCollection("_pdfMenuData", (collectionApi) => {
    state = {
      menus: collectionApi.getFilteredByTag("menus"),
      menuCategories: collectionApi.getFilteredByTag("menu-categories"),
      menuItems: collectionApi.getFilteredByTag("menu-items"),
    };
    return [];
  });

  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    if (!state || !state.menus || state.menus.length === 0) return;

    await mapAsync((menu) => generateMenuPdf(menu, state, dir.output))(
      state.menus,
    );
  });
};

export { generateMenuPdf, buildMenuPdfData };
