import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Cache the site data so it's only loaded once
let cachedSite = null;

export default function () {
  if (cachedSite) return cachedSite;
  cachedSite = require("./site.json");
  return cachedSite;
}
