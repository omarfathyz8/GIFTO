import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref as dbRef, onValue } from "firebase/database";

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

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
        }
        setLoadingProducts(false);
      },
      (error) => {
        console.error("Firebase products error:", error);
        setLoadingProducts(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { products, setProducts, loadingProducts };
};
