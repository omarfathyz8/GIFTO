import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref as dbRef, onValue } from "firebase/database";

export const useOrders = (user) => {
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const ordersRef = dbRef(db, "orders");
    const unsubscribe = onValue(
      ordersRef,
      (snapshot) => {
        try {
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
        } catch (error) {
          console.error("Error processing orders data:", error);
          setAllOrders([]);
          setOrders([]);
          setLoadingOrders(false);
        }
      },
      (error) => {
        console.error("Firebase orders error:", error);
        setLoadingOrders(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  return { orders, allOrders, setAllOrders, loadingOrders };
};
