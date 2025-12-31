import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { renderPdfTemplate } from "json-to-pdf";
import site from "#data/site.json" with { type: "json" };
import { buildPdfFilename } from "#utils/slug-utils.js";
import { sortItems } from "#utils/sorting.js";

function buildMenuPdfData(menu, menuCategories, menuItems) {
  const menuSlug = menu.fileSlug;

  const categories = (menuCategories || [])
    .filter((cat) => cat.data.menus?.includes(menuSlug))
    .sort(sortItems);

  const pdfCategories = categories.map((category) => {
    const items = (menuItems || [])
      .filter((item) => item.data.menu_categories?.includes(category.fileSlug))
      .map((item) => ({
        name: item.data.name,
        price: item.data.price,
        description: item.data.description || "",
        dietarySymbols: (item.data.dietaryKeys || [])
          .map((k) => k.symbol)
          .join(" "),
      }));

    return {
      name: category.data.name,
      description: category.templateContent
        ? category.templateContent.replace(/<[^>]*>/g, "").trim()
        : "",
      items,
    };
  });

  const allDietaryKeys = categories
    .flatMap((category) =>
      (menuItems || [])
        .filter((item) =>
          item.data.menu_categories?.includes(category.fileSlug),
        )
        .flatMap((item) => item.data.dietaryKeys || []),
    )
    .filter((key) => key.symbol && key.label);

  const uniqueDietaryKeys = [
    ...new Map(allDietaryKeys.map((key) => [key.symbol, key])).values(),
  ];

  // Pre-join dietary keys as a string since json-to-pdf doesn't support @last
  const dietaryKeyString = uniqueDietaryKeys
    .map((k) => `(${k.symbol}) ${k.label}`)
    .join(", ");

  return {
    businessName: site.name,
    menuTitle: menu.data.title,
    subtitle: menu.data.subtitle || "",
    categories: pdfCategories,
    dietaryKeyString,
    hasDietaryKeys: uniqueDietaryKeys.length > 0,
  };
}

function createMenuPdfTemplate() {
  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content: [
      {
        text: "{{businessName}}",
        style: "businessName",
        alignment: "center",
        margin: [0, 0, 0, 5],
      },
      {
        text: "{{menuTitle}}",
        style: "menuTitle",
        alignment: "center",
        margin: [0, 0, 0, 5],
      },
      {
        text: "{{subtitle}}",
        style: "subtitle",
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
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

async function generateMenuPdf(menu, menuCategories, menuItems, outputDir) {
  const data = buildMenuPdfData(menu, menuCategories, menuItems);
  const template = createMenuPdfTemplate();

  const pdfDoc = renderPdfTemplate(template, data);
  if (!pdfDoc) {
    console.error(`Failed to generate PDF for menu: ${menu.data.title}`);
    return null;
  }

  const filename = buildPdfFilename(site.name, menu.fileSlug);
  const outputPath = `${outputDir}/menus/${menu.fileSlug}/${filename}`;
  const dir = dirname(outputPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const stream = createWriteStream(outputPath);
    pdfDoc.pipe(stream);
    pdfDoc.end();

    stream.on("finish", () => {
      console.log(`Generated PDF: ${outputPath}`);
      resolve(outputPath);
    });

    stream.on("error", (error) => {
      console.error(`Error writing PDF: ${outputPath}`, error);
      reject(error);
    });
  });
}

export function configurePdf(eleventyConfig) {
  let state = null;

  eleventyConfig.addCollection("_pdfMenuData", (collectionApi) => {
    state = {
      menus: collectionApi.getFilteredByTag("menu"),
      menuCategories: collectionApi.getFilteredByTag("menu_category"),
      menuItems: collectionApi.getFilteredByTag("menu_item"),
    };
    return [];
  });

  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    if (!state) {
      console.log("No menu collections found, skipping PDF generation");
      return;
    }

    const { menus, menuCategories, menuItems } = state;

    if (!menus || menus.length === 0) {
      console.log("No menus found, skipping PDF generation");
      return;
    }

    for (const menu of menus) {
      try {
        await generateMenuPdf(menu, menuCategories, menuItems, dir.output);
      } catch (error) {
        console.error(`Error generating PDF for ${menu.data.title}:`, error);
      }
    }
  });
}

export { generateMenuPdf, buildMenuPdfData, createMenuPdfTemplate };
