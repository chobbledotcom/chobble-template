// Clone a <template> element by ID and return its content
export const getTemplate = (id) =>
  document.getElementById(id)?.content.cloneNode(true);
