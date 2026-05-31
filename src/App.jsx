import React, { useState, useEffect } from "react";
import { ShoppingCart, X, Check, Heart, Search, Upload } from "lucide-react";
import { auth, db } from "./firebase";
import logoImage from "./assets/logo.png";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  ref as dbRef,
  onValue,
  set,
  update,
  push,
  serverTimestamp,
} from "firebase/database";
import { sendOrderEmail, submitToGoogleForms, sendAdminNotification } from "./services/notifications";
import "./App.css";

const GIFTOWebsite = () => {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessageEnabled, setGiftMessageEnabled] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [wishlists, setWishlists] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authAddress, setAuthAddress] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [productQuantities, setProductQuantities] = useState({});
  const [toast, setToast] = useState(null);
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
  const [currentImageIndex, setCurrentImageIndex] = useState({});

  const categories = [
    "All",
    "Wallets",
    "Watches",
    "Perfumes",
    "Medals",
    "Accessories",
    "Decor",
    "Sets",
  ];

  const isAdmin = user?.email === "admin@gifto.com";
  const isGuest = !user;
  const canUseCart = Boolean(user);
  const wishlistItems = products.filter((product) =>
    wishlists.has(product.id.toString()),
  );

  useEffect(() => {
    const savedWishlist = window.localStorage.getItem("gift-store-wishlist");
    if (savedWishlist) {
      try {
        const items = JSON.parse(savedWishlist);
        setWishlists(new Set(items.map(String)));
      } catch (error) {
        console.error("Wishlist load error:", error);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = dbRef(db, `users/${currentUser.uid}`);
        await update(userRef, {
          uid: currentUser.uid,
          email: currentUser.email || "",
          lastSeen: serverTimestamp(),
        });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return undefined;
    }

    const profileRef = dbRef(db, `users/${user.uid}`);
    const unsubscribeProfile = onValue(
      profileRef,
      (snapshot) => {
        setUserProfile(snapshot.val() || null);
      },
      (error) => {
        console.error("User profile error:", error);
      },
    );

    return () => unsubscribeProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const wishlistRef = dbRef(db, `users/${user.uid}/wishlist`);
    const unsubscribe = onValue(
      wishlistRef,
      (snapshot) => {
        const value = snapshot.val() || {};
        const savedIds = Object.keys(value).filter((key) => value[key]);
        setWishlists(new Set(savedIds.map(String)));
      },
      (error) => {
        console.error("Wishlist error:", error);
      },
    );

    return () => unsubscribe();
  }, [user]);

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
          setProducts(defaultProducts);
        }
        setLoadingProducts(false);
      },
      (error) => {
        console.error("Firebase products error:", error);
        setProducts(defaultProducts);
        setLoadingProducts(false);
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
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        setAllOrders(loadedOrders);
        if (user) {
          setOrders(loadedOrders.filter((order) => order.userId === user.uid));
        } else {
          setOrders([]);
        }
        setLoadingOrders(false);
      },
      (error) => {
        console.error("Firebase orders error:", error);
        setLoadingOrders(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      window.localStorage.setItem(
        "gift-store-wishlist",
        JSON.stringify(Array.from(wishlists)),
      );
    }
  }, [wishlists, user]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setToast(null);

    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        showToast("Signed in successfully.", "success");
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          authEmail,
          authPassword,
        );
        const createdUser = userCredential.user;
        if (createdUser) {
          const userRef = dbRef(db, `users/${createdUser.uid}`);
          await set(userRef, {
            uid: createdUser.uid,
            email: createdUser.email || "",
            name: authName,
            address: authAddress,
            phone: authPhone,
            createdAt: createdUser.metadata?.creationTime || "",
            lastSeen: serverTimestamp(),
          });
        }
        showToast("Account created successfully.", "success");
      }
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      setAuthAddress("");
      setAuthPhone("");
      setAuthOpen(false);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showToast("Signed out successfully.", "success");
    setShowCart(false);
    setShowCheckout(false);
    setWishlists(new Set());
  };

  const handleCheckoutClick = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setShowCart(false);
    setShowCheckout(true);
  };

  const updateCartItemQuantity = (productId, quantity) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => (item.id === productId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const increaseCartQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decreaseCartQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const getProductQuantity = (productId) => {
    return productQuantities[productId] || 0;
  };

  const getCartQuantity = (productId) => {
    return cart.find((item) => item.id === productId)?.quantity || 0;
  };

  const getAvailableInventory = (product) => {
    const inventory = Number.isFinite(Number(product.inventory))
      ? Number(product.inventory)
      : 0;
    return Math.max(inventory - getCartQuantity(product.id), 0);
  };

  const incrementProductQuantity = (product) => {
    const currentQuantity = getProductQuantity(product.id);
    const available = getAvailableInventory(product);
    if (currentQuantity >= available) return;

    setProductQuantities((current) => ({
      ...current,
      [product.id]: currentQuantity + 1,
    }));
  };

  const decrementProductQuantity = (productId) => {
    setProductQuantities((current) => ({
      ...current,
      [productId]: Math.max((current[productId] || 0) - 1, 0),
    }));
  };

  const addToCart = (product, quantity = 1) => {
    const available = getAvailableInventory(product);
    if (available === 0) {
      showToast("This product is out of stock.", "error");
      return;
    }
    const quantityToAdd = Math.min(quantity, available);
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart((currentCart) =>
        currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item,
        ),
      );
    } else {
      setCart((currentCart) => [
        ...currentCart,
        { ...product, quantity: quantityToAdd },
      ]);
    }
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId),
    );
  };

  const toggleWishlist = async (productId) => {
    const productKey = productId.toString();
    const updatedWishlist = new Set(wishlists);

    if (updatedWishlist.has(productKey)) {
      updatedWishlist.delete(productKey);
      if (user) {
        await set(dbRef(db, `users/${user.uid}/wishlist/${productKey}`), null);
      }
    } else {
      updatedWishlist.add(productKey);
      if (user) {
        await set(dbRef(db, `users/${user.uid}/wishlist/${productKey}`), true);
      }
    }

    setWishlists(updatedWishlist);
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const giftWrapFee = giftWrap ? 50 : 0;
  const giftMessageFee = giftMessageEnabled ? 10 : 0;
  const finalTotal = cartTotal + giftWrapFee + giftMessageFee;

  const formatTimestamp = (value) => {
    if (!value) {
      return "—";
    }
    const timestamp = typeof value === "number" ? value : Number(value);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toLocaleString();
    }
    return String(value);
  };

  const getUserDisplayName = () => {
    return userProfile?.name || "GUEST";
  };

  const showToast = (message, type = "success") => {
    if (!message) return;
    setToast({ message, type });
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

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 3600);

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const intervals = products.map((product) => {
      if (!product.images || product.images.length <= 1) return null;

      return setInterval(() => {
        setCurrentImageIndex((prev) => ({
          ...prev,
          [product.id]: ((prev[product.id] || 0) + 1) % product.images.length,
        }));
      }, 2500);
    });

    return () => {
      intervals.forEach((interval) => {
        if (interval) clearInterval(interval);
      });
    };
  }, [products]);

  const dismissToast = () => setToast(null);

  const handleAddProduct = async (event) => {
    event.preventDefault();
    setToast(null);

    if (!isAdmin) {
      showToast("Only admin can add products.", "error");
      return;
    }

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
    if (!isAdmin || !dbKey) {
      return;
    }
    if (!window.confirm("Delete this product?")) {
      return;
    }
    await set(dbRef(db, `products/${dbKey}`), null);
    showToast("Product deleted.", "success");
  };

  const handleStartEditProduct = (product) => {
    if (!isAdmin || !product?.dbKey) {
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

    if (!isAdmin || !editingProduct?.dbKey) {
      showToast("Only admin can edit products.", "error");
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
    if (!isAdmin) {
      return;
    }

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

  const handleCancelOrder = async (orderKey) => {
    if (!user) {
      return;
    }

    const order = orders.find((item) => item.dbKey === orderKey);
    if (!order) {
      return;
    }

    const currentStatus = order.status || "pending";
    if (!["pending", "processing"].includes(currentStatus)) {
      return;
    }

    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    const notificationLog = Array.isArray(order.notificationLog)
      ? order.notificationLog
      : [];

    await set(dbRef(db, `orders/${orderKey}`), {
      ...order,
      status: "cancelled",
      updatedAt: serverTimestamp(),
      notificationLog: [
        ...notificationLog,
        {
          type: "status",
          message: "Order canceled by customer.",
          createdAt: serverTimestamp(),
        },
      ],
    });

    for (const item of order.items) {
      const product = products.find((p) => p.id === item.id);
      if (product && product.dbKey) {
        const newInventory =
          (Number(product.inventory) || 0) + item.quantity;
        await update(dbRef(db, `products/${product.dbKey}`), {
          inventory: newInventory,
        });
      }
    }

    showToast("Your order has been canceled.", "success");
  };

  const createOrder = async () => {
    if (!user) {
      setAuthOpen(true);
      setShowCheckout(false);
      return;
    }

    if (cart.length === 0) {
      showToast("Your cart is empty.", "error");
      return;
    }

    const orderRef = push(dbRef(db, "orders"));
    const orderData = {
      id: orderRef.key,
      userId: user.uid,
      name: userProfile?.name || "",
      address: userProfile?.address || "",
      phone: userProfile?.phone || "",
      items: cart,
      total: finalTotal,
      paymentMethod,
      giftWrap,
      cardMessage: giftMessage,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      notificationLog: [
        {
          type: "order",
          message: "Order created. Confirmation will be sent soon.",
          createdAt: serverTimestamp(),
        },
      ],
    };

    await set(orderRef, orderData);

    sendOrderEmail(orderData, user.email);
    sendAdminNotification(orderData, user.email);
    submitToGoogleForms(orderData, user.email);

    for (const item of cart) {
      const product = products.find((p) => p.id === item.id);
      if (product && product.dbKey) {
        const newInventory = Math.max(
          (Number(product.inventory) || 0) - item.quantity,
          0,
        );
        await update(dbRef(db, `products/${product.dbKey}`), {
          inventory: newInventory,
        });
      }
    }

    setCart([]);
    setShowCheckout(false);
    setGiftMessage("");
    setGiftWrap(false);
    setPaymentMethod("cod");
    showToast("Your order has been placed successfully.", "success");
  };

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  });

  const selectedCategory = categories.includes(searchQuery)
    ? searchQuery
    : "All";

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <img src={logoImage} alt="GIFTO Logo" className="brand-logo" />
            <div>
              <p className="brand-title">GIFTO</p>
              <p className="brand-subtitle">Make it special</p>
            </div>
          </div>

          <div className="header-actions">
            <label className="search-box">
              <Search size={22} />
              <input
                type="text"
                aria-label="Search gifts"
                placeholder="Search gifts"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            {user ? (
              <div className="user-actions">
                <span className="user-chip">
                  Hello, {getUserDisplayName(user)}
                </span>
                <button
                  type="button"
                  className="secondary-button small"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="secondary-button small"
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
              >
                Sign In
              </button>
            )}
            {canUseCart && (
              <button
                type="button"
                className="wishlist-toggle"
                onClick={() => setShowWishlist(true)}
                aria-label="Open wishlist"
              >
                <Heart size={24} />
                {wishlists.size > 0 && (
                  <span className="wishlist-badge">
                    {wishlists.size}
                  </span>
                )}
              </button>
            )}
            {canUseCart && (
              <button
                type="button"
                className="cart-toggle"
                onClick={() => setShowCart(true)}
              >
                <ShoppingCart size={24} />
                {cart.length > 0 && (
                  <span className="cart-badge">{cart.length}</span>
                )}
              </button>
            )}
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

      <main>
        <section className="hero">
          <div className="hero-copy">
            <img src={logoImage} alt="GIFTO Logo" className="hero-logo" />
            <h1>The perfect gift for every celebration</h1>
            <p className="hero-text">
              Handpicked leather, perfume, décor and accessories delivered with
              care and local charm.
            </p>
            <div className="hero-actions">
              {canUseCart && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowCart(true)}
                >
                  View Cart
                </button>
              )}
              {canUseCart && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowWishlist(true)}
                >
                  View Wishlist
                </button>
              )}
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSearchQuery("Sets")}
              >
                Shop Sets
              </button>
            </div>
          </div>
        </section>

        <section className="category-bar" aria-label="Gift categories">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={`category-button ${selectedCategory === category ? "active" : ""}`}
              onClick={() => setSearchQuery(category === "All" ? "" : category)}
            >
              {category}
            </button>
          ))}
        </section>

        <section className="product-grid">
          {loadingProducts ? (
            <p className="loading-state">Loading products…</p>
          ) : filteredProducts.length === 0 ? (
            <p className="loading-state">No products available yet.</p>
          ) : (
            filteredProducts.map((product) => {
              const images = product.images || [];
              const currentIdx = currentImageIndex[product.id] || 0;
              const currentImage = images[currentIdx];

              return (
                <article key={product.id} className="product-card">
                  <div className="product-image">
                    {currentImage && currentImage.startsWith("data:") ? (
                      <>
                        <img src={currentImage} alt={product.name} />
                        {images.length > 1 && (
                          <div className="image-indicator">
                            {currentIdx + 1} / {images.length}
                          </div>
                        )}
                      </>
                    ) : product.emoji ? (
                      <span className="product-emoji">{product.emoji}</span>
                    ) : (
                      <div className="no-image-placeholder">No image</div>
                    )}
                  </div>
                <div className="product-body">
                  <p className="product-category">{product.category}</p>
                  <h2 className="product-title">{product.name}</h2>
                  <p className="product-description">{product.description}</p>
                  <div className="product-meta">
                    <span className="product-price">{product.price} LE</span>
                    {getAvailableInventory(product) > 5 ? null : (
                      <span
                        className={`stock-status ${
                          getAvailableInventory(product) === 0
                            ? "stock-out"
                            : "stock-low"
                        }`}
                      >
                        {getAvailableInventory(product) === 0
                          ? "Out of stock"
                          : `Only ${getAvailableInventory(product)} left`}
                      </span>
                    )}
                    {canUseCart && (
                      <button
                        type="button"
                        className="wishlist-button"
                        onClick={() => toggleWishlist(product.id)}
                        aria-label={
                          wishlists.has(product.id.toString())
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                      >
                        <Heart
                          size={20}
                          fill={
                            wishlists.has(product.id.toString())
                              ? "#f43f5e"
                              : "none"
                          }
                          color={
                            wishlists.has(product.id.toString())
                              ? "#dc2626"
                              : "#9ca3af"
                          }
                        />
                      </button>
                    )}
                  </div>
                  {canUseCart && (
                    <div className="product-card-controls">
                      <div className="product-card-quantity">
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() => decrementProductQuantity(product.id)}
                          aria-label={`Decrease quantity of ${product.name}`}
                          disabled={getProductQuantity(product.id) === 0}
                        >
                          −
                        </button>
                        <span className="quantity-value">
                          {getProductQuantity(product.id)}
                        </span>
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() => incrementProductQuantity(product)}
                          aria-label={`Increase quantity of ${product.name}`}
                          disabled={
                            getProductQuantity(product.id) >=
                            getAvailableInventory(product)
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="add-button"
                        onClick={() => {
                          const quantity = getProductQuantity(product.id) || 1;
                          addToCart(product, quantity);
                          setProductQuantities((current) => ({
                            ...current,
                            [product.id]: 0,
                          }));
                        }}
                        disabled={getAvailableInventory(product) === 0}
                      >
                        Add to Cart
                      </button>
                    </div>
                  )}
                </div>
              </article>
              );
            })
          )}
        </section>

        {user && (
          <section className="orders-section">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Your order history</p>
                <h2>My Orders</h2>
              </div>
              <button
                type="button"
                className="secondary-button small"
                onClick={() => setShowCart(true)}
              >
                Open Cart
              </button>
            </div>
            {loadingOrders ? (
              <p className="loading-state">Loading your orders…</p>
            ) : orders.length === 0 ? (
              <p className="loading-state">You have no orders yet.</p>
            ) : (
              orders.map((order, index) => (
                <article key={order.dbKey} className="order-card">
                  <div className="order-card-title">
                    <div>
                      <p className="order-label">Order {index + 1}</p>
                      <p className="order-meta">
                        Placed at {formatTimestamp(order.createdAt)}
                      </p>
                      <p className="order-meta">
                        Estimated delivery at {formatTimestamp((() => {
                          const date = new Date(order.createdAt);
                          const daysToAdd = date.getHours() < 12 ? 4 : 5;
                          date.setDate(date.getDate() + daysToAdd);
                          date.setHours(10, 0, 0, 0);
                          return date.getTime();
                        })())}
                      </p>
                    </div>
                    <span
                      className={`order-status status-${order.status || "pending"}`}
                    >
                      {order.status || "pending"}
                    </span>
                  </div>
                  <p className="order-summary-text">
                    {order.items.length} item
                    {order.items.length === 1 ? "" : "s"} • {order.total} LE •{" "}
                    {order.paymentMethod.toUpperCase()}
                  </p>
                  <p className="order-summary-text">
                    Gift wrap: {order.giftWrap ? "Yes" : "No"}
                  </p>
                  {order.cardMessage ? (
                    <p className="order-summary-text">
                      Message card: {order.cardMessage}
                    </p>
                  ) : (
                    <p className="order-summary-text">No message card added.</p>
                  )}
                  {["pending", "processing"].includes(
                    order.status || "pending",
                  ) && (
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() => handleCancelOrder(order.dbKey)}
                    >
                      Cancel Order
                    </button>
                  )}
                </article>
              ))
            )}
          </section>
        )}

        {isAdmin && (
          <section className="admin-dashboard">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Admin access</p>
                <h2>Admin Dashboard</h2>
              </div>
            </div>

            <div className="admin-grid">
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
                        {/* <p className="product-meta">{product.category}</p> */}
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

            <div className="admin-card">
              <h3>Manage Customer Orders</h3>
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
                          #{order.id} - - {order.total} LE
                        </p>
                        <p className="order-meta">
                          {order.name} | {order.phone} | {order.address}
                        </p>
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
                    {order.status !== "cancelled" && (
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
        )}
      </main>

      {authOpen && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => setAuthOpen(false)}
            >
              <X size={24} />
            </button>
            <h2 className="modal-title">
              {authMode === "login" ? "Sign In" : "Create Account"}
            </h2>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <label className="auth-label">
                Email
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                />
              </label>
              <label className="auth-label">
                Password
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                />
              </label>
              {authMode === "signup" && (
                <>
                  <label className="auth-label">
                    Full name
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="auth-label">
                    Address
                    <textarea
                      value={authAddress}
                      onChange={(e) => setAuthAddress(e.target.value)}
                      required
                    />
                  </label>
                  <label className="auth-label">
                    Phone number
                    <input
                      type="tel"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      required
                    />
                  </label>
                </>
              )}
              <button type="submit" className="primary-button full-width">
                {authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
            <p className="auth-switch">
              {authMode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  setAuthMode(authMode === "login" ? "signup" : "login")
                }
              >
                {authMode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      )}

      {showCart && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="cart-panel">
            <div className="panel-header">
              <div>
                <p className="panel-title">Shopping Cart</p>
                <p className="panel-subtitle">Review your selected gifts</p>
              </div>
              <button
                type="button"
                className="panel-close"
                onClick={() => setShowCart(false)}
              >
                <X size={24} />
              </button>
            </div>

            {wishlistItems.length > 0 && (
              <div className="cart-wishlist-note">
                You have {wishlistItems.length} saved item
                {wishlistItems.length === 1 ? "" : "s"} in your Wishlist.
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setShowCart(false);
                    setShowWishlist(true);
                  }}
                >
                  View Wishlist
                </button>
              </div>
            )}

            {cart.length === 0 ? (
              <p className="empty-state">
                Your cart is empty. Add a gift to get started.
              </p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div>
                        <p className="cart-item-name">{item.name}</p>
                        <p className="cart-item-meta">{item.price} LE each</p>
                        <div className="cart-item-quantity">
                          <button
                            type="button"
                            className="quantity-button"
                            onClick={() => decreaseCartQuantity(item.id)}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            −
                          </button>
                          <span className="quantity-value">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="quantity-button"
                            onClick={() => increaseCartQuantity(item.id)}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="cart-item-actions">
                        <p className="cart-item-price">
                          {item.price * item.quantity} LE
                        </p>
                        <button
                          type="button"
                          className="cart-remove"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-settings">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={giftWrap}
                      onChange={(e) => setGiftWrap(e.target.checked)}
                    />
                    Premium Gift Wrapping (+50 LE)
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={giftMessageEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setGiftMessageEnabled(enabled);
                        if (!enabled) {
                          setGiftMessage("");
                        }
                      }}
                    />
                    Add a gift message (+10 LE)
                  </label>
                  {giftMessageEnabled && (
                    <label className="admin-label gift-message-label">
                      <textarea
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        className="admin-textarea"
                        placeholder="Write a custom note for the recipient"
                      />
                    </label>
                  )}
                </div>

                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>{cartTotal} LE</span>
                  </div>
                  {giftWrap && (
                    <div className="summary-row">
                      <span>Gift Wrapping</span>
                      <span>50 LE</span>
                    </div>
                  )}
                  {giftMessageEnabled && (
                    <div className="summary-row">
                      <span>Gift message</span>
                      <span>10 LE</span>
                    </div>
                  )}
                  <div className="summary-row total-row">
                    <span>Total</span>
                    <span>{finalTotal} LE</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button full-width"
                  onClick={handleCheckoutClick}
                >
                  Proceed to Checkout
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showWishlist && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="cart-panel wishlist-panel">
            <div className="panel-header">
              <div>
                <p className="panel-title">My Wishlist</p>
                <p className="panel-subtitle">Saved gifts you love</p>
              </div>
              <button
                type="button"
                className="panel-close"
                onClick={() => setShowWishlist(false)}
              >
                <X size={24} />
              </button>
            </div>

            {wishlistItems.length === 0 ? (
              <p className="empty-state">
                Your wishlist is empty. Add gifts to your wishlist to save them
                for later.
              </p>
            ) : (
              <div className="cart-items">
                {wishlistItems.map((product) => (
                  <div key={product.id} className="cart-item">
                    <div>
                      <p className="cart-item-name">{product.name}</p>
                      <p className="cart-item-meta">{product.price} LE</p>
                      <p className="order-summary-text">{product.category}</p>
                    </div>
                    <div className="cart-item-actions">
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() => toggleWishlist(product.id)}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        className="primary-button small"
                        onClick={() => {
                          addToCart(product, 1);
                          toggleWishlist(product.id);
                          setShowWishlist(false);
                          setShowCart(true);
                        }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

      {showCheckout && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowCheckout(false)}
            >
              <X size={24} />
            </button>
            <h2 className="modal-title">Checkout</h2>
            <div className="order-summary">
              <p className="summary-label">Order Total</p>
              <p className="summary-value">{finalTotal} LE</p>
            </div>

            <section className="checkout-items">
              <h3 className="checkout-section-title">Your Cart</h3>
              {cart.length === 0 ? (
                <p className="empty-state">No items in cart.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="checkout-item">
                    <div>
                      <p className="cart-item-name">{item.name}</p>
                      <p className="cart-item-meta">{item.price} LE each</p>
                    </div>
                    <div className="checkout-item-actions">
                      <div className="cart-item-quantity">
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() => decreaseCartQuantity(item.id)}
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          −
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() => increaseCartQuantity(item.id)}
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <p className="cart-item-price">
                        {item.price * item.quantity} LE
                      </p>
                      <button
                        type="button"
                        className="cart-remove"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>

            <div className="payment-options">
              {[
                // { value: "fawry", label: "🔵 Fawry", note: "Most Popular" },
                // { value: "vodafone", label: "📱 Vodafone Cash" },
                // { value: "bank", label: "🏦 Bank Transfer" },
                { value: "cod", label: "💵 Cash on Delivery" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`payment-option ${paymentMethod === option.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    value={option.value}
                    checked={paymentMethod === option.value}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>{option.label}</span>
                  {option.note && (
                    <span className="payment-note">{option.note}</span>
                  )}
                </label>
              ))}
            </div>

            <div className="payment-hint">
              {paymentMethod === "fawry" &&
                "✓ Pay at any Fawry outlet or online."}
              {paymentMethod === "vodafone" &&
                "✓ Transfer funds via Vodafone Cash app."}
              {paymentMethod === "bank" &&
                "✓ Bank transfer details will be sent via email."}
              {paymentMethod === "cod" && "✓ Pay when your order is delivered."}
            </div>

            <button
              type="button"
              className="complete-order-button"
              onClick={createOrder}
              disabled={cart.length === 0}
            >
              <Check size={22} />
              Complete Order
            </button>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-column">
            <h4>Contact</h4>
            {/* <p>📍 Gamal Abd ElNasser, Cairo</p> */}
            <p>
              📧 <a href="mailto:giftoo.storee@gmail.com">giftoo.storee@gmail.com</a>
            </p>
            {/* <p>
              📱 <a href="tel:+201234567890">+201234567890</a>
            </p> */}
          </div>
          <div className="footer-column">
            <h4>Payment Methods</h4>
            {/* <p>🔵 Fawry</p> */}
            {/* <p>📱 Vodafone Cash</p> */}
            {/* <p>🏦 Bank Transfer</p> */}
            <p>💵 COD</p>
          </div>
          <div className="footer-column">
            <h4>Social Media</h4>
            <p>
              <a href="https://facebook.com/giftoo.storee" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                Facebook
              </a>
            </p>
            <p>
              <a href="https://instagram.com/giftoo.storee" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                Instagram
              </a>
            </p>
            <p>
              <a href="https://tiktok.com/@giftoo.storee" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                TikTok
              </a>
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 GIFTO. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default GIFTOWebsite;
