import React from "react";
import { Edit2 } from "lucide-react";

const OrderCard = ({ order, showDeliveryEdit = false, onDeliveryEdit = null, onStatusChange = null, showStatusActions = false, statuses = [] }) => (
  <article className="order-manager-card">
    <div className="order-manager-top">
      <div>
        <p className="order-label">
          #{order.id} - {order.total} LE
        </p>
        <p className="order-meta">
          {order.name} | {order.phone} | {order.address}
        </p>
        {order.deliveryTime && showDeliveryEdit && (
          <div className="order-meta-with-edit">
            <p className="order-meta">
              Delivery on {new Date(order.deliveryTime).toLocaleString()}
            </p>
            <button
              type="button"
              className="edit-delivery-btn"
              title="Edit delivery time"
              onClick={() => onDeliveryEdit && onDeliveryEdit(order.dbKey, order.deliveryTime)}
            >
              <Edit2 size={16} />
            </button>
          </div>
        )}
        {order.deliveryTime && !showDeliveryEdit && (
          <p className="order-meta">
            Delivery on {new Date(order.deliveryTime).toLocaleString()}
          </p>
        )}
      </div>
      <span className={`order-status status-${order.status || "pending"}`}>
        {order.status || "pending"}
      </span>
    </div>
    {order.giftWrap && (
      <p className="order-summary-text">Gift wrap: Yes</p>
    )}
    {order.cardMessage && (
      <p className="order-summary-text">
        Message card: {order.cardMessage}
      </p>
    )}
    <p className="order-summary-text">
      {order.items.length > 0
        ? order.items.map((item) => item.name).join(", ")
        : "No items"}
    </p>
    {showStatusActions && statuses.length > 0 && (
      <div className="status-actions">
        {statuses.map((status) => (
          <button
            type="button"
            key={`${order.dbKey}-${status}`}
            className={`status-button ${order.status === status ? "active" : ""}`}
            onClick={() => onStatusChange && onStatusChange(order.dbKey, status)}
          >
            {status}
          </button>
        ))}
      </div>
    )}
  </article>
);

const ManageOrders = ({
  allOrders,
  updateOrderStatus,
  setEditingDeliveryTime,
  setDeliveryTimeInput,
}) => {
  const handleDeliveryEdit = (dbKey, deliveryTime) => {
    setEditingDeliveryTime(dbKey);
    setDeliveryTimeInput(
      new Date(deliveryTime).toISOString().slice(0, 16)
    );
  };

  return (
    <section className="admin-section">
      <div className="section-title-row centered">
        <div>
          <h2>Manage Orders</h2>
        </div>
      </div>

      <div className="admin-inventory-grid">
        {/* Pending Orders */}
        <div className="admin-card">
          <h3>Pending Orders</h3>
          {allOrders.filter(o => o.status === "pending" || !o.status).length === 0 ? (
            <p className="loading-state">No pending orders.</p>
          ) : (
            allOrders
              .filter(o => o.status === "pending" || !o.status)
              .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
              .map((order) => (
                <OrderCard
                  key={order.dbKey}
                  order={order}
                  showDeliveryEdit={true}
                  onDeliveryEdit={handleDeliveryEdit}
                  showStatusActions={true}
                  statuses={["pending", "processing", "shipped", "delivered"]}
                  onStatusChange={updateOrderStatus}
                />
              ))
          )}
        </div>

        {/* Processing Orders */}
        <div className="admin-card">
          <h3>Processing Orders</h3>
          {allOrders.filter(o => o.status === "processing").length === 0 ? (
            <p className="loading-state">No processing orders.</p>
          ) : (
            allOrders
              .filter(o => o.status === "processing")
              .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
              .map((order) => (
                <OrderCard
                  key={order.dbKey}
                  order={order}
                  showDeliveryEdit={true}
                  onDeliveryEdit={handleDeliveryEdit}
                  showStatusActions={true}
                  statuses={["pending", "processing", "shipped", "delivered"]}
                  onStatusChange={updateOrderStatus}
                />
              ))
          )}
        </div>
      </div>

      {/* Shipped, Delivered & Cancelled Orders */}
      <div className="admin-card">
        <h3>Shipped, Delivered & Cancelled Orders</h3>
        {allOrders.filter(o => o.status === "shipped" || o.status === "delivered" || o.status === "cancelled").length === 0 ? (
          <p className="loading-state">No completed orders yet.</p>
        ) : (
          (() => {
            const statusOrder = {
              shipped: 1,
              delivered: 2,
              cancelled: 3,
            };
            return allOrders
              .filter(o => o.status === "shipped" || o.status === "delivered" || o.status === "cancelled")
              .sort((a, b) => {
                const statusDiff = (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
                if (statusDiff !== 0) return statusDiff;
                return (b.createdAt || 0) - (a.createdAt || 0);
              })
              .map((order) => (
                <OrderCard
                  key={order.dbKey}
                  order={order}
                  showDeliveryEdit={false}
                  showStatusActions={order.status === "shipped"}
                  statuses={order.status === "shipped" ? ["Mark as Delivered"] : []}
                  onStatusChange={updateOrderStatus}
                />
              ));
          })()
        )}
      </div>
    </section>
  );
};

export default ManageOrders;
