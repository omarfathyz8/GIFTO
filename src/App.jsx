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
import { sendOrderEmail, submitToGoogleForms, sendAdminNotification, sendCancellationEmail, sendCancellationAdminNotification, markOrderAsCancelledInSheet, sendRequestConfirmationEmail, sendRequestAdminNotification } from "./services/notifications";
import AdminDashboard from "./components/admin/AdminDashboard";
import "./App.css";

const GIFTOWebsite = () => {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [giftBag, setGiftBag] = useState(false);
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
    colors: {},
    emoji: "",
    description: "",
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [showProfile, setShowProfile] = useState(false);
  const [selectedColors, setSelectedColors] = useState({});
  const [newColorName, setNewColorName] = useState("");
  const [editingColorName, setEditingColorName] = useState("");
  const [newProductColorName, setNewProductColorName] = useState("");
  const [editingProfile, setEditingProfile] = useState(null);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    itemName: "",
    category: "",
    description: "",
    email: "",
    budgetMin: "",
    budgetMax: "",
  });
  const [showTrackRequest, setShowTrackRequest] = useState(false);
  const [trackingEmail, setTrackingEmail] = useState("");
  const [trackedRequests, setTrackedRequests] = useState([]);
  const [trackingSearched, setTrackingSearched] = useState(false);
  const [searchedEmail, setSearchedEmail] = useState("");
  const [showBudgetFilter, setShowBudgetFilter] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");

  const categories = [
    "All",
    "Wallets",
    "Watches",
    "Medals",
    "Flowers",
    "Accessories",
    "Notebooks",
    "Mugs",
    "Tech Accessories",
    "Sets",
  ];

  const colorMap = {
    "black": "#000000",
    "blue": "#0000ff",
    "brown": "#a52a2a",
    "cafe": "#c29567",
    "cherry": "#de3163",
    "coral": "#ff7f50",
    "cream": "#fffdd0",
    "cyan": "#4ea1d5",
    "dark brown": "#3e2723",
    "dark green": "#1b5e20",
    "gold": "#ffd700",
    "gray": "#808080",
    "grey": "#808080",
    "green": "#008000",
    "ivory": "#fffff0",
    "lavender": "#8778b8",
    "mint": "#98ff98",
    "mint green": "#98ff98",
    "navy": "#010157",
    "off-white": "#f5f1ed",
    "orange": "#ff8800",
    "pink": "#ffb6c1",
    "purple": "#800080",
    "red": "#ff0000",
    "rose": "#f894c3",
    "silver": "#c0c0c0",
    "teal": "#008080",
    "white": "#ffffff",
    "wood": "#dfbf8f",
    "yellow": "#ffff00",
  };

  const getColorValue = (colorName) => {
    const lower = colorName.toLowerCase();
    return colorMap[lower] || lower;
  };

  const isAdmin = user?.email === "giftoo.storee@gmail.com";
  const isGuest = !user;
  const canUseCart = Boolean(user);
  const wishlistItems = products.filter((product) => {
    const colorNames = Object.keys(product.colors || {});
    return colorNames.some((color) => wishlists.has(`${color} ${product.name}`));
  });

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
        const savedKeys = Object.keys(value).filter((key) => value[key] !== null && value[key] !== undefined);
        setWishlists(new Set(savedKeys));
      },
      (error) => {
        console.error("Wishlist error:", error);
      },
    );

    return () => unsubscribe();
  }, [user, products]);

  useEffect(() => {
    if (!user) {
      setCartLoaded(false);
      return undefined;
    }

    const cartRef = dbRef(db, `users/${user.uid}/cart`);
    const unsubscribe = onValue(
      cartRef,
      (snapshot) => {
        const value = snapshot.val();
        if (value && Array.isArray(value)) {
          setCart(value);
        } else if (!value) {
          setCart([]);
        }
        setCartLoaded(true);
      },
      (error) => {
        console.error("Cart load error:", error);
        setCartLoaded(true);
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

  useEffect(() => {
    if (!user || !cartLoaded) return;

    const timer = setTimeout(() => {
      const cartRef = dbRef(db, `users/${user.uid}/cart`);
      set(cartRef, cart.length > 0 ? cart : null);
    }, 500);

    return () => clearTimeout(timer);
  }, [cart, user, cartLoaded]);

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
            ordersCount: 0,
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
    setCart([]);
    setWishlists(new Set());
    setShowProfile(false);
  };

  const handleStartEditProfile = () => {
    if (userProfile) {
      setEditingProfile({ ...userProfile });
    }
  };

  const handleCancelEditProfile = () => {
    setEditingProfile(null);
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setToast(null);

    if (!user || !editingProfile) {
      showToast("Unable to update profile.", "error");
      return;
    }

    if (!editingProfile.name || !editingProfile.address || !editingProfile.phone) {
      showToast("Name, address, and phone are required.", "error");
      return;
    }

    try {
      const userRef = dbRef(db, `users/${user.uid}`);
      await update(userRef, {
        name: editingProfile.name,
        address: editingProfile.address,
        phone: editingProfile.phone,
      });
      showToast("Profile updated successfully.", "success");
      setEditingProfile(null);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const calculateDeliveryTime = (createdAt) => {
    const date = new Date(createdAt);
    const daysToAdd = date.getHours() < 10 ? 3 : 4;
    date.setDate(date.getDate() + daysToAdd);
    date.setHours(10, 0, 0, 0);
    return date.getTime();
  };

  const handleCheckoutClick = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setShowCart(false);
    setShowCheckout(true);
  };

  const updateCartQuantity = (productId, delta = 0, newQuantity = null, selectedColor = null) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId && item.selectedColor === selectedColor
            ? { ...item, quantity: newQuantity ?? item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const increaseCartQuantity = (productId, selectedColor = null) => {
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) return;
    const cartItem = cart.find((item) => item.id === productId && item.selectedColor === selectedColor);
    const available = getAvailableInventory(product, selectedColor);
    if (available === 0) {
      showToast("Not enough inventory available.", "error");
      return;
    }
    updateCartQuantity(productId, 1, null, selectedColor);
  };

  const decreaseCartQuantity = (productId, selectedColor = null) => updateCartQuantity(productId, -1, null, selectedColor);

  const getProductQuantity = (productId) => {
    return productQuantities[productId] || 1;
  };
  const getCartQuantity = (productId, selectedColor = null) => cart.find((item) => String(item.id) === String(productId) && item.selectedColor === selectedColor)?.quantity || 0;
  const getInventory = (product, selectedColor = null) => {
    if (!product || !selectedColor) return 0;
    const colors = product.colors || {};
    const colorData = colors[selectedColor];
    if (!colorData) return 0;
    return Number.isFinite(Number(colorData.stock)) ? Number(colorData.stock) : 0;
  };
  const getAvailableInventory = (product, selectedColor = null) => {
    if (!product || !selectedColor) return 0;
    const inventory = getInventory(product, selectedColor);
    const cartQty = getCartQuantity(product.id, selectedColor);
    return Math.max(inventory - cartQty, 0);
  };

  const updateProductQuantity = (productId, delta, product = null) => {
    const current = getProductQuantity(productId);
    const newQty = Math.max(current + delta, 0);
    const selectedColor = selectedColors[productId] || (product ? Object.keys(product.colors || {})[0] : null);
    const available = product ? getAvailableInventory(product, selectedColor) : Infinity;
    if (newQty > available) return;

    setProductQuantities((prev) => ({ ...prev, [productId]: newQty }));
  };

  const incrementProductQuantity = (product) => updateProductQuantity(product.id, 1, product);
  const decrementProductQuantity = (productId) => updateProductQuantity(productId, -1);

  const addToCart = (product, quantity = 1) => {
    const selectedColor = selectedColors[product.id] || Object.keys(product.colors || {})[0] || "Default";
    const available = getAvailableInventory(product, selectedColor);
    if (available === 0) {
      showToast("Wait for a restock soon OR request it.", "error");
      return;
    }
    const quantityToAdd = Math.min(quantity, available);
    const cartItemKey = `${product.id}_${selectedColor}`;
    const existingItem = cart.find((item) => item.id === product.id && item.selectedColor === selectedColor);
    if (existingItem) {
      setCart((currentCart) =>
        currentCart.map((item) =>
          item.id === product.id && item.selectedColor === selectedColor
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item,
        ),
      );
    } else {
      setCart((currentCart) => [
        ...currentCart,
        { ...product, quantity: quantityToAdd, selectedColor },
      ]);
    }
  };

  const removeFromCart = (productId, selectedColor = null) => {
    setCart((currentCart) =>
      currentCart.filter((item) => !(item.id === productId && item.selectedColor === selectedColor)),
    );
  };

  const toggleWishlist = async (productId, selectedColor = null) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const color = selectedColor || selectedColors[productId] || Object.keys(product.colors || {})[0];
    const wishlistKey = `${color} ${product.name}`;
    const isWishlisted = wishlists.has(wishlistKey);
    const updatedWishlist = new Set(wishlists);

    if (isWishlisted) {
      updatedWishlist.delete(wishlistKey);
    } else {
      updatedWishlist.add(wishlistKey);
    }

    setWishlists(updatedWishlist);

    if (user) {
      await set(dbRef(db, `users/${user.uid}/wishlist/${color} ${product.name}`), isWishlisted ? null : { color });
    }
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const giftBagFee = giftBag ? 20 : 0;
  const giftMessageFee = giftMessageEnabled ? 10 : 0;
  const shippingFee = 40;
  const finalTotal = cartTotal + giftBagFee + giftMessageFee + shippingFee;

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
    const fullName = userProfile?.name || "GUEST";
    if (fullName === "GUEST") return fullName;
    const nameParts = fullName.trim().split(/\s+/);
    return nameParts.length >= 2
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
      : fullName;
  };

  const showToast = (message, type = "success") => {
    if (!message) return;
    setToast({ message, type });
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
          const currentColor = colors[colorName];
          const currentImages = Array.isArray(currentColor) ? currentColor : (currentColor?.images || []);
          const currentStock = currentColor?.stock ?? 0;
          colors[colorName] = { images: [...currentImages, ...newImages], stock: currentStock };
        }
        return { ...prev, colors };
      });
    } else {
      setNewProduct((prev) => {
        const colors = { ...prev.colors };
        if (colorName) {
          const currentColor = colors[colorName];
          const currentImages = Array.isArray(currentColor) ? currentColor : (currentColor?.images || []);
          const currentStock = currentColor?.stock ?? 0;
          colors[colorName] = { images: [...currentImages, ...newImages], stock: currentStock };
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

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

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

    if (Object.keys(newProduct.colors).length === 0) {
      showToast("Add at least one color with images.", "error");
      return;
    }

    const productRef = push(dbRef(db, "products"));
    await set(productRef, {
      ...newProduct,
      id: Date.now(),
      price: Number(newProduct.price),
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
        const selectedColor = item.selectedColor;
        if (selectedColor && product.colors && product.colors[selectedColor]) {
          const currentStock = Number(product.colors[selectedColor].stock) || 0;
          const newStock = currentStock + item.quantity;
          await update(dbRef(db, `products/${product.dbKey}/colors/${selectedColor}`), {
            stock: newStock,
          });
        }
      }}

    sendCancellationEmail(order, user.email);
    sendCancellationAdminNotification(order, user.email);
    markOrderAsCancelledInSheet(order.id);

    showToast("Your order has been canceled.", "success");
  };

  const handleSubmitRequest = async (event) => {
    event.preventDefault();
    setToast(null);

    const finalEmail = requestForm.email || (user?.email || "");
    if (!requestForm.itemName || !finalEmail) {
      showToast("Item name and email are required.", "error");
      return;
    }

    try {
      const requestRef = push(dbRef(db, "requests"));
      const requestData = {
        itemName: requestForm.itemName,
        category: requestForm.category,
        description: requestForm.description,
        email: finalEmail,
        budgetMin: requestForm.budgetMin ? Number(requestForm.budgetMin) : null,
        budgetMax: requestForm.budgetMax ? Number(requestForm.budgetMax) : null,
        userId: user?.uid || null,
        createdAt: serverTimestamp(),
        status: "pending",
      };

      await set(requestRef, requestData);

      sendRequestConfirmationEmail(requestData);
      sendRequestAdminNotification(requestData);

      setRequestForm({
        itemName: "",
        category: "",
        description: "",
        email: "",
        budgetMin: "",
        budgetMax: "",
      });
      setShowRequestForm(false);
      showToast("Thank you! Your request has been submitted.", "success");
    } catch (error) {
      showToast("Failed to submit request. Please try again.", "error");
    }
  };

  const handleTrackRequest = (event) => {
    event.preventDefault();
    setToast(null);

    if (!trackingEmail) {
      showToast("Please enter your email to track requests.", "error");
      return;
    }

    setSearchedEmail(trackingEmail);
    setTrackingSearched(true);
  };

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
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        if (trackingSearched && searchedEmail) {
          const matching = loadedRequests.filter(
            (request) => request.email?.toLowerCase() === searchedEmail.toLowerCase()
          );
          setTrackedRequests(matching);
        }
      },
      (error) => {
        console.error("Firebase requests error:", error);
      },
    );

    return () => unsubscribe();
  }, [trackingSearched, searchedEmail]);

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
    const currentTime = Date.now();
    const deliveryTime = calculateDeliveryTime(currentTime);
    const orderId = `ORDER_${currentTime.toString().slice(-8)}`;

    const orderData = {
      id: orderId,
      userId: user.uid,
      name: userProfile?.name || "",
      address: userProfile?.address || "",
      phone: userProfile?.phone || "",
      items: cart,
      total: finalTotal,
      paymentMethod,
      giftBag,
      cardMessage: giftMessage,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deliveryTime,
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

    try {
      const userRef = dbRef(db, `users/${user.uid}`);
      const snapshot = await new Promise((resolve) => {
        onValue(userRef, (snap) => resolve(snap.val()), { once: true });
      });
      const currentCount = snapshot?.ordersCount || 0;
      await update(userRef, {
        ordersCount: currentCount + 1,
      });
    } catch (error) {
      console.error("Error updating orders count:", error);
    }

    for (const item of cart) {
      const product = products.find((p) => p.id === item.id);
      if (product && product.dbKey) {
        const selectedColor = item.selectedColor;
        if (selectedColor && product.colors && product.colors[selectedColor]) {
          const currentStock = Number(product.colors[selectedColor].stock) || 0;
          const newStock = Math.max(currentStock - item.quantity, 0);
          await update(dbRef(db, `products/${product.dbKey}/colors/${selectedColor}`), {
            stock: newStock,
          });
        }
      }
    }

    setCart([]);
    setShowCheckout(false);
    setGiftMessage("");
    setGiftBag(false);
    setPaymentMethod("cod");
    showToast("Your order has been placed successfully.", "success");
  };

  const itemCounts = {};
  allOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    }
  });

  const bestSellerName = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const filteredProducts = products
    .filter((product) => {
      const query = searchQuery.toLowerCase();
      const productCat = product.category.toLowerCase();
      const matchesSearch = (
        product.name.toLowerCase().includes(query) ||
        productCat === query
      );
      const matchesBudget = !budgetLimit || product.price <= Number(budgetLimit);
      return matchesSearch && matchesBudget;
    })
    .sort((a, b) => {
      if (a.name === bestSellerName) return -1;
      if (b.name === bestSellerName) return 1;
      return (b.id || 0) - (a.id || 0);
    });

  const selectedCategory = categories.includes(searchQuery)
    ? searchQuery
    : "All";

  if (isAdmin) {
    return <AdminDashboard user={user} handleSignOut={handleSignOut} categories={categories} />;
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <img src={logoImage} alt="GIFTO Logo" className="brand-logo" />
            <div>
              <p className="brand-title">GIFTO</p>
              <p className="brand-subtitle">Make it special ✨</p>
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
                <button
                  type="button"
                  className="profile-button small"
                  onClick={() => setShowProfile(true)}
                >
                  {getUserDisplayName(user)}
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
              {user && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => window.location.href = "#MyOrders"}
                >
                  My Orders
                </button>
              )}
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowBudgetFilter(true)}
              >
                Set Budget
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowRequestForm(true)}
              >
                Specific Request
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowTrackRequest(true);
                  setTrackingEmail("");
                  setTrackedRequests([]);
                  setTrackingSearched(false);
                }}
              >
                Track Requests
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
            (() => {
              const bestSellerName = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

              return filteredProducts.map((product) => {
                const colors = product.colors || {};
                const colorNames = Object.keys(colors);
                const selectedColor = selectedColors[product.id] || colorNames[0];
                const colorData = colors[selectedColor];
                const images = (colorData?.images || []);
                const currentIdx = currentImageIndex[product.id] || 0;
                const currentImage = images[currentIdx];
                const isBestSeller = product.name === bestSellerName;

                return (
                <article key={product.id} className="product-card">
                  <div className="product-image-wrapper">
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
                    {colorNames.length > 0 && (
                      <div className="color-circles">
                        {colorNames.map((colorName) => (
                          <button
                            key={colorName}
                            type="button"
                            className={`color-circle ${selectedColor === colorName ? "active" : ""}`}
                            onClick={() => setSelectedColors((prev) => ({ ...prev, [product.id]: colorName }))}
                            title={colorName}
                            style={{
                              backgroundColor: getColorValue(colorName),
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                <div className="product-body">
                  <p className="product-category">{product.category}</p>
                  <div className="product-title-wrapper">
                    <h2 className="product-title">{product.name}</h2>
                    {isBestSeller && <span className="best-seller-badge">Best Seller</span>}
                  </div>
                  <p className="product-description">{product.description}</p>
                  <div className="product-meta">
                    <span className="product-price">{product.price} LE</span>
                    {getAvailableInventory(product, selectedColor) > 5 ? null : (
                      <span
                        className={`stock-status ${
                          getAvailableInventory(product, selectedColor) === 0
                            ? "stock-out"
                            : "stock-low"
                        }`}
                      >
                        {getAvailableInventory(product, selectedColor) === 0
                          ? "Out of stock"
                          : `Only ${getAvailableInventory(product, selectedColor)} left`}
                      </span>
                    )}
                    {canUseCart && (
                      <button
                        type="button"
                        className="wishlist-button"
                        onClick={() => toggleWishlist(product.id, selectedColor || colorNames[0])}
                        aria-label={
                          wishlists.has(`${selectedColor || colorNames[0]} ${product.name}`)
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                      >
                        <Heart
                          size={20}
                          fill={
                            wishlists.has(`${selectedColor || colorNames[0]} ${product.name}`)
                              ? "#f43f5e"
                              : "none"
                          }
                          color={
                            wishlists.has(`${selectedColor || colorNames[0]} ${product.name}`)
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
                          disabled={getProductQuantity(product.id) <= 1 || getAvailableInventory(product, selectedColor) === 0}
                        >
                          −
                        </button>
                        <span className="quantity-value">
                          {getAvailableInventory(product, selectedColor) === 0 ? 0 : getProductQuantity(product.id)}
                        </span>
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() => incrementProductQuantity(product)}
                          aria-label={`Increase quantity of ${product.name}`}
                          disabled={
                            getProductQuantity(product.id) >=
                            getAvailableInventory(product, selectedColor)
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
                      >
                        Add to Cart
                      </button>
                    </div>
                  )}
                </div>
              </article>
              );
              });
            })()
          )}
        </section>

        {user && (
          <section className="orders-section">
            <div className="section-title-row">
              <div>
                <p className="eyebrow" id="MyOrders">Your order history</p>
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
                        Placed on {formatTimestamp(order.createdAt)}
                      </p>
                      {order.status !== "cancelled" && (
                        <p className="order-meta">
                          {order.status === "delivered" ? "Delivered" : "Delivery"} on {formatTimestamp(order.deliveryTime || calculateDeliveryTime(order.createdAt))}
                        </p>
                      )}
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
                    Gift bag: {order.giftBag ? "Yes" : "No"}
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
                  {cart.map((item) => {
                    const product = products.find((p) => String(p.id) === String(item.id));
                    const available = getAvailableInventory(product, item.selectedColor);
                    return (
                    <div key={`${item.id}_${item.selectedColor}`} className="cart-item">
                      <div>
                        <p className="cart-item-name">{item.selectedColor} {item.name}</p>
                        <p className="cart-item-meta">{item.price} LE each</p>
                        <div className="cart-item-quantity">
                          <button
                            type="button"
                            className="quantity-button"
                            onClick={() => decreaseCartQuantity(item.id, item.selectedColor)}
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
                            onClick={() => {
                              if (available === 0) {
                                showToast("Not enough inventory available.", "error");
                                return;
                              }
                              increaseCartQuantity(item.id, item.selectedColor);
                            }}
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
                          onClick={() => removeFromCart(item.id, item.selectedColor)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="cart-settings">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={giftBag}
                      onChange={(e) => setGiftBag(e.target.checked)}
                    />
                    Gift Bag (+20 LE)
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
                    Gift Message (+10 LE)
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
                  {giftBag && (
                    <div className="summary-row">
                      <span>Gift Bag</span>
                      <span>20 LE</span>
                    </div>
                  )}
                  {giftMessageEnabled && (
                    <div className="summary-row">
                      <span>Gift message</span>
                      <span>10 LE</span>
                    </div>
                  )}
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span>40 LE</span>
                  </div>
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
                {wishlistItems.map((product) => {
                  const colorNames = Object.keys(product.colors || {});
                  return colorNames
                    .filter((color) => wishlists.has(`${color} ${product.name}`))
                    .map((color) => (
                      <div key={`${color} ${product.name}`} className="cart-item">
                        <div>
                          <p className="cart-item-name">{color} {product.name}</p>
                          <p className="cart-item-meta">{product.price} LE</p>
                          <p className="order-summary-text">{product.category}</p>
                        </div>
                        <div className="cart-item-actions">
                          <button
                            type="button"
                            className="secondary-button small"
                            onClick={() => toggleWishlist(product.id, color)}
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            className="primary-button small"
                            onClick={() => {
                              const available = getAvailableInventory(product, color);
                              if (available === 0) {
                                showToast("Wait for a restock soon OR request it.", "error");
                                return;
                              }
                              setSelectedColors((prev) => ({ ...prev, [product.id]: color }));
                              addToCart(product, 1);
                              toggleWishlist(product.id, color);
                              setShowWishlist(false);
                              setShowCart(true);
                            }}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    ));
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal-card modal-scrollable">
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
                    <p style={{ fontSize: "12px", marginBottom: "8px" }}>
                      {editingProduct.colors[colorName]?.length || 0} image{editingProduct.colors[colorName]?.length !== 1 ? "s" : ""}
                    </p>
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
                            colors: { ...editingProduct.colors, [editingColorName]: [] },
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

      {showProfile && user && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowProfile(false)}
            >
              <X size={24} />
            </button>
            <h2 className="modal-title">My Profile</h2>
            {editingProfile ? (
              <form className="auth-form" onSubmit={handleUpdateProfile}>
                <label className="auth-label">
                  Full name
                  <input
                    type="text"
                    value={editingProfile.name || ""}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </label>
                <label className="auth-label">
                  Address
                  <textarea
                    value={editingProfile.address || ""}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        address: e.target.value,
                      })
                    }
                    required
                  />
                </label>
                <label className="auth-label">
                  Phone number
                  <input
                    type="tel"
                    value={editingProfile.phone || ""}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        phone: e.target.value,
                      })
                    }
                    required
                  />
                </label>
                <div className="profile-form-actions">
                  <button type="submit" className="primary-button full-width">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="secondary-button full-width"
                    onClick={handleCancelEditProfile}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-display">
                <div className="profile-field">
                  <p className="profile-label">Full name</p>
                  <p className="profile-value">{userProfile?.name || "—"}</p>
                </div>
                <div className="profile-field">
                  <p className="profile-label">Email</p>
                  <p className="profile-value">{userProfile?.email || "—"}</p>
                </div>
                <div className="profile-field">
                  <p className="profile-label">Address</p>
                  <p className="profile-value">{userProfile?.address || "—"}</p>
                </div>
                <div className="profile-field">
                  <p className="profile-label">Phone number</p>
                  <p className="profile-value">{userProfile?.phone || "—"}</p>
                </div>
                <div className="profile-field">
                  <p className="profile-label">Orders Made</p>
                  <p className="profile-value">{userProfile?.ordersCount ? userProfile.ordersCount : "No orders yet"}</p>
                </div>
                <div className="profile-field">
                  <p className="profile-label">Member since</p>
                  <p className="profile-value">
                    {formatTimestamp(userProfile?.createdAt)}
                  </p>
                </div>
                <div className="profile-actions">
                  <button
                    type="button"
                    className="primary-button full-width"
                    onClick={handleStartEditProfile}
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    className="secondary-button full-width"
                    onClick={() => {
                      setShowProfile(false);
                      handleSignOut();
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showRequestForm && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowRequestForm(false)}
            >
              <X size={24} />
            </button>
            <h2 className="modal-title">✨ We'd Love to Know!</h2>
            <p className="modal-subtitle">What are you dreaming of, and we'll make it special for you.</p>
            <form className="auth-form" onSubmit={handleSubmitRequest}>
              <label className="auth-label">
                Item name
                <input
                  type="text"
                  value={requestForm.itemName}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      itemName: e.target.value,
                    })
                  }
                  placeholder="e.g., Leather wallet in Navy blue"
                  required
                />
              </label>
              <label className="auth-label">
                Category
                <input
                  type="text"
                  value={requestForm.category}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      category: e.target.value,
                    })
                  }
                  placeholder="New Category or Existing"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.filter((c) => c !== "All").map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </label>
              <label className="auth-label">
                Description (optional)
                <textarea
                  value={requestForm.description}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Tell us more details about what you're looking for..."
                  className="auth-input"
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label className="auth-label">
                  Budget Min (LE)
                  <input
                    type="number"
                    min="0"
                    value={requestForm.budgetMin}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        budgetMin: e.target.value,
                      })
                    }
                    placeholder="e.g., 100"
                  />
                </label>
                <label className="auth-label">
                  Budget Max (LE)
                  <input
                    type="number"
                    min="0"
                    value={requestForm.budgetMax}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        budgetMax: e.target.value,
                      })
                    }
                    placeholder="e.g., 500"
                  />
                </label>
              </div>
              {!user && (
                <label className="auth-label">
                  Email
                  <input
                    type="email"
                    value={requestForm.email}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        email: e.target.value,
                      })
                    }
                    placeholder="your@email.com"
                    required
                  />
                </label>
              )}
              <button type="submit" className="primary-button full-width">
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}

      {showTrackRequest && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setShowTrackRequest(false);
                setTrackingEmail("");
                setTrackedRequests([]);
                setTrackingSearched(false);
                setSearchedEmail("");
              }}
            >
              <X size={24} />
            </button>
            <h2 className="modal-title">Track Your Request</h2>

            {trackedRequests.length === 0 && (
              <>
                <p className="modal-subtitle">Enter your email to check the status of your requests</p>
                <form className="auth-form" onSubmit={handleTrackRequest}>
                  <label className="auth-label">
                    Email
                    <input
                      type="email"
                      value={trackingEmail}
                      onChange={(e) => setTrackingEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </label>
                  <button type="submit" className="primary-button full-width">
                    Search Requests
                  </button>
                </form>

                {trackingSearched && (
                  <p className="empty-state">No requests found for this email.</p>
                )}
              </>
            )}

            {trackedRequests.length > 0 && (
              <>
              <br />
                <div className="requests-list">
                  {trackedRequests.map((request, index) => (
                    <article key={request.dbKey} className="request-card">
                      <div className="request-card-header">
                        <div>
                          <p className="request-label">Request {index + 1}: {request.itemName}</p>
                          <p className="request-meta">
                            Submitted {formatTimestamp(request.createdAt)}
                          </p>
                          {(request.budgetMin !== null && request.budgetMin !== undefined && request.budgetMin !== "") || (request.budgetMax !== null && request.budgetMax !== undefined && request.budgetMax !== "") ? (
                            <p className="request-meta">
                              Budget: {request.budgetMin || "—"} - {request.budgetMax || "—"} LE
                            </p>
                          ) : null}
                          {request.description && (
                            <p className="request-description">{request.description}</p>
                          )}
                        </div>
                        <span
                          className={`order-status status-${request.status || "pending"}`}
                        >
                          {request.status || "pending"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showBudgetFilter && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setShowBudgetFilter(false);
                setBudgetInput("");
              }}
            >
              <X size={24} />
            </button>
            <h2 className="modal-title">Set Your Budget</h2>
            <p className="modal-subtitle">Filter items by maximum price</p>
            <form
              className="auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                setBudgetLimit(budgetInput);
                setShowBudgetFilter(false);
              }}
            >
              <label className="auth-label">
                Maximum Price (LE)
                <input
                  type="number"
                  min="0"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="e.g., 500"
                  required
                />
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" className="primary-button full-width">
                  Apply Budget
                </button>
                <button
                  type="button"
                  className="secondary-button full-width"
                  onClick={() => {
                    setBudgetLimit("");
                    setBudgetInput("");
                    setShowBudgetFilter(false);
                  }}
                >
                  Clear Filter
                </button>
              </div>
            </form>
            {budgetLimit && (
              <p style={{ marginTop: "16px", textAlign: "center", color: "#666" }}>
                Showing items up to {budgetLimit} LE
              </p>
            )}
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
                cart.map((item) => {
                  const product = products.find((p) => String(p.id) === String(item.id));
                  const available = getAvailableInventory(product, item.selectedColor);
                  return (
                  <div key={`${item.id}_${item.selectedColor}`} className="checkout-item">
                    <div>
                      <p className="cart-item-name">{item.name}</p>
                      {item.selectedColor && <p className="cart-item-meta">Color: {item.selectedColor}</p>}
                      <p className="cart-item-meta">{item.price} LE each</p>
                    </div>
                    <div className="checkout-item-actions">
                      <div className="cart-item-quantity">
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() => decreaseCartQuantity(item.id, item.selectedColor)}
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          −
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() => {
                            if (available === 0) {
                              showToast("Not enough inventory available.", "error");
                              return;
                            }
                            increaseCartQuantity(item.id, item.selectedColor);
                          }}
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
                        onClick={() => removeFromCart(item.id, item.selectedColor)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  );
                })
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
              <a href="https://www.facebook.com/profile.php?id=61590815960981" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
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
