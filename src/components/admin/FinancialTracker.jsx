import React, { useState, useEffect, useCallback } from "react";
import { fetchOrdersFromSheet, fetchRevenueFromSheet, fetchExpensesFromSheet, parseDateKey, formatSheetTimestamp } from "../../services/googleSheets";

const formatDate = (dateKey) => {
  const date = parseDateKey(dateKey);
  if (!date) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const FinancialTracker = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRows, revenueRows, expenseRows] = await Promise.all([
        fetchOrdersFromSheet(),
        fetchRevenueFromSheet(),
        fetchExpensesFromSheet(),
      ]);
      setDeliveredOrders(orderRows.filter((order) => order.status === "delivered"));
      setSales(revenueRows.map((row, index) => ({ id: index, ...row })));
      setExpenses(expenseRows.map((row, index) => ({ id: index, ...row })));
    } catch (err) {
      console.error("Failed to load financial data from Google Sheets:", err);
      setError("Failed to load data from Google Sheets. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDashboardMetrics = () => {
    const totalSales = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalSales - totalExpenses;
    const margin = totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : 0;
    const orders = deliveredOrders.length;
    const avgOrder = orders > 0 ? (totalSales / orders).toFixed(0) : 0;

    return { totalSales, totalExpenses, profit, margin, orders, avgOrder };
  };

  const getMonthlySummary = () => {
    const months = {};

    const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = (date) => date.toLocaleDateString("en-EG", { year: "numeric", month: "long" });

    deliveredOrders.forEach((order) => {
      if (!order.createdAt) return;
      const date = new Date(order.createdAt);
      const key = monthKey(date);
      if (!months[key]) months[key] = { label: monthLabel(date), sales: 0, expenses: 0, orders: 0 };
      months[key].sales += order.total || 0;
      months[key].orders += 1;
    });

    expenses.forEach((exp) => {
      const date = parseDateKey(exp.date);
      if (!date) return;
      const key = monthKey(date);
      if (!months[key]) months[key] = { label: monthLabel(date), sales: 0, expenses: 0, orders: 0 };
      months[key].expenses += exp.amount;
    });

    return Object.keys(months)
      .sort()
      .map((key) => ({
        month: months[key].label,
        sales: months[key].sales,
        expenses: months[key].expenses,
        orders: months[key].orders,
      }));
  };

  const getExpensesByCategory = () => {
    const categories = {};

    expenses.forEach((exp) => {
      const category = exp.category || "Uncategorized";
      if (!categories[category]) categories[category] = { amount: 0, count: 0 };
      categories[category].amount += exp.amount || 0;
      categories[category].count += 1;
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return Object.entries(categories)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percent: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const exportToCSV = () => {
    let csv = "GIFTO - FINANCIAL REPORT\n\n";

    csv += "SALES\n";
    csv += "Date,Amount (LE),Customer,Items\n";
    sales.forEach((s) => {
      csv += `"${new Date(s.date).toLocaleDateString()}","${s.amount}","${s.customer}","${s.items}"\n`;
    });

    csv += "\n\nEXPENSES\n";
    csv += "Date,Category,Amount (LE),Description\n";
    expenses.forEach((e) => {
      csv += `"${new Date(e.date).toLocaleDateString()}","${e.category}","${e.amount}","${e.desc}"\n`;
    });

    csv += "\n\nEXPENSES BY CATEGORY\n";
    csv += "Category,Amount (LE),% of Total,Entries\n";
    expensesByCategory.forEach((row) => {
      csv += `"${row.category}","${row.amount}","${row.percent.toFixed(1)}%","${row.count}"\n`;
    });

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csv),
    );
    element.setAttribute("download", "GIFTO_Financial_Report.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const metrics = getDashboardMetrics();
  const monthlySummary = getMonthlySummary();
  const expensesByCategory = getExpensesByCategory();

  const buttonStyle = {
    padding: "10px 20px",
    background: "var(--accent)",
    color: "white",
    border: "2px solid var(--accent)",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease",
    transform: "translateY(0)",
  };

  const tableHeaderStyle = {
    background: "var(--surface-soft)",
    color: "var(--text)",
    padding: "12px",
    textAlign: "center",
    fontWeight: "bold",
    borderBottom: "2px solid var(--border)",
  };

  const tableCellStyle = {
    padding: "12px",
    borderBottom: "1px solid var(--border)",
    textAlign: "center",
  };

  return (
    <section className="admin-section">
      <div className="section-title-row centered">
        <div>
          <h2>Financials</h2>
        </div>
      </div>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {["dashboard", "sales", "expenses", "categories", "monthly"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            onMouseEnter={(e) => {
              e.target.style.background =
                activeTab === tab
                  ? "var(--accent-strong)"
                  : "rgba(139, 69, 19, 0.1)";
              e.target.style.borderColor = "var(--accent)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(139, 69, 19, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background =
                activeTab === tab ? "var(--accent)" : "var(--surface)";
              e.target.style.borderColor = "var(--accent)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
            style={{
              padding: "10px 20px",
              background:
                activeTab === tab ? "var(--accent)" : "var(--surface)",
              color: activeTab === tab ? "white" : "var(--text)",
              border: "2px solid var(--accent)",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s ease",
            }}
          >
            {tab === "dashboard" && "Dashboard"}
            {tab === "sales" && "Sales"}
            {tab === "expenses" && "Expenses"}
            {tab === "categories" && "By Category"}
            {tab === "monthly" && "Monthly"}
          </button>
        ))}

        <button
          onClick={loadData}
          disabled={loading}
          style={{
            padding: "10px 20px",
            background: "var(--surface)",
            color: "var(--text)",
            border: "2px solid var(--border)",
            borderRadius: "10px",
            cursor: loading ? "default" : "pointer",
            fontWeight: "bold",
            marginLeft: "auto",
          }}
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

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div
          style={{
            background: "var(--surface)",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "var(--shadow)",
          }}
        >
          <h3 style={{ marginBottom: "20px", color: "var(--text)", textAlign: "center" }}>
            Financial Dashboard
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            {[
              { label: "Delivered Orders", value: metrics.orders },
              {
                label: "Total Sales",
                value: `${metrics.totalSales.toLocaleString()} LE`,
              },
              {
                label: "Total Expenses",
                value: `${metrics.totalExpenses.toLocaleString()} LE`,
              },
              {
                label: "Total Profit",
                value: `${metrics.profit.toLocaleString()} LE`,
                isProfit: true,
              },
              { label: "Profit Margin", value: `${metrics.margin}%` },
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  background:
                    "linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(139, 69, 19, 0.05) 100%)",
                  color: "white",
                  padding: "20px",
                  borderRadius: "10px",
                  textAlign: "center",
                  borderLeft: "4px solid var(--accent-strong)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <div
                  style={{
                    fontSize: "0.9em",
                    opacity: 0.9,
                    marginBottom: "10px",
                    color: "var(--muted)",
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: "2em",
                    fontWeight: "bold",
                    color: card.isProfit
                      ? metrics.profit >= 0
                        ? "var(--success)"
                        : "var(--danger)"
                      : "var(--accent)",
                  }}
                >
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={exportToCSV}
            onMouseEnter={(e) => {
              e.target.style.background = "var(--accent-strong)";
              e.target.style.borderColor = "var(--accent-strong)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(139, 69, 19, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "var(--accent)";
              e.target.style.borderColor = "var(--accent)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
            style={buttonStyle}
          >
            Export All Data
          </button>
        </div>
      )}

      {/* SALES TAB */}
      {activeTab === "sales" && (
        <div
          style={{
            background: "var(--surface)",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "var(--shadow)",
          }}
        >
          <h3 style={{ color: "var(--text)", margin: "0 0 20px", textAlign: "center" }}>
            Sales
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--accent)", color: "white" }}>
                  <th style={tableHeaderStyle}>Date</th>
                  <th style={tableHeaderStyle}>Amount (LE)</th>
                  <th style={tableHeaderStyle}>Customer</th>
                  <th style={tableHeaderStyle}>Items</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={tableCellStyle}>
                    {formatSheetTimestamp(sale.timestamp)}
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{ color: "var(--accent)", fontWeight: "bold" }}>{sale.amount.toLocaleString()}</span>
                    </td>
                    <td style={tableCellStyle}>{sale.customer || "-"}</td>
                    <td style={{ ...tableCellStyle, fontSize: "0.9em" }}>
                      {sale.items || "-"}
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === "expenses" && (
        <div
          style={{
            background: "var(--surface)",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "var(--shadow)",
          }}
        >
          <h3 style={{ color: "var(--text)", margin: "0 0 20px", textAlign: "center" }}>
            Expenses
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--accent)", color: "white" }}>
                  <th style={tableHeaderStyle}>Date</th>
                  <th style={tableHeaderStyle}>Category</th>
                  <th style={tableHeaderStyle}>Amount (LE)</th>
                  <th style={tableHeaderStyle}>Description</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td style={tableCellStyle}>
                    {formatDate(exp.date)}
                      </td>
                      <td style={tableCellStyle}>{exp.category}</td>
                      <td style={tableCellStyle}>
                        <strong>{exp.amount.toLocaleString()}</strong>
                      </td>
                      <td style={tableCellStyle}>{exp.desc}</td>
                    </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXPENSES BY CATEGORY TAB */}
      {activeTab === "categories" && (
        <div
          style={{
            background: "var(--surface)",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "var(--shadow)",
          }}
        >
          <h3 style={{ color: "var(--text)", margin: "0 0 20px", textAlign: "center" }}>
            Expenses by Category
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--accent)", color: "white" }}>
                  <th style={tableHeaderStyle}>Category</th>
                  <th style={tableHeaderStyle}>Amount (LE)</th>
                  <th style={tableHeaderStyle}>% of Total</th>
                  <th style={tableHeaderStyle}>Entries</th>
                </tr>
              </thead>
              <tbody>
                {expensesByCategory.length === 0 ? (
                  <tr>
                    <td style={tableCellStyle} colSpan={4}>No expenses recorded.</td>
                  </tr>
                ) : (
                  expensesByCategory.map((row) => (
                    <tr key={row.category}>
                      <td style={tableCellStyle}>
                        <strong>{row.category}</strong>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ color: "var(--accent)", fontWeight: "bold" }}>{row.amount.toLocaleString()}</span>
                      </td>
                      <td style={tableCellStyle}>{row.percent.toFixed(1)}%</td>
                      <td style={tableCellStyle}>{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {expensesByCategory.length > 0 && (
                <tfoot>
                  <tr style={{ background: "var(--surface-soft)", fontWeight: "bold" }}>
                    <td style={tableCellStyle}>Total</td>
                    <td style={tableCellStyle}>{metrics.totalExpenses.toLocaleString()}</td>
                    <td style={tableCellStyle}>100%</td>
                    <td style={tableCellStyle}>{expenses.length}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* MONTHLY TAB */}
      {activeTab === "monthly" && (
        <div
          style={{
            background: "var(--surface)",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "var(--shadow)",
          }}
        >
          <h3 style={{ marginBottom: "20px", color: "var(--text)", textAlign: "center" }}>
            Monthly Summary
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--accent)", color: "white" }}>
                  <th style={tableHeaderStyle}>Month</th>
                  <th style={tableHeaderStyle}>Orders</th>
                  <th style={tableHeaderStyle}>Sales (LE)</th>
                  <th style={tableHeaderStyle}>Expenses (LE)</th>
                  <th style={tableHeaderStyle}>Profit (LE)</th>
                  <th style={tableHeaderStyle}>Margin (%)</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map((m) => {
                  const profit = m.sales - m.expenses;
                  const margin =
                    m.sales > 0 ? ((profit / m.sales) * 100).toFixed(1) : 0;
                  return (
                    <tr key={m.month}>
                      <td style={tableCellStyle}>
                        <strong>{m.month}</strong>
                      </td>
                      <td style={tableCellStyle}>{m.orders}</td>
                      <td style={tableCellStyle}>
                        {m.sales.toLocaleString()}
                      </td>
                      <td style={tableCellStyle}>
                        {m.expenses.toLocaleString()}
                      </td>
                      <td
                        style={{
                          ...tableCellStyle,
                          color:
                            profit >= 0 ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        <strong>{profit.toLocaleString()}</strong>
                      </td>
                      <td style={tableCellStyle}>{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default FinancialTracker;
