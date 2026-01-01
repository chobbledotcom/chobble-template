// Template selector constants
// Single source of truth - all values auto-generated from schema

const toKebab = (s) => s.toLowerCase().replace(/_/g, "-");

// ===========================================
// Schema: Structure definition (values auto-generated)
// ===========================================

const SCHEMA = {
  CART_ITEM: ["CONTAINER", "NAME", "PRICE", "REMOVE"],
  QUOTE_CART_ITEM: ["CONTAINER", "NAME", "PRICE", "SPECS", "REMOVE"],
  QUOTE_CHECKOUT_ITEM: ["NAME", "QTY", "PRICE"],
};

// Templates and what class groups they use
const TEMPLATES = {
  CART_ITEM: ["CART_ITEM"],
  QUOTE_CART_ITEM: ["QUOTE_CART_ITEM"],
  QUOTE_CHECKOUT_ITEM: ["QUOTE_CHECKOUT_ITEM"],
  GALLERY_NAV_PREV: [],
  GALLERY_NAV_NEXT: [],
};

// ===========================================
// Auto-generated: Class names (for HTML)
// ===========================================

export const CLASSES = Object.fromEntries(
  Object.entries(SCHEMA).map(([group, props]) => [
    group,
    Object.fromEntries(
      props.map((p) =>
        p === "CONTAINER"
          ? [p, toKebab(group)]
          : [p, `${toKebab(group)}-${toKebab(p)}`],
      ),
    ),
  ]),
);

// ===========================================
// Auto-generated: Template IDs
// ===========================================

export const IDS = Object.fromEntries(
  Object.keys(TEMPLATES).map((k) => [k, `${toKebab(k)}-template`]),
);

// ===========================================
// Auto-generated: CSS selectors (for JS)
// ===========================================

const toSelectors = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      typeof v === "object" ? [k, toSelectors(v)] : [k, `.${v}`],
    ),
  );

export const SEL = toSelectors(CLASSES);

// ===========================================
// Auto-generated: Template definitions (for testing)
// ===========================================

const getClass = (path) => {
  const [group, prop] = path.split(".");
  return prop ? CLASSES[group][prop] : Object.values(CLASSES[group]);
};

export const TEMPLATE_DEFINITIONS = Object.fromEntries(
  Object.entries(TEMPLATES).map(([key, paths]) => [
    IDS[key],
    {
      id: IDS[key],
      classes: paths.flatMap(getClass),
    },
  ]),
);
