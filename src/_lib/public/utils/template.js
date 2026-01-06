// Clone a <template> element by ID and return its content
export const getTemplate = (id, doc) =>
  doc.getElementById(id)?.content.cloneNode(true);

// Populate common cart item fields (name, price, data-name attribute)
export const populateItemFields = (template, name, price) => {
  template.firstElementChild.dataset.name = name;
  template.querySelector('[data-field="name"]').textContent = name;
  template.querySelector('[data-field="price"]').textContent = price;
};

// Populate quantity controls in a template with item data
export const populateQuantityControls = (template, item) => {
  const name = item.item_name;

  for (const el of template.querySelectorAll("[data-name]")) {
    el.dataset.name = name;
  }

  const input = template.querySelector("input[type='number']");
  input.value = item.quantity;
  if (item.max_quantity) {
    input.max = item.max_quantity;
  }
};
