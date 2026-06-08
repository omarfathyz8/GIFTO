import { useState, useEffect } from "react";

export const useToast = () => {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    if (!message) return;
    setToast({ message, type });
  };

  const dismissToast = () => setToast(null);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  return { toast, showToast, dismissToast };
};
