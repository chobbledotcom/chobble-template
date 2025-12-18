#!/usr/bin/env node

/**
 * Downloads SVG icons from TouchStay JSON export
 * Usage: node scripts/download-touchstay-icons.js <input.json> [--output-dir <dir>]
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const args = process.argv.slice(2);
let inputFile = null;
let outputDir = "src/assets/icons/touchstay";

// Parse arguments
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--output-dir" && args[i + 1]) {
		outputDir = args[++i];
	} else if (!args[i].startsWith("-")) {
		inputFile = args[i];
	}
}

if (!inputFile) {
	console.error("Usage: node download-touchstay-icons.js <input.json> [--output-dir <dir>]");
	process.exit(1);
}

// Read and parse input file
console.log(`Reading input file: ${inputFile}\n`);
const data = JSON.parse(fs.readFileSync(inputFile, "utf-8"));

// Extract all unique SVG URLs
const svgUrls = new Set();
const str = JSON.stringify(data);
const matches = str.match(/https[^"]+\.svg[^"]*/g) || [];
for (const url of matches) {
	svgUrls.add(url.replace(/\\u0026/g, "&"));
}

console.log(`Found ${svgUrls.size} unique SVG URLs\n`);

// Create output directory
fs.mkdirSync(outputDir, { recursive: true });

// Download function
function downloadSvg(url) {
	return new Promise((resolve, reject) => {
		const cleanUrl = url.split("?")[0]; // Remove query params for filename
		const filename = path.basename(cleanUrl);

		https.get(url, (response) => {
			if (response.statusCode === 301 || response.statusCode === 302) {
				// Follow redirect
				downloadSvg(response.headers.location).then(resolve).catch(reject);
				return;
			}

			if (response.statusCode !== 200) {
				reject(new Error(`HTTP ${response.statusCode} for ${url}`));
				return;
			}

			let data = "";
			response.on("data", (chunk) => { data += chunk; });
			response.on("end", () => {
				resolve({ filename, data });
			});
			response.on("error", reject);
		}).on("error", reject);
	});
}

// Download all SVGs
async function downloadAll() {
	const urls = [...svgUrls];
	let success = 0;
	let failed = 0;

	for (const url of urls) {
		try {
			const { filename, data } = await downloadSvg(url);
			const outputPath = path.join(outputDir, filename);
			fs.writeFileSync(outputPath, data);
			console.log(`✓ Downloaded: ${filename}`);
			success++;
		} catch (error) {
			console.error(`✗ Failed: ${url} - ${error.message}`);
			failed++;
		}
	}

	console.log(`\n✓ Successfully downloaded ${success} icons`);
	if (failed > 0) {
		console.log(`✗ Failed to download ${failed} icons`);
	}
}

downloadAll();
