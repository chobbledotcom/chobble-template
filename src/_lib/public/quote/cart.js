/**
 * The visitor's quote, kept in their browser's localStorage so it follows
 * them from product to product. Every change announces itself with a
 * `quote-cart-change` event on the document, which the header count and
 * the quote-form block listen for.
 *
 * @module #public/quote/cart
 */

const CART_KEY = "quote_cart";

/**
 * One line of the quote.
 * @typedef {{ name: string, unit_price: number, quantity: number, max_quantity?: number, hire_prices: Record<string, number> }} CartItem
 */

/**
 * The lines of the quote. Browser storage is outside input - cleared, or
 * written by an older version of this code - so anything that is not a
 * list of quote lines reads as an empty quote.
 * @returns {CartItem[]}
 */
export const getCart = () => {
  const items = JSON.parse(localStorage.getItem(CART_KEY));
  /**
   * @param {*} item
   * @returns {item is CartItem}
   */
  const isCartItem = (item) =>
    typeof item?.name === "string" &&
    typeof item.unit_price === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.hire_prices === "object" &&
    item.hire_prices !== null;
  return Array.isArray(items) ? items.filter(isCartItem) : [];
};

/**
 * Store the quote and announce the change.
 * @param {CartItem[]} items
 */
const saveCart = (items) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  document.dispatchEvent(new CustomEvent("quote-cart-change"));
};

/**
 * Set how many of a line the quote holds, up to the line's maximum; none
 * removes the line.
 * @param {string} name
 * @param {number} quantity
 */
export const setQuantity = (name, quantity) =>
  saveCart(
    getCart().flatMap((item) => {
      if (item.name !== name) return [item];
      if (!(quantity > 0)) return [];
      const most =
        item.max_quantity === undefined ? quantity : item.max_quantity;
      return [{ ...item, quantity: Math.min(Math.floor(quantity), most) }];
    }),
  );

/**
 * Add one of something to the quote: a new line, or one more of a line it
 * already holds.
 * @param {Omit<CartItem, "quantity">} item
 */
export const addItem = (item) => {
  const cart = getCart();
  const existing = cart.find((line) => line.name === item.name);
  if (existing) {
    setQuantity(item.name, existing.quantity + 1);
  } else {
    saveCart([...cart, { ...item, quantity: 1 }]);
  }
};

/**
 * Forget the quote once it has been sent. The page is about to leave, and
 * the form being sent still needs the lines it shows, so nothing re-renders.
 */
export const forgetCart = () => localStorage.removeItem(CART_KEY);
