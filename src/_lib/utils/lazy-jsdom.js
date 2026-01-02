// Lazy-loaded JSDOM to avoid expensive startup import
// This module is imported instead of jsdom directly
let JSDOM;

const loadJSDOM = async () => {
  if (!JSDOM) {
    const jsdom = await import("jsdom");
    JSDOM = jsdom.JSDOM;
  }
  return JSDOM;
};

export { loadJSDOM };
