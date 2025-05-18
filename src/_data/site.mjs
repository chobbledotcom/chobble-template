import { createRequire } from "module";
const require = createRequire(import.meta.url);

const DEFAULTS = {
	sticky_mobile_nav: true,
	horizontal_nav: true,
	homepage_news: true, // if there is any
	homepage_products: true, // if there are any
};

const DEFAULT_PRODUCT_DATA = {
	product_thumb_widths: "224,336,448",
	product_thumb_sizes: "224px",
	category_thumb_widths: "224,336,448",
	category_thumb_sizes: "224px",
};

function getProducts(siteData) {
	const nonNulls = {};
	const products = siteData["products"] || {};
	Object.keys(products).forEach((key) => {
		if (products[key]) {
			nonNulls[key] = products[key];
		}
	});
	return nonNulls;
}

export default function () {
	const siteData = require("./site.json");
	const products = Object.assign(DEFAULT_PRODUCT_DATA, getProducts(siteData));
	return Object.assign(DEFAULTS, siteData, {
		products: products,
	});
}
