import { useEffect, useState } from "react";
import { ADMIN_EMAIL } from "../../utils/constants";
import { fetchOrdersFromSheet } from "../../services/googleSheets";

const formatDate = (timestamp) => {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
};

const normalizeCustomerName = (name) => String(name || "").trim().toLowerCase();

const ManageCustomers = ({ users }) => {
  const [sheetOrders, setSheetOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadOrders = async () => {
      try {
        const orders = await fetchOrdersFromSheet();
        if (isActive) setSheetOrders(orders);
      } catch (error) {
        console.error("Failed to load customer orders from Google Sheets:", error);
        if (isActive) setOrdersError("Failed to load customer orders from Google Sheets.");
      } finally {
        if (isActive) setLoadingOrders(false);
      }
    };

    loadOrders();
    return () => {
      isActive = false;
    };
  }, []);

  const registeredNames = new Set(
    users.map((user) => normalizeCustomerName(user.name)).filter(Boolean)
  );
  const sheetCustomers = new Map();

  sheetOrders.forEach((order) => {
    const normalizedName = normalizeCustomerName(order.name);
    if (!normalizedName) return;

    let customer = sheetCustomers.get(normalizedName);
    if (!customer) {
      customer = {
        name: order.name.trim(),
        email: order.email || "",
        phone: order.phone || "",
        address: order.address || "",
        lastOrderAt: order.createdAt || null,
        orderCount: 0,
        totalSpent: 0,
      };
      sheetCustomers.set(normalizedName, customer);
    }

    if (order.createdAt && (!customer.lastOrderAt || order.createdAt > customer.lastOrderAt)) {
      customer.lastOrderAt = order.createdAt;
    }
    customer.orderCount += 1;
    if (order.status === "delivered") {
      customer.totalSpent += Number(order.total) || 0;
    }
    if (!customer.email && order.email) customer.email = order.email;
    if (!customer.phone && order.phone) customer.phone = order.phone;
    if (!customer.address && order.address) customer.address = order.address;
  });

  const registeredCustomers = users
    .filter((user) => user.email !== ADMIN_EMAIL && user.name !== "TESTER")
    .map((user) => {
      const stats = sheetCustomers.get(normalizeCustomerName(user.name));
      return {
        user,
        orderCount: stats?.orderCount || 0,
        totalSpent: stats?.totalSpent || 0,
        isRegistered: true,
      };
    });
  const unregisteredCustomers = Array.from(sheetCustomers.entries())
    .filter(([normalizedName]) => !registeredNames.has(normalizedName))
    .map(([normalizedName, customer]) => ({
      user: { ...customer, uid: `sheet-${normalizedName}` },
      orderCount: customer.orderCount,
      totalSpent: customer.totalSpent,
      isRegistered: false,
    }));

  const sortedCustomers = [...registeredCustomers, ...unregisteredCustomers]
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <section className="admin-section">
      <div className="section-title-row centered">
        <div>
          <h2>Manage Customers</h2>
        </div>
      </div>

      <div className="admin-card">
        {ordersError && <p role="alert">{ordersError}</p>}
        {sortedCustomers.length === 0 ? (
          <p className="loading-state">No customers yet.</p>
        ) : (
          <div className="customers-list">
            {sortedCustomers.map(({ user, orderCount, totalSpent, isRegistered }) => {
              return (
                <div key={user.uid} className="customer-card">
                  <div className="customer-info">
                    <div>
                      <div className="customer-name-row">
                        <p className="customer-name">{user.name || "No name"}</p>
                        {!isRegistered && (
                          <>
                            <span className="last-seen">Not registered</span>
                            <span className="last-seen">Last order: {formatDate(user.lastOrderAt)}</span>
                          </>
                        )}
                        {user.createdAt && (
                          <span className="member-since">Member since {formatDate(user.createdAt)}</span>
                        )}
                        {user.lastSeen && (
                          <span className="last-seen">Last seen: {formatDate(user.lastSeen)}</span>
                        )}
                      </div>
                      <div className="customer-contact">
                        {user.email && (
                          <a href={`mailto:${user.email}`} className="contact-link email-link" title="Send email">
                            {user.email}
                          </a>
                        )}
                        {user.phone && (
                          <>
                            {user.email && <span className="contact-separator">|</span>}
                            <a href={`tel:${user.phone}`} className="contact-link phone-link" title="Call customer">
                              {user.phone}
                            </a>
                          </>
                        )}
                        {user.address && (
                          <>
                            {(user.email || user.phone) && <span className="contact-separator">|</span>}
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(user.address)}`} target="_blank" rel="noopener noreferrer" className="contact-link" title="Customer location">
                              {user.address}
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="customer-stats">
                      <div className="stat-item">
                        <span className="stat-label">Orders</span>
                        <span className="stat-value">{loadingOrders || ordersError ? "—" : orderCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Spent</span>
                        <span className="stat-value">{loadingOrders || ordersError ? "—" : `${totalSpent} LE`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ManageCustomers;
