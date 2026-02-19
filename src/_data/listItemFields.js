import { selectListItemFields } from "#config/list-config.js";
import configJson from "#data/config.json" with { type: "json" };

const listItemFields = selectListItemFields(configJson.list_item_fields);

export default listItemFields;
