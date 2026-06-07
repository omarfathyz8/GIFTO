import React, { useState } from "react";
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
  categories,
  allOrders = [],
}) => {
  const [newColorName, setNewColorName] = useState("");
  const [editingColorName, setEditingColorName] = useState("");

  const getProductSoldCount = (productName) => {
    let totalSold = 0;
    allOrders.forEach(order => {
      if (order.status === 'delivered' && order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.name === productName) {
            totalSold += item.quantity || 0;
          }
        });
      }
    });
    return totalSold;
  };
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
              <select
                value={newProduct.category}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    category: e.target.value,
                  })
                }
                required
                className="admin-input"
              >
                <option value="">Select a category</option>
                {categories && categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
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
            <div className="admin-label">
              <p style={{ marginBottom: "10px", fontWeight: "600" }}>Product Colors</p>
              {Object.keys(newProduct.colors || {}).map((colorName) => (
                <div key={colorName} style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <p style={{ fontWeight: "500" }}>{colorName}</p>
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() => {
                        const newColors = { ...newProduct.colors };
                        delete newColors[colorName];
                        setNewProduct({ ...newProduct, colors: newColors });
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
                      value={newProduct.colors[colorName]?.stock ?? ""}
                      onChange={(e) =>
                        setNewProduct((prev) => ({
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
                    {Array.isArray(newProduct.colors[colorName]) ? newProduct.colors[colorName].length : newProduct.colors[colorName]?.images?.length || 0} image{(Array.isArray(newProduct.colors[colorName]) ? newProduct.colors[colorName].length : newProduct.colors[colorName]?.images?.length || 0) !== 1 ? "s" : ""}
                  </p>
                  {newProduct.colors[colorName]?.images && newProduct.colors[colorName].images.length > 0 && (
                    <div className="image-preview-list">
                      {newProduct.colors[colorName].images.map((img, idx) => (
                        <div key={idx} className="image-preview-item">
                          <img src={img} alt={`${colorName} ${idx + 1}`} />
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={() =>
                              setNewProduct((prev) => ({
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
                      onChange={(e) => handleImageUpload(e, false, colorName)}
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
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="Color name (e.g., Red, Blue)"
                    className="admin-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="primary-button small"
                    onClick={() => {
                      if (newColorName.trim()) {
                        setNewProduct({
                          ...newProduct,
                          colors: {
                            ...newProduct.colors,
                            [newColorName]: { images: [], stock: 0 }
                          },
                        });
                        setNewColorName("");
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
                  <p className="product-title">
                    {product.name}
                    <span style={{ fontSize: "0.75em", opacity: 0.6, marginLeft: "8px" }}>
                      Sold: {getProductSoldCount(product.name)}
                    </span>
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {Object.entries(product.colors || {}).map(([colorName, colorData]) => {
                      const stock = colorData?.stock ?? 0;
                      return (
                        <p
                          key={colorName}
                          className={`product-meta inventory-status ${
                            stock === 0
                              ? "inventory-out"
                              : stock <= 5
                                ? "inventory-low"
                                : "inventory-good"
                          }`}
                        >
                          {colorName}: {stock}
                        </p>
                      );
                    })}
                  </div>
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
              <div className="admin-label">
                <p style={{ marginBottom: "10px", fontWeight: "600" }}>Product Colors & Stock</p>
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
                      {editingProduct.colors[colorName]?.images?.length || 0} image{(editingProduct.colors[colorName]?.images?.length || 0) !== 1 ? "s" : ""}
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
      )}
    </section>
  );
};

export default ManageInventory;
