import React from "react";

const BusinessOverview = ({ products, allOrders, requests, users }) => {
  return (
    <section className="admin-section">
      <div className="section-title-row centered">
        <div>
          <h2>Business Overview</h2>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="metric-label">Registered Users</div>
          <div className="metric-value">{users.length - 3}</div>
          <div className="metric-description">Total registered customers</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Total Orders</div>
          <div className="metric-value">{allOrders.length}</div>
          <div className="metric-description">All time orders</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Delivered Orders</div>
          <div className="metric-value">{allOrders.filter(o => o.status === 'delivered').length}</div>
          <div className="metric-description">{allOrders.length > 0 ? Math.round((allOrders.filter(o => o.status === 'delivered').length / allOrders.length) * 100) : 0}% completion</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Pending Orders</div>
          <div className="metric-value">{allOrders.filter(o => o.status === 'pending' || o.status === 'processing').length}</div>
          <div className="metric-description">Awaiting action</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Active Customers</div>
          <div className="metric-value">{new Set(allOrders.filter(o => o.status === 'delivered').map(o => o.userId)).size}</div>
          <div className="metric-description">Made a purchase</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Best Seller</div>
          <div className="metric-value">
            {(() => {
              const itemCounts = {};
              allOrders.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                  order.items.forEach(item => {
                    itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
                  });
                }
              });
              const bestItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
              return bestItem ? `${bestItem[0].substring(0, 15)} (${bestItem[1]}x)` : 'No Sales';
            })()}
          </div>
          <div className="metric-description">Most ordered product</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Cancelled Orders</div>
          <div className="metric-value">{allOrders.filter(o => o.status === 'cancelled').length}</div>
          <div className="metric-description">{allOrders.length > 0 ? Math.round((allOrders.filter(o => o.status === 'cancelled').length / allOrders.length) * 100) : 0}% cancellation rate</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Pending Requests</div>
          <div className="metric-value">{requests.filter(r => r.status === 'pending').length}</div>
          <div className="metric-description">Awaiting review</div>
        </div>

        <div className="dashboard-card highlight">
          <div className="metric-label">Revenue</div>
          <div className="metric-value">{allOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0)} LE</div>
          <div className="metric-description">Delivered orders only</div>
        </div>

        <div className="dashboard-card">
          <div className="metric-label">Avg Delivery Time</div>
          <div className="metric-value">
            {(() => {
              const deliveredOrders = allOrders.filter(o => o.status === 'delivered' && o.createdAt && o.deliveryTime);
              if (deliveredOrders.length === 0) return '—';
              const totalDays = deliveredOrders.reduce((sum, o) => {
                const createdDate = new Date(o.createdAt);
                const deliveryDate = new Date(o.deliveryTime);
                const daysElapsed = Math.floor((deliveryDate - createdDate) / (1000 * 60 * 60 * 24));
                return sum + daysElapsed;
              }, 0);
              const avgDays = Math.round(totalDays / deliveredOrders.length);
              return `${avgDays} days`;
            })()}
          </div>
          <div className="metric-description">Order to delivery</div>
        </div>
      </div>

      <div className="insights-card">
        <h3>Business Insights & Recommendations</h3>
        <ul className="insights-list">
          {allOrders.filter(o => o.status === 'pending').length > 5 && (
            <li className="insight-warning">⚠️ <strong>High Pending Orders:</strong> You have {allOrders.filter(o => o.status === 'pending').length} pending orders. Consider processing them to improve delivery times.</li>
          )}
          {products.filter(p => p.inventory === 0).length && (
            <li className="insight-warning">📦 <strong>Low Stock Alert:</strong> {products.filter(p => p.inventory === 0).length} products are out of stock. Restock popular items.</li>
          )}
          {allOrders.filter(o => o.status === 'cancelled').length > allOrders.length * 0.1 && (
            <li className="insight-warning">📊 <strong>High Cancellation Rate:</strong> Your cancellation rate is above 10%. Review customer feedback.</li>
          )}
          {products.filter(p => p.inventory > 0 && p.inventory <= 5).length && (
            <li className="insight-info">⏰ <strong>Low Inventory:</strong> {products.filter(p => p.inventory > 0 && p.inventory <= 5).length} products have low stock. Consider reordering soon.</li>
          )}
          {products.length > 0 && (
            <li className="insight-info">📈 <strong>Total Products:</strong> You have {products.length} products in your catalog. Monitor bestsellers and underperformers.</li>
          )}
          {allOrders.length > 0 && allOrders.filter(o => o.status === 'delivered').length === allOrders.length && (
            <li className="insight-success">✅ <strong>Perfect Delivery:</strong> All orders have been delivered! Excellent performance.</li>
          )}
        </ul>
      </div>
    </section>
  );
};

export default BusinessOverview;
