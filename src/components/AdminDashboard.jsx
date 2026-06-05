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
import { sendAdminNotification, sendRequestFulfilledEmail, sendRequestRejectedEmail, sendShippedEmail } from "../services/notifications";
import BusinessOverview from "./admin/BusinessOverview";
import ManageRequests from "./admin/ManageRequests";
import ManageInventory from "./admin/ManageInventory";
import ManageOrders from "./admin/ManageOrders";
import "../App.css";

const AdminDashboard = ({ user, handleSignOut, categories }) => {
  const [products, setProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    inventory: "",
    colors: {},
    emoji: "",
    description: "",
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingDeliveryTime, setEditingDeliveryTime] = useState(null);
  const [deliveryTimeInput, setDeliveryTimeInput] = useState("");
  const [editingColorName, setEditingColorName] = useState("");

  useEffect(() => {
    const productsRef = dbRef(db, "products");
    const unsubscribe = onValue(
      productsRef,
      (snapshot) => {
        const value = snapshot.val();
        if (value) {
          const loadedProducts = Object.entries(value).map(
            ([key, product]) => {
              let colors = product.colors;
              if (!colors) {
                if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                  colors = { "Default": { images: product.images, stock: product.inventory || 10 } };
                } else {
                  colors = {};
                }
              } else {
                colors = Object.entries(colors).reduce((acc, [colorName, colorData]) => {
                  if (Array.isArray(colorData)) {
                    acc[colorName] = { images: colorData, stock: product.inventory || 10 };
                  } else {
                    acc[colorName] = colorData;
                  }
                  return acc;
                }, {});
              }
              return {
                dbKey: key,
                id: product.id ?? (Number.isNaN(Number(key)) ? key : Number(key)),
                ...product,
                colors: colors || {},
              };
            },
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

  const handleImageUpload = (event, isEditing = false, colorName = null) => {
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
          finishUpload(newImages, isEditing, event, colorName);
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
            finishUpload(newImages, isEditing, event, colorName);
          }
        } catch (error) {
          console.error("Error processing image:", error);
          filesProcessed++;
          if (filesProcessed === files.length && newImages.length > 0) {
            finishUpload(newImages, isEditing, event, colorName);
          }
        }
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        filesProcessed++;
        if (filesProcessed === files.length && newImages.length > 0) {
          finishUpload(newImages, isEditing, event, colorName);
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const finishUpload = (newImages, isEditing, event, colorName = null) => {
    if (newImages.length === 0) {
      showToast("Failed to upload any images.", "error");
      setUploadingImage(false);
      event.target.value = "";
      return;
    }

    if (isEditing) {
      setEditingProduct((prev) => {
        const colors = { ...prev.colors };
        if (colorName) {
          const colorData = colors[colorName];
          if (Array.isArray(colorData)) {
            colors[colorName] = { images: [...colorData, ...newImages], stock: 0 };
          } else {
            colors[colorName] = {
              ...colorData,
              images: [...(colorData?.images || []), ...newImages],
            };
          }
        }
        return { ...prev, colors };
      });
    } else {
      setNewProduct((prev) => {
        const colors = { ...prev.colors };
        if (colorName) {
          const colorData = colors[colorName];
          if (Array.isArray(colorData)) {
            colors[colorName] = { images: [...colorData, ...newImages], stock: 0 };
          } else {
            colors[colorName] = {
              ...colorData,
              images: [...(colorData?.images || []), ...newImages],
            };
          }
        }
        return { ...prev, colors };
      });
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

    if (Object.keys(newProduct.colors).length === 0) {
      showToast("Add at least one color with images.", "error");
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
      colors: newProduct.colors || {},
      emoji: newProduct.emoji,
      description: newProduct.description || "",
    });

    setNewProduct({
      name: "",
      category: "",
      price: "",
      colors: {},
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

    if (Object.keys(editingProduct.colors || {}).length === 0) {
      showToast("Add at least one color with images.", "error");
      return;
    }

    await update(dbRef(db, `products/${editingProduct.dbKey}`), {
      name: editingProduct.name,
      category: editingProduct.category,
      price: Number(editingProduct.price),
      inventory: Number.isFinite(Number(editingProduct.inventory))
        ? Number(editingProduct.inventory)
        : 0,
      colors: editingProduct.colors || {},
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

    if (status === "shipped") {
      const userEmail = users.find((u) => u.uid === order.userId)?.email;
      if (userEmail) {
        sendShippedEmail(order, userEmail);
      }
    }

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
        <BusinessOverview
          products={products}
          allOrders={allOrders}
          requests={requests}
          users={users}
        />

        <ManageInventory
          products={products}
          newProduct={newProduct}
          setNewProduct={setNewProduct}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          uploadingImage={uploadingImage}
          handleImageUpload={handleImageUpload}
          handleAddProduct={handleAddProduct}
          handleStartEditProduct={handleStartEditProduct}
          handleCancelEditProduct={handleCancelEditProduct}
          handleUpdateProduct={handleUpdateProduct}
          handleDeleteProduct={handleDeleteProduct}
          categories={categories}
        />

        <ManageRequests
          requests={requests}
          updateRequestStatus={updateRequestStatus}
        />

        <ManageOrders
          allOrders={allOrders}
          updateOrderStatus={updateOrderStatus}
          setEditingDeliveryTime={setEditingDeliveryTime}
          setDeliveryTimeInput={setDeliveryTimeInput}
        />

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
              <div className="admin-label">
                <p style={{ marginBottom: "10px", fontWeight: "600" }}>Product Colors</p>
                {Object.keys(editingProduct.colors || {}).map((colorName) => (
                  <div key={colorName} style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <p style={{ fontWeight: "500" }}>{colorName}</p>
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() => {
                          const newColors = { ...editingProduct.colors };
                          delete newColors[colorName];
                          setEditingProduct({ ...editingProduct, colors: newColors });
                        }}
                      >
                        Remove Color
                      </button>
                    </div>
                    <label className="admin-label" style={{ marginBottom: "10px" }}>
                      Stock for {colorName}
                      <input
                        type="number"
                        min="0"
                        value={editingProduct.colors[colorName]?.stock ?? ""}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            colors: {
                              ...prev.colors,
                              [colorName]: {
                                ...prev.colors[colorName],
                                stock: e.target.value === "" ? 0 : Number(e.target.value),
                              },
                            },
                          }))
                        }
                        className="admin-input"
                      />
                    </label>
                    <p style={{ fontSize: "12px", marginBottom: "8px" }}>
                      {Array.isArray(editingProduct.colors[colorName]) ? editingProduct.colors[colorName].length : editingProduct.colors[colorName]?.images?.length || 0} image{(Array.isArray(editingProduct.colors[colorName]) ? editingProduct.colors[colorName].length : editingProduct.colors[colorName]?.images?.length || 0) !== 1 ? "s" : ""}
                    </p>
                    {editingProduct.colors[colorName]?.images && editingProduct.colors[colorName].images.length > 0 && (
                      <div className="image-preview-list">
                        {editingProduct.colors[colorName].images.map((img, idx) => (
                          <div key={idx} className="image-preview-item">
                            <img src={img} alt={`${colorName} ${idx + 1}`} />
                            <button
                              type="button"
                              className="remove-image-btn"
                              onClick={() =>
                                setEditingProduct((prev) => ({
                                  ...prev,
                                  colors: {
                                    ...prev.colors,
                                    [colorName]: {
                                      ...prev.colors[colorName],
                                      images: prev.colors[colorName].images.filter((_, i) => i !== idx),
                                    },
                                  },
                                }))
                              }
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="admin-label">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true, colorName)}
                        className="admin-input"
                        disabled={uploadingImage}
                        multiple
                      />
                      {uploadingImage && <span className="uploading-text">Uploading...</span>}
                    </label>
                  </div>
                ))}

                <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
                  <p style={{ marginBottom: "8px", fontWeight: "500" }}>Add New Color</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={editingColorName}
                      onChange={(e) => setEditingColorName(e.target.value)}
                      placeholder="Color name (e.g., Red, Blue)"
                      className="admin-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="primary-button small"
                      onClick={() => {
                        if (editingColorName.trim()) {
                          setEditingProduct({
                            ...editingProduct,
                            colors: {
                              ...editingProduct.colors,
                              [editingColorName]: { images: [], stock: 0 }
                            },
                          });
                          setEditingColorName("");
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
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
              <div className="delivery-form-actions">
                <button type="submit" className="primary-button">
                  Update Delivery Time
                </button>
                <button
                  type="button"
                  className="secondary-button"
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
