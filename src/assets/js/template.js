// Clone a <template> element by ID and return its content
export const getTemplate = (id) =>
  document.getElementById(id)?.content.cloneNode(true);

// Populate quantity controls in a template with item data
export const populateQuantityControls = (template, item) => {
  const name = item.item_name;

  template.querySelectorAll("[data-name]").forEach((el) => {
    el.dataset.name = name;
  });

  const input = template.querySelector("input[type='number']");
  input.value = item.quantity;
  if (item.max_quantity) {
    input.max = item.max_quantity;
  }
};
