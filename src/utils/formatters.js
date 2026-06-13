export const formatTimestamp = (value) => {
  if (!value) {
    return "—";
  }
  const timestamp = typeof value === "number" ? value : Number(value);
  if (!Number.isNaN(timestamp)) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
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
  const daysToAdd = date.getHours() < 9 ? 2 : 3;
  date.setDate(date.getDate() + daysToAdd);
  date.setHours(18, 0, 0, 0);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
};
