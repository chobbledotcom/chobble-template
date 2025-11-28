import { createRequire } from "module";
const require = createRequire(import.meta.url);

const DEFAULTS = {
	sticky_mobile_nav: true,
	horizontal_nav: true,
	homepage_news: true,
	homepage_products: true,
	externalLinksTargetBlank: false,
	formspark_id: null,
	botpoison_public_key: null,
	stripe_publishable_key: null,
	template_repo_url: "https://github.com/chobbledotcom/chobble-template",
	chobble_link: null,
	map_embed_src: null,
};

const DEFAULT_PRODUCT_DATA = {
	product_thumb_widths: "224,336,448",
	product_thumb_sizes: "224px",
	category_thumb_widths: "224,336,448",
	category_thumb_sizes: "224px",
	gallery_thumb_widths: "240,480",
	gallery_image_widths: "900,1300",
	header_image_widths: "640,900,1300",
};

function getProducts(configData) {
	const nonNulls = {};
	const products = configData["products"] || {};
	Object.keys(products).forEach((key) => {
		if (products[key]) {
			nonNulls[key] = products[key];
		}
	});
	return nonNulls;
}

export default function () {
	const configData = require("./config.json");
	const products = Object.assign(DEFAULT_PRODUCT_DATA, getProducts(configData));
	return Object.assign(DEFAULTS, configData, {
		products: products,
	});
}
