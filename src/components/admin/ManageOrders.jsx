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
        <p className="order-summary-text">
          {order.items.length > 0
            ? order.items.map((item) => `${item.selectedColor || 'default'} ${item.name} (x${item.quantity})`).join(", ")
            : "No items"}
        </p>
        {order.deliveryTime && !showDeliveryEdit && (
          <p className="order-meta">
            {order.status === "delivered" ? "Delivered" : "Delivery"} on {new Date(order.deliveryTime).toLocaleString()}
          </p>
        )}
        {order.giftBag && (
          <p className="order-summary-text">Gift bag: Yes</p>
        )}
        {order.cardMessage && (
          <p className="order-summary-text">
            Message card: {order.cardMessage}
          </p>
        )}
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
      </div>
      <span className={`order-status status-${order.status || "pending"}`}>
        {order.status || "pending"}
      </span>
    </div>
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

      <div className="admin-inventory-grid">
        <div className="admin-card">
          <h3>Shipped Orders</h3>
          {allOrders.filter(o => o.status === "shipped").length === 0 ? (
            <p className="loading-state">No shipped orders.</p>
          ) : (
            allOrders
              .filter(o => o.status === "shipped")
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              .map((order) => (
                <OrderCard
                  key={order.dbKey}
                  order={order}
                  showDeliveryEdit={false}
                  showStatusActions={order.status === "shipped"}
                  statuses={order.status === "shipped" ? ["delivered"] : []}
                  onStatusChange={updateOrderStatus}
                />
              ))
          )}
        </div>

        <div className="admin-card">
          <h3>Cancelled Orders</h3>
          {allOrders.filter(o => o.status === "cancelled").length === 0 ? (
            <p className="loading-state">No cancelled orders.</p>
          ) : (
            allOrders
              .filter(o => o.status === "cancelled")
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              .map((order) => (
                <OrderCard
                  key={order.dbKey}
                  order={order}
                  showDeliveryEdit={false}
                  showStatusActions={false}
                  statuses={[]}
                  onStatusChange={updateOrderStatus}
                />
              ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ManageOrders;
