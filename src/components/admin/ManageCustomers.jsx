import React from "react";
import { ADMIN_EMAIL } from "../../utils/constants";

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

const ManageCustomers = ({ users, allOrders }) => {
  const getCustomerOrders = (userId) => {
    return allOrders.filter(order => order.userId === userId);
  };

  const getCustomerSpent = (userId) => {
    const orders = getCustomerOrders(userId);
    return orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, order) => sum + (order.total || 0), 0);
  };

  const getOrderCount = (userId) => {
    return getCustomerOrders(userId).length;
  };

  const filteredCustomers = users.filter(user =>
    user.email !== ADMIN_EMAIL && user.name !== "TESTER"
  );

  return (
    <section className="admin-section">
      <div className="section-title-row centered">
        <div>
          <h2>Manage Customers</h2>
        </div>
      </div>

      <div className="admin-card">
        {filteredCustomers.length === 0 ? (
          <p className="loading-state">No customers yet.</p>
        ) : (
          <div className="customers-list">
            {filteredCustomers.map((user) => (
              <div key={user.uid} className="customer-card">
                <div className="customer-info">
                  <div>
                    <div className="customer-name-row">
                      <p className="customer-name">{user.name || "No name"}</p>
                      {user.createdAt && (
                        <span className="member-since">Member since {formatDate(user.createdAt)}</span>
                      )}
                      {user.lastSeen && (
                        <span className="last-seen">Last seen: {formatDate(user.lastSeen)}</span>
                      )}
                    </div>
                    <div className="customer-contact">
                      <a href={`mailto:${user.email}`} className="contact-link email-link" title="Send email">
                        {user.email}
                      </a>
                      {user.phone && (
                        <>
                          <span className="contact-separator">|</span>
                          <a href={`tel:${user.phone}`} className="contact-link phone-link" title="Call customer">
                            {user.phone}
                          </a>
                        </>
                      )}
                      {user.address && (
                        <>
                          <span className="contact-separator">|</span>
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
                      <span className="stat-value">{getOrderCount(user.uid)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total Spent</span>
                      <span className="stat-value">{getCustomerSpent(user.uid)} LE</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ManageCustomers;
