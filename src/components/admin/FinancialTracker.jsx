import React, { useState, useEffect } from "react";

const FinancialTracker = ({ allOrders = [] }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [data, setData] = useState({
    sales: [],
    expenses: [],
    inventory: [],
  });
  const [showTables, setShowTables] = useState({
    sales: false,
    expenses: false,
    inventory: false,
    monthly: false,
  });

  const toggleTable = (tableName) => {
    setShowTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Populate sales data from Firebase orders (only delivered orders)
    if (allOrders && allOrders.length > 0) {
      const deliveredOrders = allOrders.filter(order => order.status === 'delivered');
      const salesFromOrders = deliveredOrders.map(order => ({
        id: order.id || order.dbKey,
        date: order.deliveryTime ? new Date(order.deliveryTime).toISOString().split('T')[0] : new Date(order.createdAt).toISOString().split('T')[0],
        amount: order.total || 0,
        payment: order.paymentMethod || 'COD',
        customer: order.customerName || order.userName || 'Customer',
        items: order.items ? order.items.map(item => `${item.name} (${item.quantity}x)`).join(', ') : ''
      }));

      // Only update if we have new sales data
      setData(prevData => {
        const existingIds = prevData.sales.map(s => s.id);
        const newSales = salesFromOrders.filter(s => !existingIds.includes(s.id));

        if (newSales.length > 0) {
          return {
            ...prevData,
            sales: [...salesFromOrders]
          };
        }
        return prevData;
      });
    }
  }, [allOrders]);

  const loadData = () => {
    const saved = localStorage.getItem("GIFTOData");
    if (saved) {
      setData(JSON.parse(saved));
    }
  };

  const saveData = (newData) => {
    localStorage.setItem("GIFTOData", JSON.stringify(newData));
    setData(newData);
  };


  const addExpense = (e) => {
    e.preventDefault();
    const form = e.target;
    const date = form.expenseDate.value;
    const amount = parseFloat(form.expenseAmount.value);
    const category = form.expenseCategory.value;
    const desc = form.expenseDesc.value;

    if (!date || !amount || amount <= 0) {
      alert("Please fill in date and amount");
      return;
    }

    const newData = {
      ...data,
      expenses: [
        ...data.expenses,
        { id: Date.now(), date, amount, category, desc },
      ],
    };
    saveData(newData);
    form.reset();
    const today = new Date().toISOString().split("T")[0];
    form.expenseDate.value = today;
  };

  const addInventory = (e) => {
    e.preventDefault();
    const form = e.target;
    const date = form.invDate.value;
    const name = form.invName.value;
    const vendor = form.invVendor.value;
    const category = form.invCategory.value;
    const qty = parseInt(form.invQty.value);
    const cost = parseFloat(form.invCost.value);
    const sell = parseFloat(form.invSell.value) || cost * 2;
    const notes = form.invNotes.value;

    if (!date || !name || !qty || !cost || qty <= 0 || cost <= 0) {
      alert("Please fill in all required fields");
      return;
    }

    const newData = {
      ...data,
      inventory: [
        ...data.inventory,
        {
          id: Date.now(),
          date,
          name,
          vendor,
          category,
          qty,
          cost,
          sell,
          notes,
        },
      ],
    };
    saveData(newData);
    form.reset();
    const today = new Date().toISOString().split("T")[0];
    form.invDate.value = today;
  };

  const deleteSale = (id) => {
    const newData = { ...data, sales: data.sales.filter((s) => s.id !== id) };
    saveData(newData);
  };

  const deleteExpense = (id) => {
    const newData = {
      ...data,
      expenses: data.expenses.filter((e) => e.id !== id),
    };
    saveData(newData);
  };

  const deleteInventory = (id) => {
    const newData = {
      ...data,
      inventory: data.inventory.filter((i) => i.id !== id),
    };
    saveData(newData);
  };

  const getDashboardMetrics = () => {
    const totalSales = data.sales.reduce((sum, s) => sum + s.amount, 0);
    const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalSales - totalExpenses;
    const margin =
      totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : 0;
    const orders = data.sales.length;
    const avgOrder = orders > 0 ? (totalSales / orders).toFixed(0) : 0;

    return { totalSales, totalExpenses, profit, margin, orders, avgOrder };
  };

  const getMonthlySummary = () => {
    const months = {};

    data.sales.forEach((sale) => {
      const month = new Date(sale.date).toLocaleDateString("en-EG", {
        year: "numeric",
        month: "long",
      });
      if (!months[month]) months[month] = { sales: 0, expenses: 0, orders: 0 };
      months[month].sales += sale.amount;
      months[month].orders += 1;
    });

    data.expenses.forEach((exp) => {
      const month = new Date(exp.date).toLocaleDateString("en-EG", {
        year: "numeric",
        month: "long",
      });
      if (!months[month]) months[month] = { sales: 0, expenses: 0, orders: 0 };
      months[month].expenses += exp.amount;
    });

    return Object.keys(months)
      .sort()
      .map((month) => ({
        month,
        ...months[month],
      }));
  };

  const exportToCSV = () => {
    let csv = "GIFTO - FINANCIAL REPORT\n\n";

    csv += "SALES\n";
    csv += "Date,Amount (LE),Payment Method,Customer,Items\n";
    data.sales.forEach((s) => {
      csv += `"${new Date(s.date).toLocaleDateString()}","${s.amount}","${s.payment}","${s.customer}","${s.items}"\n`;
    });

    csv += "\n\nEXPENSES\n";
    csv += "Date,Category,Amount (LE),Description\n";
    data.expenses.forEach((e) => {
      csv += `"${new Date(e.date).toLocaleDateString()}","${e.category}","${e.amount}","${e.desc}"\n`;
    });

    csv += "\n\nINVENTORY\n";
    csv +=
      "Product,Vendor,Quantity,Cost/Unit,Total Cost,Sell Price,Profit/Unit\n";
    data.inventory.forEach((i) => {
      csv += `"${i.name}","${i.vendor}","${i.qty}","${i.cost}","${i.qty * i.cost}","${i.sell}","${i.sell - i.cost}"\n`;
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
  const today = new Date().toISOString().split("T")[0];

  const inputStyle = {
    width: "100%",
    padding: "10px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    backgroundColor: "var(--surface)",
    transition: "all 0.3s ease",
    fontSize: "0.95rem"
  };

  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b4513' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    backgroundSize: "20px",
    paddingRight: "35px",
    cursor: "pointer"
  };

  const labelStyle = {
    display: "block",
    marginBottom: "5px",
    color: "var(--muted)",
    fontWeight: "600",
  };

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

  const buttonHoverStyle = {
    ...buttonStyle,
    background: "var(--accent-strong)",
    borderColor: "var(--accent-strong)",
    transform: "translateY(-2px)",
    boxShadow: "0 4px 12px rgba(139, 69, 19, 0.2)",
  };

  const deleteButtonStyle = {
    padding: "6px 12px",
    background: "var(--accent)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85em",
    transition: "all 0.3s ease",
    fontWeight: "500"
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
    textAlign: "center"
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
        }}
      >
        {["dashboard", "sales", "expenses", "inventory", "monthly"].map(
          (tab) => (
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
              {tab === "inventory" && "Inventory"}
              {tab === "monthly" && "Monthly"}
            </button>
          ),
        )}
      </div>

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
              { label: "Total Orders", value: metrics.orders },
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ color: "var(--text)", margin: 0, textAlign: "center", flex: 1 }}>
              Sales
            </h3>
            <button
              onClick={() => toggleTable('sales')}
              style={{
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                fontSize: "0.9rem"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "var(--accent-strong)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "var(--accent)";
                e.target.style.transform = "translateY(0)";
              }}
            >
              {showTables.sales ? "Hide" : "Show"} Table
            </button>
          </div>

          {showTables.sales && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--accent)", color: "white" }}>
                    <th style={tableHeaderStyle}>Date</th>
                    <th style={tableHeaderStyle}>Amount (LE)</th>
                    <th style={tableHeaderStyle}>Payment</th>
                    <th style={tableHeaderStyle}>Customer</th>
                    <th style={tableHeaderStyle}>Items</th>
                    <th style={tableHeaderStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={tableCellStyle}>
                      {new Date(sale.date).toLocaleDateString()}
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{ color: "var(--accent)", fontWeight: "bold" }}>{sale.amount.toLocaleString()}</span>
                    </td>
                    <td style={tableCellStyle}>{sale.payment}</td>
                    <td style={tableCellStyle}>{sale.customer || "-"}</td>
                    <td style={{ ...tableCellStyle, fontSize: "0.9em" }}>
                      {sale.items || "-"}
                    </td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => deleteSale(sale.id)}
                        onMouseEnter={(e) => {
                          e.target.style.background = "var(--accent-strong)";
                          e.target.style.transform = "translateY(-2px)";
                          e.target.style.boxShadow = "0 4px 12px rgba(139, 69, 19, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "var(--accent)";
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "none";
                        }}
                        style={deleteButtonStyle}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ color: "var(--text)", margin: 0, textAlign: "center", flex: 1 }}>
              Record Expenses
            </h3>
            <button
              onClick={() => toggleTable('expenses')}
              style={{
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                fontSize: "0.9rem"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "var(--accent-strong)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "var(--accent)";
                e.target.style.transform = "translateY(0)";
              }}
            >
              {showTables.expenses ? "Hide" : "Show"} Table
            </button>
          </div>

          <form onSubmit={addExpense} style={{ marginBottom: "30px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "15px",
              }}
            >
              <div>
                <label style={labelStyle}>Expense Date</label>
                <input
                  type="date"
                  name="expenseDate"
                  defaultValue={today}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Expense Amount (LE)</label>
                <input
                  type="number"
                  name="expenseAmount"
                  placeholder="e.g., 5000"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "15px",
              }}
            >
              <div>
                <label style={labelStyle}>Category</label>
                <select name="expenseCategory" style={selectStyle}>
                  <option value="Inventory">Inventory (Products)</option>
                  <option value="Shipping">Shipping/Delivery</option>
                  <option value="Packaging">Packaging & Wrapping</option>
                  <option value="Marketing">Marketing & Ads</option>
                  <option value="Subscriptions">Subscriptions</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  name="expenseDesc"
                  placeholder="e.g., Wallets from Attaba vendor"
                  style={inputStyle}
                />
              </div>
            </div>

            <button
              type="submit"
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
              Add Expense
            </button>
          </form>

          {showTables.expenses && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--accent)", color: "white" }}>
                    <th style={tableHeaderStyle}>Date</th>
                    <th style={tableHeaderStyle}>Category</th>
                    <th style={tableHeaderStyle}>Amount (LE)</th>
                    <th style={tableHeaderStyle}>Description</th>
                    <th style={tableHeaderStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td style={tableCellStyle}>
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td style={tableCellStyle}>{exp.category}</td>
                    <td style={tableCellStyle}>
                      <strong>{exp.amount.toLocaleString()}</strong>
                    </td>
                    <td style={tableCellStyle}>{exp.desc}</td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        onMouseEnter={(e) => {
                          e.target.style.background = "var(--accent-strong)";
                          e.target.style.transform = "translateY(-2px)";
                          e.target.style.boxShadow = "0 4px 12px rgba(139, 69, 19, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "var(--accent)";
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "none";
                        }}
                        style={deleteButtonStyle}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === "inventory" && (
        <div
          style={{
            background: "var(--surface)",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ color: "var(--text)", margin: 0, textAlign: "center", flex: 1 }}>
              Inventory Tracking
            </h3>
            <button
              onClick={() => toggleTable('inventory')}
              style={{
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                fontSize: "0.9rem"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "var(--accent-strong)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "var(--accent)";
                e.target.style.transform = "translateY(0)";
              }}
            >
              {showTables.inventory ? "Hide" : "Show"} Table
            </button>
          </div>

          <form onSubmit={addInventory} style={{ marginBottom: "30px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "15px",
              }}
            >
              <div>
                <label style={labelStyle}>Purchase Date</label>
                <input
                  type="date"
                  name="invDate"
                  defaultValue={today}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Product Name</label>
                <input
                  type="text"
                  name="invName"
                  placeholder="e.g., Premium Leather Wallet"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "15px",
              }}
            >
              <div>
                <label style={labelStyle}>Vendor Name</label>
                <input
                  type="text"
                  name="invVendor"
                  placeholder="e.g., Ahmed at Attaba"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select name="invCategory" style={selectStyle}>
                  <option value="Wallets">Wallets</option>
                  <option value="Watches">Watches</option>
                  <option value="Medals">Medals</option>
                  <option value="Flowers">Flowers</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Notebooks">Notebooks</option>
                  <option value="Mugs">Mugs</option>
                  <option value="Tech Accessories">Tech Accessories</option>
                  <option value="Sets">Sets</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "15px",
              }}
            >
              <div>
                <label style={labelStyle}>Quantity</label>
                <input
                  type="number"
                  name="invQty"
                  placeholder="e.g., 5"
                  min="1"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Cost Per Unit (LE)</label>
                <input
                  type="number"
                  name="invCost"
                  placeholder="e.g., 100"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "15px",
              }}
            >
              <div>
                <label style={labelStyle}>Estimated Selling Price (LE)</label>
                <input
                  type="number"
                  name="invSell"
                  placeholder="e.g., 250"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  name="invNotes"
                  placeholder="Any observations, defects, or special features"
                  style={{ ...inputStyle, resize: "vertical", minHeight: "63px" }}
                />
              </div>
            </div>

            <button
              type="submit"
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
              Add Item
            </button>
          </form>

          {showTables.inventory && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--accent)", color: "white" }}>
                    <th style={tableHeaderStyle}>Product</th>
                    <th style={tableHeaderStyle}>Vendor</th>
                    <th style={tableHeaderStyle}>Qty</th>
                    <th style={tableHeaderStyle}>Cost/Unit</th>
                    <th style={tableHeaderStyle}>Total Cost</th>
                    <th style={tableHeaderStyle}>Est. Sell/Unit</th>
                    <th style={tableHeaderStyle}>Profit/Unit</th>
                    <th style={tableHeaderStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.map((inv) => {
                  const totalCost = inv.qty * inv.cost;
                  const profitPerUnit = inv.sell - inv.cost;
                  return (
                    <tr key={inv.id}>
                      <td style={tableCellStyle}>
                        <strong>{inv.name}</strong>
                      </td>
                      <td style={tableCellStyle}>{inv.vendor}</td>
                      <td style={tableCellStyle}>{inv.qty}</td>
                      <td style={tableCellStyle}>{inv.cost}</td>
                      <td style={tableCellStyle}>
                        <strong>{totalCost.toLocaleString()}</strong>
                      </td>
                      <td style={tableCellStyle}>{inv.sell}</td>
                      <td
                        style={{ ...tableCellStyle, color: "var(--success)" }}
                      >
                        <strong>{profitPerUnit.toLocaleString()}</strong>
                      </td>
                      <td style={tableCellStyle}>
                        <button
                          onClick={() => deleteInventory(inv.id)}
                          onMouseEnter={(e) => {
                            e.target.style.background = "var(--accent-strong)";
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 4px 12px rgba(139, 69, 19, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "var(--accent)";
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                          }}
                          style={deleteButtonStyle}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
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
