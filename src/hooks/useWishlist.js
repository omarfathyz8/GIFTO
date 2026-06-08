import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref as dbRef, onValue, set } from "firebase/database";

export const useWishlist = (user, products) => {
  const [wishlists, setWishlists] = useState(new Set());

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
    if (!user) {
      // Don't clear wishlists when user logs out - keep local wishlist
      return;
    }

    const wishlistRef = dbRef(db, `users/${user.uid}/wishlist`);
    const unsubscribe = onValue(
      wishlistRef,
      (snapshot) => {
        try {
          const value = snapshot.val();
          if (value && typeof value === 'object') {
            const savedKeys = Object.keys(value).filter((key) => value[key] !== null && value[key] !== undefined);
            setWishlists(new Set(savedKeys));
          } else {
            // User has no wishlist yet, keep empty
            setWishlists(new Set());
          }
        } catch (error) {
          console.error("Error processing wishlist data:", error);
          setWishlists(new Set());
        }
      },
      (error) => {
        console.error("Wishlist Firebase error:", error);
        // Don't crash, just keep empty wishlist
        setWishlists(new Set());
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

  const toggleWishlist = async (productId, selectedColor = null) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const color = selectedColor || Object.keys(product.colors || {})[0];
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

  const wishlistItems = products.filter((product) => {
    const colorNames = Object.keys(product.colors || {});
    return colorNames.some((color) => wishlists.has(`${color} ${product.name}`));
  });

  return { wishlists, setWishlists, toggleWishlist, wishlistItems };
};
