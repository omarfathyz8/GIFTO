export const getInventory = (product, selectedColor = null) => {
  if (!product || !selectedColor) return 0;
  const colors = product.colors || {};
  const colorData = colors[selectedColor];
  if (!colorData) return 0;
  return Number.isFinite(Number(colorData.stock)) ? Number(colorData.stock) : 0;
};

export const getAvailableInventory = (product, selectedColor = null) => {
  if (!product || !selectedColor) return 0;
  const inventory = getInventory(product, selectedColor);
  return Math.max(inventory, 0);
};
