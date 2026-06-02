import React, { useState, useEffect } from "react";
import { X, Upload, Edit2 } from "lucide-react";
import { db } from "../firebase";
import logoImage from "../assets/logo.png";
import {
  ref as dbRef,
  onValue,
  set,
  update,
  push,
  serverTimestamp,
} from "firebase/database";
import { sendAdminNotification, sendRequestFulfilledEmail, sendRequestRejectedEmail } from "../services/notifications";
import "../App.css";

const AdminDashboard = ({ user, handleSignOut }) => {
  const [products, setProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    inventory: "",
    images: [],
    emoji: "",
    description: "",
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingDeliveryTime, setEditingDeliveryTime] = useState(null);
  const [deliveryTimeInput, setDeliveryTimeInput] = useState("");

  useEffect(() => {
    const productsRef = dbRef(db, "products");
    const unsubscribe = onValue(
      productsRef,
      (snapshot) => {
        const value = snapshot.val();
        if (value) {
          const loadedProducts = Object.entries(value).map(
            ([key, product]) => ({
              dbKey: key,
              id: product.id ?? (Number.isNaN(Number(key)) ? key : Number(key)),
              ...product,
              inventory: Number.isFinite(Number(product.inventory))
                ? Number(product.inventory)
                : 10,
            }),
          );
          loadedProducts.sort((a, b) => a.id - b.id);
          setProducts(loadedProducts);
        } else {
          setProducts([]);
        }
      },
      (error) => {
        console.error("Firebase products error:", error);
        setProducts([]);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const ordersRef = dbRef(db, "orders");
    const unsubscribe = onValue(
      ordersRef,
      (snapshot) => {
        const value = snapshot.val() || {};
        const loadedOrders = Object.entries(value)
          .map(([key, order]) => ({
            dbKey: key,
            id: order.id ?? key,
            ...order,
          }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setAllOrders(loadedOrders);
      },
      (error) => {
        console.error("Firebase orders error:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const requestsRef = dbRef(db, "requests");
    const unsubscribe = onValue(
      requestsRef,
      (snapshot) => {
        const value = snapshot.val() || {};
        const loadedRequests = Object.entries(value)
          .map(([key, request]) => ({
            dbKey: key,
            id: request.id ?? key,
            ...request,
          }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setRequests(loadedRequests);
      },
      (error) => {
        console.error("Firebase requests error:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const usersRef = dbRef(db, "users");
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const value = snapshot.val() || {};
        const loadedUsers = Object.entries(value).map(([key, userData]) => ({
          uid: key,
          ...userData,
        }));

        setUsers(loadedUsers);
      },
      (error) => {
        console.error("Firebase users error:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 3600);

    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message, type = "success") => {
    if (!message) return;
    setToast({ message, type });
  };

  const updateRequestStatus = async (requestKey, status) => {
    const request = requests.find((item) => item.dbKey === requestKey);
    if (!request) {
      return;
    }

    await update(dbRef(db, `requests/${requestKey}`), {
      status,
      updatedAt: serverTimestamp(),
    });

    if (status === "fulfilled") {
      sendRequestFulfilledEmail(request);
    } else if (status === "rejected") {
      sendRequestRejectedEmail(request);
    }

    showToast(`Request status updated to ${status}.`, "success");
  };

  const handleImageUpload = (event, isEditing = false) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log("No file selected");
      return;
    }

    setUploadingImage(true);
    let filesProcessed = 0;
    const newImages = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        showToast(`Skipped ${file.name} - not an image file.`, "error");
        filesProcessed++;
        if (filesProcessed === files.length && newImages.length > 0) {
          finishUpload(newImages, isEditing, event);
        }
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const base64String = e.target?.result;
          if (base64String) {
            newImages.push(base64String);
          }
          filesProcessed++;

          if (filesProcessed === files.length) {
            finishUpload(newImages, isEditing, event);
          }
        } catch (error) {
          console.error("Error processing image:", error);
          filesProcessed++;
          if (filesProcessed === files.length && newImages.length > 0) {
            finishUpload(newImages, isEditing, event);
          }
        }
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        filesProcessed++;
        if (filesProcessed === files.length && newImages.length > 0) {
          finishUpload(newImages, isEditing, event);
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const finishUpload = (newImages, isEditing, event) => {
    if (newImages.length === 0) {
      showToast("Failed to upload any images.", "error");
      setUploadingImage(false);
      event.target.value = "";
      return;
    }

    if (isEditing) {
      setEditingProduct((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...newImages],
      }));
    } else {
      setNewProduct((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...newImages],
      }));
    }

    event.target.value = "";
    showToast(
      `${newImages.length} image${newImages.length > 1 ? "s" : ""} uploaded successfully.`,
      "success",
    );
    setUploadingImage(false);
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();
    setToast(null);

    if (!newProduct.name || !newProduct.category || !newProduct.price) {
      showToast("Name, category, and price are required.", "error");
      return;
    }

    const productRef = push(dbRef(db, "products"));
    await set(productRef, {
      ...newProduct,
      id: Date.now(),
      price: Number(newProduct.price),
      inventory: Number.isFinite(Number(newProduct.inventory))
        ? Number(newProduct.inventory)
        : 0,
      images: newProduct.images || [],
      emoji: newProduct.emoji,
      description: newProduct.description || "",
    });

    setNewProduct({
      name: "",
      category: "",
      price: "",
      images: [],
      emoji: "",
      description: "",
    });
    showToast("Product added successfully.", "success");
  };

  const handleDeleteProduct = async (dbKey) => {
    if (!dbKey) {
      return;
    }
    if (!window.confirm("Delete this product?")) {
      return;
    }
    await set(dbRef(db, `products/${dbKey}`), null);
    showToast("Product deleted.", "success");
  };

  const handleStartEditProduct = (product) => {
    if (!product?.dbKey) {
      return;
    }
    setEditingProduct({ ...product });
    setToast(null);
  };

  const handleCancelEditProduct = () => {
    setEditingProduct(null);
    setToast(null);
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();
    setToast(null);

    if (!editingProduct?.dbKey) {
      showToast("Unable to update product.", "error");
      return;
    }

    if (
      !editingProduct.name ||
      !editingProduct.category ||
      !editingProduct.price
    ) {
      showToast("Name, category, and price are required.", "error");
      return;
    }

    await update(dbRef(db, `products/${editingProduct.dbKey}`), {
      name: editingProduct.name,
      category: editingProduct.category,
      price: Number(editingProduct.price),
      inventory: Number.isFinite(Number(editingProduct.inventory))
        ? Number(editingProduct.inventory)
        : 0,
      images: editingProduct.images || [],
      emoji: editingProduct.emoji,
      description: editingProduct.description || "",
    });

    setEditingProduct(null);
    showToast("Product updated successfully.", "success");
  };

  const updateOrderStatus = async (orderKey, status) => {
    const order = allOrders.find((item) => item.dbKey === orderKey);
    if (!order) {
      return;
    }

    const notificationLog = Array.isArray(order.notificationLog)
      ? order.notificationLog
      : [];

    await set(dbRef(db, `orders/${orderKey}`), {
      ...order,
      status,
      updatedAt: serverTimestamp(),
      notificationLog: [
        ...notificationLog,
        {
          type: "status",
          message: `Order status changed to ${status}`,
          createdAt: serverTimestamp(),
        },
      ],
    });
    showToast(`Order status updated to ${status}.`, "success");
  };

  const updateDeliveryTime = async (orderKey) => {
    const order = allOrders.find((item) => item.dbKey === orderKey);
    if (!order) {
      return;
    }

    const newDateTime = new Date(deliveryTimeInput).getTime();
    if (isNaN(newDateTime)) {
      showToast("Invalid date/time format.", "error");
      return;
    }

    const notificationLog = Array.isArray(order.notificationLog)
      ? order.notificationLog
      : [];

    await set(dbRef(db, `orders/${orderKey}`), {
      ...order,
      deliveryTime: newDateTime,
      updatedAt: serverTimestamp(),
      notificationLog: [
        ...notificationLog,
        {
          type: "delivery",
          message: `Delivery time updated to ${new Date(newDateTime).toLocaleString()}`,
          createdAt: serverTimestamp(),
        },
      ],
    });
    showToast("Delivery time updated successfully.", "success");
    setEditingDeliveryTime(null);
    setDeliveryTimeInput("");
  };

  const dismissToast = () => setToast(null);

  return (
    <div className="app-shell admin-dashboard-view">
      <header className="site-header admin-header">
        <div className="header-inner">
          <div className="brand">
            <img src={logoImage} alt="GIFTO Logo" className="brand-logo" />
            <div>
              <p className="brand-title">GIFTO Admin Dashboard</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="secondary-button small"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div
          className={`toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}
          role="status"
          aria-live="polite"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={dismissToast}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <main className="admin-main">
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

        <section className="admin-section">
          <div className="section-title-row centered">
            <div>
              <h2>Manage Inventory</h2>
            </div>
          </div>

          <div className="admin-inventory-grid">
            <div className="admin-card">
              <h3>Add New Product</h3>
              <form className="admin-form" onSubmit={handleAddProduct}>
              <label className="admin-label">
                Product name
                <input
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  required
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Category
                <input
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      category: e.target.value,
                    })
                  }
                  required
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Price (LE)
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, price: e.target.value })
                  }
                  required
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Stock quantity
                <input
                  type="number"
                  min="0"
                  value={newProduct.inventory}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      inventory: e.target.value,
                    })
                  }
                  required
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Product Images (Multiple)
                <div className="image-upload-container">
                  {newProduct.images && newProduct.images.length > 0 && (
                    <div className="image-preview-list">
                      {newProduct.images.map((img, idx) => (
                        <div key={idx} className="image-preview-item">
                          <img src={img} alt={`Preview ${idx + 1}`} />
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={() =>
                              setNewProduct((prev) => ({
                                ...prev,
                                images: prev.images.filter((_, i) => i !== idx),
                              }))
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
                    className="admin-input"
                    disabled={uploadingImage}
                    multiple
                  />
                  {uploadingImage && <span className="uploading-text">Uploading...</span>}
                  {newProduct.images && newProduct.images.length > 0 && (
                    <p className="image-count">
                      {newProduct.images.length} image{newProduct.images.length !== 1 ? "s" : ""} added
                    </p>
                  )}
                </div>
              </label>
              <label className="admin-label">
                Emoji (if no image)
                <input
                  value={newProduct.emoji}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, emoji: e.target.value })
                  }
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Description
                <textarea
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                  className="admin-textarea"
                />
              </label>
              <button type="submit" className="primary-button full-width">
                Add product
              </button>
            </form>
            </div>

            <div className="admin-card">
              <h3>Product Catalog</h3>
              <div className="product-manager-grid">
                {products.map((product) => (
                  <div key={product.id} className="product-manager-card">
                    <div>
                      <p className="product-title">{product.name}</p>
                      <p
                        className={`product-meta inventory-status ${
                          product.inventory === 0
                            ? "inventory-out"
                            : product.inventory <= 5
                              ? "inventory-low"
                              : "inventory-good"
                        }`}
                      >
                        Stock: {product.inventory}
                      </p>
                    </div>
                    <div className="product-manager-actions">
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() => handleStartEditProduct(product)}
                        disabled={!product.dbKey}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() => handleDeleteProduct(product.dbKey)}
                        disabled={!product.dbKey}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <div className="section-title-row centered">
            <div>
              <h2>Manage Orders</h2>
            </div>
          </div>

          <div className="admin-card">
            {allOrders.length === 0 ? (
              <p className="loading-state">No orders yet.</p>
            ) : (
              (() => {
                const statusOrder = {
                  pending: 1,
                  processing: 2,
                  shipped: 3,
                  delivered: 4,
                  cancelled: 5,
                };
                const sortedOrders = [...allOrders].sort(
                  (a, b) =>
                    (statusOrder[a.status || "pending"] || 6) -
                    (statusOrder[b.status || "pending"] || 6),
                );
                return sortedOrders.map((order) => (
                  <article key={order.dbKey} className="order-manager-card">
                    <div className="order-manager-top">
                      <div>
                        <p className="order-label">
                          #{order.id} - {order.total} LE
                        </p>
                        <p className="order-meta">
                          {order.name} | {order.phone} | {order.address}
                        </p>
                        {order.deliveryTime && order.status !== "cancelled" && order.status !== "delivered" && (
                          <div className="order-meta-with-edit">
                            <p className="order-meta">
                              Delivery: {new Date(order.deliveryTime).toLocaleString()}
                            </p>
                            <button
                                type="button"
                                className="edit-delivery-btn"
                                title="Edit delivery time"
                                onClick={() => {
                                  setEditingDeliveryTime(order.dbKey);
                                  setDeliveryTimeInput(
                                    new Date(order.deliveryTime).toISOString().slice(0, 16)
                                  );
                                }}
                              >
                                <Edit2 size={16} />
                              </button>
                          </div>
                        )}
                      </div>
                      <span
                        className={`order-status status-${order.status || "pending"}`}
                      >
                        {order.status || "pending"}
                      </span>
                    </div>
                    {order.giftWrap && (
                      <p className="order-summary-text">Gift wrap: Yes</p>
                    )}
                    {order.cardMessage ? (
                      <p className="order-summary-text">
                        Message card: {order.cardMessage}
                      </p>
                    ) : null}
                    <p className="order-summary-text">
                      {order.items.length > 0
                        ? order.items.map((item) => item.name).join(", ")
                        : "No items"}
                    </p>
                    {order.status !== "cancelled" && order.status !== "delivered" && (
                      <div className="status-actions">
                        {["pending", "processing", "shipped", "delivered"].map(
                          (status) => (
                            <button
                              type="button"
                              key={`${order.dbKey}-${status}`}
                              className={`status-button ${order.status === status ? "active" : ""}`}
                              onClick={() =>
                                updateOrderStatus(order.dbKey, status)
                              }
                            >
                              {status}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </article>
                ));
              })()
            )}
          </div>
        </section>

        <section className="admin-section">
          <div className="section-title-row centered">
            <div>
              <h2>Manage Requests</h2>
            </div>
          </div>

          <div className="admin-card">
            {requests.length === 0 ? (
              <p className="loading-state">No requests yet.</p>
            ) : (
              (() => {
                const statusOrder = {
                  pending: 1,
                  reviewed: 2,
                  processing: 3,
                  fulfilled: 4,
                  rejected: 5,
                };
                const sortedRequests = [...requests].sort(
                  (a, b) =>
                    (statusOrder[a.status || "pending"] || 6) -
                    (statusOrder[b.status || "pending"] || 6),
                );
                return sortedRequests.map((request) => (
                  <article key={request.dbKey} className="order-manager-card">
                    <div className="order-manager-top">
                      <div>
                        <p className="order-label">
                          {request.itemName}
                        </p>
                        {request.category && (
                          <p className="order-meta">
                            Category: {request.category}
                          </p>
                        )}
                        <p className="order-meta">
                          From: {request.email}
                        </p>
                        {request.description && (
                          <p className="order-meta">
                            Notes: {request.description}
                          </p>
                        )}
                        <p className="order-meta">
                          Requested: {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`order-status status-${request.status || "pending"}`}
                      >
                        {request.status || "pending"}
                      </span>
                    </div>
                    {request.status !== "rejected" && request.status !== "fulfilled" && (
                      <div className="status-actions">
                        {["pending", "reviewed", "processing", "fulfilled", "rejected"].map(
                          (status) => (
                            <button
                              type="button"
                              key={`${request.dbKey}-${status}`}
                              className={`status-button ${request.status === status ? "active" : ""}`}
                              onClick={() =>
                                updateRequestStatus(request.dbKey, status)
                              }
                            >
                              {status}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </article>
                ));
              })()
            )}
          </div>
        </section>
      </main>

      {editingProduct && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={handleCancelEditProduct}
            >
              <X size={24} />
            </button>
            <h2 className="modal-title">Edit Product</h2>
            <form className="admin-form" onSubmit={handleUpdateProduct}>
              <label className="admin-label">
                Product name
                <input
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  }
                  required
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Category
                <input
                  value={editingProduct.category}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      category: e.target.value,
                    })
                  }
                  required
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Price (LE)
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: e.target.value,
                    })
                  }
                  required
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Stock quantity
                <input
                  type="number"
                  min="0"
                  value={editingProduct.inventory ?? ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      inventory: e.target.value,
                    })
                  }
                  required
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Product Images (Multiple)
                <div className="image-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="admin-input"
                    disabled={uploadingImage}
                    multiple
                  />
                  {uploadingImage && <span className="uploading-text">Uploading...</span>}
                  {editingProduct.images && editingProduct.images.length > 0 && (
                    <p className="image-count">
                      {editingProduct.images.length} image{editingProduct.images.length !== 1 ? "s" : ""} added
                    </p>
                  )}
                </div>
              </label>
              <label className="admin-label">
                Emoji (if no image)
                <input
                  value={editingProduct.emoji || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      emoji: e.target.value,
                    })
                  }
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Description
                <textarea
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                    })
                  }
                  className="admin-textarea"
                />
              </label>
              <div className="product-manager-form-actions">
                <button type="submit" className="primary-button full-width">
                  Save changes
                </button>
                <button
                  type="button"
                  className="secondary-button full-width"
                  onClick={handleCancelEditProduct}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingDeliveryTime && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setEditingDeliveryTime(null);
                setDeliveryTimeInput("");
              }}
            >
              <X size={24} />
            </button>
            <h2 className="modal-title">Edit Delivery Time</h2>
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                updateDeliveryTime(editingDeliveryTime);
              }}
            >
              <label className="admin-label">
                Delivery Date & Time
                <input
                  type="datetime-local"
                  value={deliveryTimeInput}
                  onChange={(e) => setDeliveryTimeInput(e.target.value)}
                  required
                  className="admin-input"
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="primary-button full-width">
                  Update Delivery Time
                </button>
                <button
                  type="button"
                  className="secondary-button full-width"
                  onClick={() => {
                    setEditingDeliveryTime(null);
                    setDeliveryTimeInput("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
