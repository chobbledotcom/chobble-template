import { createRequire } from "module";
import { existsSync } from "fs";
import { join } from "path";
const require = createRequire(import.meta.url);

function isValidImage(imagePath) {
	if (!imagePath || imagePath.trim() === "") return false;
	if (imagePath.indexOf("http") === 0) return true;

	const filename = imagePath.split("/").pop();
	const fullPath = join(process.cwd(), "src", "images", filename);

	if (existsSync(fullPath)) return true;

	console.warn(`Warning: Image file not found: ${fullPath}`);
	return false;
}

export default {
	header_text: (data) => data.header_text || data.title,
	meta_title: (data) => data.meta_title || data.title,
	description: (data) => data.snippet || data.meta_description || "",
	contactForm: () => require("./contact-form.json"),
	thumbnail: (data) =>
		isValidImage(data.thumbnail)
			? data.thumbnail
			: data.gallery && data.gallery[0] && isValidImage(data.gallery[0])
				? data.gallery[0]
				: isValidImage(data.header_image)
					? data.header_image
					: null,
};
