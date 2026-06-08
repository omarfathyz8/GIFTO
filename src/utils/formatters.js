export const formatTimestamp = (value) => {
  if (!value) {
    return "—";
  }
  const timestamp = typeof value === "number" ? value : Number(value);
  if (!Number.isNaN(timestamp)) {
    return new Date(timestamp).toLocaleString();
  }
  return String(value);
};

export const getUserDisplayName = (userProfile) => {
  const fullName = userProfile?.name || "GUEST";
  if (fullName === "GUEST") return fullName;
  const nameParts = fullName.trim().split(/\s+/);
  return nameParts.length >= 2
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
    : fullName;
};

export const calculateDeliveryTime = (createdAt) => {
  const date = new Date(createdAt);
  const daysToAdd = date.getHours() < 10 ? 3 : 4;
  date.setDate(date.getDate() + daysToAdd);
  date.setHours(10, 0, 0, 0);
  return date.getTime();
};
