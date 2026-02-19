import { getPropertyOrder } from "#config/list-config.js";
import configJson from "#data/config.json" with { type: "json" };

const propertyOrder = getPropertyOrder(configJson.property_order);

export default propertyOrder;
