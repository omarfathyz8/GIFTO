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

  const revenueByMonth = (() => {
    const months = [];
    const currentDate = new Date();

    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - offset, 1);
      months.push({
        key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
        label: monthDate.toLocaleDateString("en", { month: "short" }),
        amount: 0,
      });
    }

    const monthsByKey = new Map(months.map((month) => [month.key, month]));
    delivered.forEach((order) => {
      if (!order.createdAt) return;
      const date = new Date(order.createdAt);
      const month = monthsByKey.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (month) month.amount += Number(order.total) || 0;
    });

    return months;
  })();

  const maxMonthlyRevenue = Math.max(...revenueByMonth.map((month) => month.amount), 0);
  const orderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"].map((status) => ({
    name: status,
    count: sheetOrders.filter((order) => order.status === status).length,
  }));
  const maxOrderStatusCount = Math.max(...orderStatuses.map((status) => status.count), 0);

  const topProducts = (() => {
    const soldCounts = new Map();
    delivered.forEach((order) => {
      order.items.forEach((item) => {
        if (!item.name) return;
        soldCounts.set(item.name, (soldCounts.get(item.name) || 0) + (Number(item.quantity) || 0));
      });
    });

    return Array.from(soldCounts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();
  const maxProductCount = Math.max(...topProducts.map((product) => product.count), 0);

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

      <div className="charts-section">
        <h3>Important Charts & Graphs</h3>
        <div className="charts-grid">
          <article className="chart-card revenue-chart-card">
            <h4>Revenue Over Time</h4>
            <p className="chart-description">Delivered orders by order month · last 6 months</p>
            {loading ? (
              <p className="chart-empty">Loading chart data…</p>
            ) : revenueByMonth.every((month) => month.amount === 0) ? (
              <p className="chart-empty">No delivered-order revenue in this period.</p>
            ) : (
              <svg
                className="revenue-chart"
                viewBox="0 0 640 260"
                role="img"
                aria-label="Revenue over the last six months from delivered orders"
              >
                {[0, 1, 2, 3].map((step) => {
                  const y = 190 - step * 50;
                  const value = maxMonthlyRevenue * step / 3;
                  return (
                    <g key={step}>
                      <line x1="54" y1={y} x2="620" y2={y} className="chart-grid-line" />
                      <text x="46" y={y + 4} textAnchor="end" className="chart-axis-label">
                        {Math.round(value).toLocaleString()}
                      </text>
                    </g>
                  );
                })}
                <polyline
                  className="revenue-chart-line"
                  points={revenueByMonth.map((month, index) => {
                    const x = 62 + index * 108;
                    const y = 190 - (month.amount / maxMonthlyRevenue) * 150;
                    return `${x},${y}`;
                  }).join(" ")}
                />
                {revenueByMonth.map((month, index) => {
                  const x = 62 + index * 108;
                  const y = 190 - (month.amount / maxMonthlyRevenue) * 150;
                  return (
                    <g key={month.key}>
                      <circle cx={x} cy={y} r="5" className="revenue-chart-point">
                        <title>{`${month.label}: ${month.amount.toLocaleString()} LE`}</title>
                      </circle>
                      <text x={x} y="222" textAnchor="middle" className="chart-axis-label">
                        {month.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </article>

          <article className="chart-card">
            <h4>Orders by Status</h4>
            <p className="chart-description">Number of orders in each status</p>
            {loading ? (
              <p className="chart-empty">Loading chart data…</p>
            ) : sheetOrders.length === 0 ? (
              <p className="chart-empty">No orders to display.</p>
            ) : (
              <div className="status-chart-list">
                {orderStatuses.map((status) => (
                  <div className="status-chart-row" key={status.name}>
                    <span className="status-chart-label">{status.name}</span>
                    <div
                      className="status-chart-track"
                      role="img"
                      aria-label={`${status.name}: ${status.count} orders`}
                    >
                      <span
                        className={`status-chart-bar status-chart-${status.name}`}
                        style={{ width: `${maxOrderStatusCount ? status.count / maxOrderStatusCount * 100 : 0}%` }}
                      />
                    </div>
                    <span className="status-chart-count">{status.count}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="chart-card top-products-chart-card">
            <h4>Top-Selling Products</h4>
            <p className="chart-description">Units sold from delivered orders</p>
            {loading ? (
              <p className="chart-empty">Loading chart data…</p>
            ) : topProducts.length === 0 ? (
              <p className="chart-empty">No delivered product sales to display.</p>
            ) : (
              <div className="products-chart-list">
                {topProducts.map((product) => (
                  <div className="products-chart-row" key={product.name}>
                    <span className="products-chart-name" title={product.name}>{product.name}</span>
                    <div
                      className="products-chart-track"
                      role="img"
                      aria-label={`${product.name}: ${product.count} units sold`}
                    >
                      <span
                        className="products-chart-bar"
                        style={{ width: `${product.count / maxProductCount * 100}%` }}
                      />
                    </div>
                    <span className="products-chart-count">{product.count}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
};

export default BusinessOverview;
