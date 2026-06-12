export const colorMap = {
  "black": "#000000",
  "blue": "#0000ff",
  "brown": "#6e330c",
  "cafe": "#c29567",
  "cherry": "#de3163",
  "coral": "#ff7f50",
  "cream": "#fffdd0",
  "cyan": "#4ea1d5",
  "dark brown": "#3f2824",
  "dark green": "#1b5e20",
  "gold": "#e6c051",
  "gray": "#808080",
  "grey": "#808080",
  "green": "#008000",
  "ivory": "#fffff0",
  "lavender": "#8778b8",
  "mint": "#98ff98",
  "mint green": "#98ff98",
  "navy": "#010157",
  "off-white": "#f5f1ed",
  "orange": "#ff8800",
  "pink": "#ffb6c1",
  "purple": "#800080",
  "red": "#ff0000",
  "rose": "#f894c3",
  "silver": "#c0c0c0",
  "teal": "#008080",
  "white": "#ffffff",
  "wood": "#dfbf8f",
  "yellow": "#ffff00",
};

export const getColorValue = (colorName) => {
  const lower = colorName.toLowerCase();
  return colorMap[lower] || lower;
};
