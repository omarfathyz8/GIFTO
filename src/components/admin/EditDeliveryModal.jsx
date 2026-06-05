import React from "react";
import { X } from "lucide-react";

const EditDeliveryModal = ({
  editingDeliveryTime,
  setEditingDeliveryTime,
  deliveryTimeInput,
  setDeliveryTimeInput,
  updateDeliveryTime,
}) => {
  if (!editingDeliveryTime) return null;

  const handleClose = () => {
    setEditingDeliveryTime(null);
    setDeliveryTimeInput("");
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <button
          type="button"
          className="modal-close"
          onClick={handleClose}
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
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDeliveryModal;
