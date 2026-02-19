import { getCategoryOrder } from "#config/list-config.js";
import configJson from "#data/config.json" with { type: "json" };

const categoryOrder = getCategoryOrder(configJson.category_order);

export default categoryOrder;
