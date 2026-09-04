import React, { useState, useEffect, useCallback } from "react";
import { fetchOrdersFromSheet, fetchRequestsFromSheet, fetchExpensesFromSheet, parseDateKey } from "../../services/googleSheets";

const BusinessOverview = ({ products, users = [] }) => {
  const [sheetOrders, setSheetOrders] = useState([]);
  const [sheetRequests, setSheetRequests] = useState([]);
  const [sheetExpenses, setSheetExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orders, requests, expenses] = await Promise.all([
        fetchOrdersFromSheet(),
        fetchRequestsFromSheet(),
        fetchExpensesFromSheet(),
      ]);
      setSheetOrders(orders);
      setSheetRequests(requests);
      setSheetExpenses(expenses);
    } catch (err) {
      console.error("Failed to load business overview data from Google Sheets:", err);
      setError("Failed to load data from Google Sheets. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const delivered = sheetOrders.filter((o) => o.status === "delivered");
  const pending = sheetOrders.filter((o) => o.status === "pending" || o.status === "processing");
  const cancelled = sheetOrders.filter((o) => o.status === "cancelled");
  const revenue = delivered.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalExpenses = sheetExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const isSameMonthTimestamp = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  };

  const isSameMonthDateKey = (dateKey) => {
    const date = parseDateKey(dateKey);
    if (!date) return false;
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  };

  const monthRevenue = delivered
    .filter((o) => isSameMonthTimestamp(o.createdAt))
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const monthExpenses = sheetExpenses
    .filter((e) => isSameMonthDateKey(e.date))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const gotLeft = 3000 - totalExpenses + revenue;

  const totalItemsSold = delivered.reduce(
    (sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0),
    0
  );

  const bestSeller = (() => {
    const itemCounts = {};
    sheetOrders.forEach((order) => {
      order.items.forEach((item) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    const bestItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
    return bestItem ? `${bestItem[0].substring(0, 15)} (${bestItem[1]})` : "No Sales";
  })();

  const activeCustomers = new Set(delivered.map((o) => o.name).filter(Boolean)).size;

  const totalInventory = (() => {
    let totalStock = 0;
    products.forEach((product) => {
      if (product.colors && typeof product.colors === "object") {
        Object.values(product.colors).forEach((color) => {
          totalStock += color.stock || 0;
        });
      }
    });
    return totalStock;
  })();

  const inventoryValue = (() => {
    let totalValue = 0;
    products.forEach((product) => {
      if (product.colors && typeof product.colors === "object") {
        Object.values(product.colors).forEach((color) => {
          totalValue += (color.stock || 0) * (product.price || 0);
        });
      }
    });
    return totalValue;
  })();

  const outOfStockCount = products.filter((p) => {
    if (!p.colors || typeof p.colors !== "object") return false;
    return Object.values(p.colors).every((color) => (color.stock || 0) === 0);
  }).length;

  const lowStockCount = products.filter((p) => {
    if (!p.colors || typeof p.colors !== "object") return false;
    const totalStock = Object.values(p.colors).reduce((sum, color) => sum + (color.stock || 0), 0);
    return totalStock > 0 && totalStock <= 5;
  }).length;

  return (
    <section className="admin-section">
      <div className="section-title-row centered">
        <div>
          <h2>Business Overview</h2>
        </div>
        <button
          type="button"
          className="secondary-button small"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "var(--danger, #e53e3e)",
            color: "white",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="metric-label">Registered Users</div>
          <div className="metric-value">{Math.max(users.length - 3, 0)}</div>
          <div className="metric-description">Total registered customers</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Total Orders</div>
          <div className="metric-value">{sheetOrders.length}</div>
          <div className="metric-description">All time orders</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Delivered Orders</div>
          <div className="metric-value">{delivered.length}</div>
          <div className="metric-description">{sheetOrders.length > 0 ? Math.round((delivered.length / sheetOrders.length) * 100) : 0}% completion</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Awaiting Orders</div>
          <div className="metric-value">{pending.length}</div>
          <div className="metric-description">Pending/Processing action</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Active Customers</div>
          <div className="metric-value">{activeCustomers}</div>
          <div className="metric-description">Made a purchase</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Best Seller</div>
          <div className="metric-value">{bestSeller}</div>
          <div className="metric-description">Most ordered product</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Cancelled Orders</div>
          <div className="metric-value">{cancelled.length}</div>
          <div className="metric-description">{sheetOrders.length > 0 ? Math.round((cancelled.length / sheetOrders.length) * 100) : 0}% cancellation rate</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Pending Requests</div>
          <div className="metric-value">{sheetRequests.filter((r) => r.status === "pending").length}</div>
          <div className="metric-description">Awaiting review</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">{revenue.toLocaleString()} LE</div>
          <div className="metric-description">Delivered orders only</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Total Expenses</div>
          <div className="metric-value">{totalExpenses.toLocaleString()} LE</div>
          <div className="metric-description">All recorded expenses</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Got Left</div>
          <div className="metric-value">{gotLeft.toLocaleString()} LE</div>
          <div className="metric-description">From 3000 investment</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Total Items Sold</div>
          <div className="metric-value">{totalItemsSold.toLocaleString()}</div>
          <div className="metric-description">From delivered orders</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">This Month Revenue</div>
          <div className="metric-value">{monthRevenue.toLocaleString()} LE</div>
          <div className="metric-description">Delivered orders this month</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">This Month Expenses</div>
          <div className="metric-value">{monthExpenses.toLocaleString()} LE</div>
          <div className="metric-description">Recorded expenses this month</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Total Inventory</div>
          <div className="metric-value">{totalInventory}</div>
          <div className="metric-description">Total units in stock</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Inventory Value</div>
          <div className="metric-value">{inventoryValue.toLocaleString()} LE</div>
          <div className="metric-description">Value of all stock</div>
        </div>
      </div>

      <div className="insights-card">
        <h3>Business Insights & Recommendations</h3>
        <ul className="insights-list">
          {pending.length > 5 && (
            <li className="insight-warning">
              ⚠️ <strong>High Pending/Processing Orders:</strong> You have{" "}
              {pending.length} pending or processing orders. Consider processing
              them to improve delivery times.
            </li>
          )}
          {outOfStockCount > 0 && (
            <li className="insight-warning">📦 <strong>Out of Stock Alert:</strong> {outOfStockCount} products are completely out of stock. Restock popular items.</li>
          )}
          {sheetOrders.length > 0 && cancelled.length > sheetOrders.length * 0.1 && (
            <li className="insight-warning">📊 <strong>High Cancellation Rate:</strong> Your cancellation rate is above 10%. Review customer feedback.</li>
            )}
          {lowStockCount > 0 && (
            <li className="insight-info">⏰ <strong>Low Inventory:</strong> {lowStockCount} products have low stock (≤5 units). Consider reordering soon.</li>
          )}
          {products.length > 0 && (
            <li className="insight-info">📈 <strong>Total Products:</strong> You have {products.length} products in your catalog. Monitor bestsellers and underperformers.</li>
          )}
          {sheetOrders.length > 0 && delivered.length === sheetOrders.length && (
            <li className="insight-success">✅ <strong>Perfect Delivery:</strong> All orders have been delivered! Excellent performance.</li>
            )}
        </ul>
      </div>
    </section>
  );
};

export default BusinessOverview;
