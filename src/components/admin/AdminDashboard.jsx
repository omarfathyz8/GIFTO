import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import logoImage from "../../assets/logo.png";
import {
  ref as dbRef,
  onValue,
  set,
  update,
  push,
  serverTimestamp,
} from "firebase/database";
import { sendAdminNotification, sendRequestFulfilledEmail, sendRequestRejectedEmail, sendShippedEmail, updateOrderStatusInSheet, recordDeliveredOrderToRevenue } from "../../services/notifications";
import { uploadToCloudinary } from "../../services/cloudinary";
import BusinessOverview from "./BusinessOverview";
import FinancialTracker from "./FinancialTracker";
import ManageRequests from "./ManageRequests";
import ManageInventory from "./ManageInventory";
import ManageOrders from "./ManageOrders";
import ManageCustomers from "./ManageCustomers";
import EditProductModal from "./EditProductModal";
import EditDeliveryModal from "./EditDeliveryModal";
import "../../App.css";

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

  const handleImageUpload = async (event, isEditing = false, colorName = null) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log("No file selected");
      return;
    }

    setUploadingImage(true);
    const newImages = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        showToast(`Skipped ${file.name} - not an image file.`, "error");
        continue;
      }

      try {
        const cloudinaryUrl = await uploadToCloudinary(file);
        newImages.push(cloudinaryUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        showToast(`Failed to upload ${file.name}`, "error");
      }
    }

    finishUpload(newImages, isEditing, event, colorName);
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

    if (status === "delivered") {
      recordDeliveredOrderToRevenue(order).catch(err => console.error("Revenue recording error:", err));
    }

    showToast(`Order status updated to ${status}.`, "success");

    updateOrderStatusInSheet(order.id, status).catch(err => console.error("Sheet error:", err));
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

    const formatDate = (timestamp) => {
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
          message: `Delivery time updated to ${formatDate(newDateTime)}`,
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

        <FinancialTracker allOrders={allOrders} />

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
          allOrders={allOrders}
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

        <ManageCustomers
          users={users}
          allOrders={allOrders}
        />
      </main>

      <EditProductModal
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        uploadingImage={uploadingImage}
        handleImageUpload={handleImageUpload}
        handleUpdateProduct={handleUpdateProduct}
        handleCancelEditProduct={handleCancelEditProduct}
        editingColorName={editingColorName}
        setEditingColorName={setEditingColorName}
      />

      <EditDeliveryModal
        editingDeliveryTime={editingDeliveryTime}
        setEditingDeliveryTime={setEditingDeliveryTime}
        deliveryTimeInput={deliveryTimeInput}
        setDeliveryTimeInput={setDeliveryTimeInput}
        updateDeliveryTime={updateDeliveryTime}
      />
    </div>
  );
};

export default AdminDashboard;
