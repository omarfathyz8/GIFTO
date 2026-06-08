import React from "react";

const Toast = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <div
      className={`toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}
      role="status"
      aria-live="polite"
    >
      <span>{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
