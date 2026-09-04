import React from "react";
import { X } from "lucide-react";

const EditProductModal = ({
  editingProduct,
  setEditingProduct,
  uploadingImage,
  handleImageUpload,
  handleUpdateProduct,
  handleCancelEditProduct,
  editingColorName,
  setEditingColorName,
  newRatingInput,
  setNewRatingInput,
  handleAddRating,
}) => {
  if (!editingProduct) return null;

  return (
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
            Old Price (LE) - Optional
            <input
              type="number"
              value={editingProduct.oldPrice || ""}
              onChange={(e) =>
                setEditingProduct({
                  ...editingProduct,
                  oldPrice: e.target.value === "" ? null : e.target.value,
                })
              }
              className="admin-input"
            />
          </label>
          <label className="admin-label">
            Current rating
            <input
              type="text"
              value={
                editingProduct.rating
                  ? `${Number(editingProduct.rating).toFixed(1)} ★ (${editingProduct.ratingCount || 0} reviews)`
                  : "No reviews yet"
              }
              disabled
              className="admin-input"
            />
          </label>
          <label className="admin-label">
            Add a new rating (1-5)
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={newRatingInput}
                onChange={(e) => setNewRatingInput(e.target.value)}
                className="admin-input"
              />
              <button
                type="button"
                className="primary-button small"
                onClick={handleAddRating}
              >
                Add Rating
              </button>
            </div>
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
                <label className="admin-label" style={{ marginBottom: "10px" }}>
                  Stock for {colorName}
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.colors[colorName]?.stock ?? ""}
                    onChange={(e) =>
                      setEditingProduct((prev) => ({
                        ...prev,
                        colors: {
                          ...prev.colors,
                          [colorName]: {
                            ...prev.colors[colorName],
                            stock: e.target.value === "" ? 0 : Number(e.target.value),
                          },
                        },
                      }))
                    }
                    className="admin-input"
                  />
                </label>
                <p style={{ fontSize: "12px", marginBottom: "8px" }}>
                  {Array.isArray(editingProduct.colors[colorName]) ? editingProduct.colors[colorName].length : editingProduct.colors[colorName]?.images?.length || 0} image{(Array.isArray(editingProduct.colors[colorName]) ? editingProduct.colors[colorName].length : editingProduct.colors[colorName]?.images?.length || 0) !== 1 ? "s" : ""}
                </p>
                {editingProduct.colors[colorName]?.images && editingProduct.colors[colorName].images.length > 0 && (
                  <div className="image-preview-list">
                    {editingProduct.colors[colorName].images.map((img, idx) => (
                      <div key={idx} className="image-preview-item">
                        <img src={img} alt={`${colorName} ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              colors: {
                                ...prev.colors,
                                [colorName]: {
                                  ...prev.colors[colorName],
                                  images: prev.colors[colorName].images.filter((_, i) => i !== idx),
                                },
                              },
                            }))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                        colors: {
                          ...editingProduct.colors,
                          [editingColorName]: { images: [], stock: 0 }
                        },
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
  );
};

export default EditProductModal;
