const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const parseAmount = (value) => {
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const parseSheetDate = (value) => {
  if (!value) return null;

  // Custom "DD/MM/YYYY", "DD/MM/YYYY h AM/PM" or "DD/MM/YYYY h:mm AM/PM"
  // format used by the Apps Script (minutes are optional, e.g. "5PM").
  const ddmmyyyy = String(value).match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{2}))?\s*(AM|PM))?$/i
  );
  if (ddmmyyyy) {
    const [, day, month, year, hourStr, minuteStr, ampm] = ddmmyyyy;
    let hours = hourStr ? parseInt(hourStr, 10) : 0;
    const minutes = minuteStr ? parseInt(minuteStr, 10) : 0;
    if (ampm) {
      const isPM = ampm.toUpperCase() === "PM";
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    }
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      hours,
      minutes
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // A small number of older rows were auto-converted by Google Sheets into
  // real Date cells before Apps Script started forcing plain-text storage,
  // and come back here as an ISO string with day/month unreliably swapped
  // (varies by row, not a fixed offset) — there's no safe way to recover the
  // originally-typed date from these, so they're treated as unparseable and
  // excluded from date-based stats. Retype the affected cells as DD/MM/YYYY
  // text in the sheet to fix them permanently.
  const isoMatch = String(value).match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  if (isoMatch) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Parses a "YYYY-MM-DD" date-key as a local date, avoiding the UTC-midnight
// shift that `new Date("YYYY-MM-DD")` applies.
// Formats a timestamp (ms) as "DD/MM/YYYY h:mm AM/PM", matching the Orders
// and Revenue sheet's Timestamp format.
export const formatSheetTimestamp = (timestamp) => {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
};

export const parseDateKey = (dateKey) => {
  if (!dateKey) return null;
  const match = String(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
};

const getField = (row, ...names) => {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
      return row[name];
    }
  }
  return "";
};

const parseItemsString = (itemsString) => {
  if (!itemsString) return [];
  return String(itemsString)
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const match = chunk.match(/^(.*)\(x(\d+)\)$/);
      if (match) {
        return { name: match[1].trim(), quantity: parseInt(match[2], 10) || 1 };
      }
      return { name: chunk, quantity: 1 };
    });
};

async function fetchSheet(sheetName) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT")) {
    console.warn("Google Apps Script URL not configured");
    return [];
  }

  const url = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${sheetName} sheet (status ${response.status})`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || `Failed to fetch ${sheetName} sheet`);
  }

  return result.rows || [];
}

export const fetchOrdersFromSheet = async () => {
  const rows = await fetchSheet("orders");
  return rows.map((row) => {
    const date = parseSheetDate(row["Timestamp"]);
    return {
      orderId: String(row["Order ID"] || ""),
      name: row["Customer Name"] || "",
      email: row["Email"] || "",
      phone: row["Phone"] || "",
      address: row["Address"] || "",
      items: parseItemsString(row["Items"]),
      total: parseAmount(row["Total"]),
      paymentMethod: row["Payment Method"] || "",
      giftBag: row["Gift Bag"] === "Yes",
      giftBox: row["Gift Box"] === "Yes",
      cardMessage: row["Message Card"] && row["Message Card"] !== "None" ? row["Message Card"] : "",
      freeShipping: row["Free Shipping"] === "Yes",
      metroStation: row["Metro Station"] || "",
      status: (row["Status"] || "pending").toLowerCase(),
      createdAt: date ? date.getTime() : null,
    };
  });
};

export const fetchRequestsFromSheet = async () => {
  const rows = await fetchSheet("requests");
  return rows.map((row) => {
    const date = parseSheetDate(row["Timestamp"]);
    return {
      requestId: String(row["Request ID"] || ""),
      itemName: row["Item Name"] || "",
      category: row["Category"] || "",
      phone: row["Phone"] || "",
      budgetMin: getField(row, "Budget Min (LE)", "Budget Min"),
      budgetMax: getField(row, "Budget Max (LE)", "Budget Max"),
      description: row["Description"] || "",
      status: (row["Status"] || "pending").toLowerCase(),
      createdAt: date ? date.getTime() : null,
    };
  });
};

export const fetchRevenueFromSheet = async () => {
  const rows = await fetchSheet("revenue");
  return rows.map((row) => {
    const date = parseSheetDate(row["Timestamp"]);
    return {
      date: date ? toDateKey(date) : "",
      timestamp: date ? date.getTime() : null,
      amount: parseAmount(getField(row, "Amount (LE)", "Amount")),
      payment: row["Payment Method"] || "",
      customer: row["Customer"] || "",
      items: row["Items"] || "",
    };
  });
};

export const fetchExpensesFromSheet = async () => {
  const rows = await fetchSheet("expenses");
  return rows.map((row) => {
    const date = parseSheetDate(row["Date"]);
    return {
      date: date ? toDateKey(date) : String(row["Date"] || ""),
      category: row["Category"] || "",
      amount: parseAmount(getField(row, "Amount (LE)", "Amount")),
      desc: row["Description"] || "",
    };
  });
};
