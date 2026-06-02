import React from "react";
import { X, Upload } from "lucide-react";

const ManageInventory = ({
  products,
  newProduct,
  setNewProduct,
  editingProduct,
  setEditingProduct,
  uploadingImage,
  handleImageUpload,
  handleAddProduct,
  handleStartEditProduct,
  handleCancelEditProduct,
  handleUpdateProduct,
  handleDeleteProduct,
}) => {
  return (
    <section className="admin-section">
      <div className="section-title-row centered">
        <div>
          <h2>Manage Inventory</h2>
        </div>
      </div>

      <div className="admin-inventory-grid">
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
    </section>
  );
};

export default ManageInventory;
