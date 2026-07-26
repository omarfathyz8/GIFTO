export const colorMap = {
  "black": "#000000",
  "charcoal": "#1A1A1A",
  "charcoal grey": "#3d3d3d",
  "navy": "#010157",
  "navy blue": "#1e1ea4",
  "blue": "#0000ff",
  "blue2": "#0000ff",
  "teal": "#008080",
  "cyan": "#62c1fb",
  "purple": "#6c096c",
  "lavender": "#8778b8",
  "dark brown": "#3f2824",
  "brown": "#6e330c",
  "coral": "#ff7f50",
  "orange": "#ed8003",
  "yellow": "#ffff00",
  "gold": "#e6c051",
  "cafe": "#c29567",
  "cafe2": "#c29567",
  "wood": "#dfbf8f",
  "cream": "#fffdd0",
  "dark green": "#1b5e20",
  "green": "#008000",
  "green2": "#008000",
  "mint green": "#98ff98",
  "mint": "#b1fed6",
  "burgundy": "#940303",
  "red": "#ff0000",
  "cherry": "#de3163",
  "rose": "#f894c3",
  "rose2": "#f894c3",
  "pink": "#ffb6c1",
  "off-white": "#f5f1ed",
  "silver": "#c0c0c0",
  "gray": "#454545",
  "grey": "#808080",
  "ivory": "#fffff0",
  "white": "#ffffff",
};

const colorKeywords = {
  "white": "#ffffff",
  "black": "#000000",
  "red": "#ff0000",
  "blue": "#0000ff",
  "green": "#008000",
  "yellow": "#ffff00",
  "purple": "#6c096c",
  "orange": "#ed8003",
  "pink": "#ffb6c1",
  "brown": "#6e330c",
  "gray": "#454545",
  "grey": "#808080",
};

export const getColorValue = (colorName) => {
  if (!colorName || typeof colorName !== "string") return "#cccccc";

  const lower = colorName.toLowerCase().trim();

  if (colorMap[lower]) return colorMap[lower];

  for (const [keyword, hex] of Object.entries(colorKeywords)) {
    if (lower.includes(keyword)) return hex;
  }

  return "#cccccc";
};
