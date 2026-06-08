import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref as dbRef, onValue, set } from "firebase/database";

export const useCart = (user) => {
  const [cart, setCart] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setCartLoaded(false);
      return;
    }

    const cartRef = dbRef(db, `users/${user.uid}/cart`);
    const unsubscribe = onValue(
      cartRef,
      (snapshot) => {
        try {
          const value = snapshot.val();
          if (value && Array.isArray(value)) {
            setCart(value);
          } else if (!value) {
            setCart([]);
          }
          setCartLoaded(true);
        } catch (error) {
          console.error("Error processing cart data:", error);
          setCartLoaded(true);
        }
      },
      (error) => {
        console.error("Cart Firebase error:", error);
        setCartLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !cartLoaded) return;

    const timer = setTimeout(() => {
      const cartRef = dbRef(db, `users/${user.uid}/cart`);
      set(cartRef, cart.length > 0 ? cart : null);
    }, 500);

    return () => clearTimeout(timer);
  }, [cart, user, cartLoaded]);

  const addToCart = (product, quantity = 1, selectedColor) => {
    const cartItemKey = `${product.id}_${selectedColor}`;
    const existingItem = cart.find((item) => item.id === product.id && item.selectedColor === selectedColor);

    if (existingItem) {
      setCart((currentCart) =>
        currentCart.map((item) =>
          item.id === product.id && item.selectedColor === selectedColor
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        ),
      );
    } else {
      setCart((currentCart) => [
        ...currentCart,
        { ...product, quantity, selectedColor },
      ]);
    }
  };

  const removeFromCart = (productId, selectedColor = null) => {
    setCart((currentCart) =>
      currentCart.filter((item) => !(item.id === productId && item.selectedColor === selectedColor)),
    );
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

  return { cart, setCart, cartLoaded, addToCart, removeFromCart, updateCartQuantity };
};
