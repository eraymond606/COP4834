// src/components/MenuConfig.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from './Api.js';

// Reuse your AnimatedTrashIcon or import it if you factored it out
const AnimatedTrashIcon = ({ isHovered }) => {
  const iconStyle = {
    transform: isHovered ? 'scale(1.2)' : 'scale(1)',
    transition: 'all 0.2s ease-in-out',
  };
  const lidStyle = {
    transformOrigin: '50% 5%',
    transform: isHovered ? 'rotate(-10deg)' : 'rotate(0deg)',
    transition: 'transform 0.3s ease-in-out',
  };
  return (
    <div style={iconStyle}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isHovered ? '#ff0000' : '#ff4d4d'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g style={lidStyle}>
          <path d="M3 6h18" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </g>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        {isHovered && (
          <>
            <path d="M10 10v8" strokeWidth="1.5" />
            <path d="M14 10v8" strokeWidth="1.5" />
          </>
        )}
      </svg>
    </div>
  );
};

export default function MenuConfig() {
  const navigate = useNavigate();

  // Data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedData, setGroupedData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState(null);
  const [newIngredientsText, setNewIngredientsText] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editIngredientsText, setEditIngredientsText] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');

  // Trash hover
  const [hoverTrashId, setHoverTrashId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [catsRes, ingRes, itemsRes, linksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/menu_categories`),
      fetch(`${API_BASE_URL}/api/ingredients`),
      fetch(`${API_BASE_URL}/api/menu_items`),
      fetch(`${API_BASE_URL}/api/menu_item_ingredients`),
      ]);
      if (!catsRes.ok || !ingRes.ok || !itemsRes.ok || !linksRes.ok) {
        throw new Error('One or more API calls failed');
      }
      const cats = await catsRes.json();
      const ing = await ingRes.json();
      const items = await itemsRes.json();
      const links = await linksRes.json();

      setCategories(cats);
      setIngredients(ing);

      // build map: food_id -> [ingredient_id,...]
      const map = {};
      links.forEach((l) => {
        map[l.food_id] = map[l.food_id] || [];
        map[l.food_id].push(l.ingredient_id);
      });

      // attach ingredient names
      const withIngr = items.map((item) => ({
        ...item,
        ingredientNames: (map[item.food_id] || [])
          .map((id) => ing.find((x) => x.ingredient_id === id)?.ingredient_name)
          .filter(Boolean),
      }));

      // group by category
      const grouped = cats.map((cat) => ({
        categoryId: cat.category_id,
        categoryName: cat.category_name,
        items: withIngr.filter((i) => i.category_id === cat.category_id),
      }));
      setGroupedData(grouped);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Add
  function handleAddClick(catId) {
    setNewCategoryId(catId);
    setNewItemName('');
    setNewItemPrice('');
    setNewIngredientsText('');
    setShowAddModal(true);
  }

  async function handleCreateItem() {
    // split & trim tags
    const ingredient_names = newIngredientsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // 1) Create the menu item + receive its food_id
    const res = await fetch('${API_BASE_URL}/api/menu_items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: newItemName,
        category_id: newCategoryId,
        ingredient_names,
        price: newItemPrice === '' ? null : parseFloat(newItemPrice),
      }),
    });
    if (!res.ok) throw new Error('Failed to create item');
    // 2) Refresh
    setShowAddModal(false);
    setNewIngredientsText('');
    setNewItemPrice('');
    fetchData();
  }

  // Delete
  function handleDeleteClick(item) {
    setItemToDelete(item);
    setShowDeleteModal(true);
  }

  async function handleConfirmDelete() {
    // first remove ingredient links
    await (`${API_BASE_URL}/api/menu_item_ingredients/by-item/${itemToDelete.food_id}`, {
      method: 'DELETE',
    });
    // then the item itself
    await (`${API_BASE_URL}/api/menu_items/${itemToDelete.food_id}`, {
      method: 'DELETE',
    });
    setShowDeleteModal(false);
    Data();
  }

  // Edit
  function handleEditClick(item) {
    setItemToEdit(item);
    setEditItemName(item.item_name);
    setEditCategoryId(item.category_id);
    setEditItemPrice(item.price || '');
    // find current links
    setEditIngredientsText(item.ingredientNames.join(', '));
    setShowEditModal(true);
  }

  async function handleUpdateItem() {
    const ingredient_names = editIngredientsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // update name, category & price
    await (`${API_BASE_URL}/api/menu_items/${itemToEdit.food_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: editItemName,
        category_id: editCategoryId,
        ingredient_names,
        price: editItemPrice === '' ? null : parseFloat(editItemPrice),
      }),
    });
    setShowEditModal(false);
    Data();
  }

  const handleBackClick = () => navigate('/ConfigOptions');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={handleBackClick}>
          Back
        </button>
        <h1 style={styles.title}>
          Swift <span style={{ color: '#45A8DA' }}>Seller</span>
        </h1>
        <h2 style={styles.title2}>Menu Configuration</h2>
      </div>

      {loading && <p style={styles.loadingContainer}>Loading…</p>}
      {error && <p style={styles.errorContainer}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={styles.lightGreyBox}>
            <div style={styles.tableHeaderRow}>
              <div style={{ ...styles.headerCell, flex: 1 }}>Item Name</div>
              <div style={{ ...styles.headerCell, flex: 1 }}>Food ID</div>
              <div style={{ ...styles.headerCell, flex: 0.5 }}>Price</div>
              <div style={{ ...styles.headerCell, flex: 1 }}>Ingredients</div>
              <div style={{ ...styles.headerCell, width: '50px' }} />
            </div>

            {groupedData.map((cat) => (
              <div key={cat.categoryId} style={styles.categorySection}>
                {/* Category header row with correct alignment */}
                <div style={styles.menuRow}>
                  <div
                    style={{ ...styles.menuCell, flex: 1, fontWeight: 'bold' }}
                  >
                    {cat.categoryName}
                  </div>
                  <div style={{ flex: 1 }}></div>
                  <div style={{ flex: 0.5 }}></div>
                  <div style={{ flex: 1 }}></div>
                  <div style={{ width: 120, textAlign: 'right' }}>
                    <button
                      style={styles.addMenuButton}
                      onClick={() => handleAddClick(cat.categoryId)}
                    >
                      Add Item+
                    </button>
                  </div>
                </div>

                {/* Zero or more item rows */}
                {cat.items.map((item) => (
                  <div key={item.food_id} style={styles.menuRow}>
                    <div
                      style={{
                        ...styles.menuCell,
                        flex: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleEditClick(item)}
                    >
                      {item.item_name}
                    </div>
                    <div style={{ ...styles.menuCell, flex: 1 }}>
                      {item.food_id}
                    </div>
                    <div style={{ ...styles.menuCell, flex: 0.5 }}>
                      ${item.price ? parseFloat(item.price).toFixed(2) : '0.00'}
                    </div>
                    <div style={{ ...styles.menuCell, flex: 1 }}>
                      {item.ingredientNames.join(', ')}
                    </div>
                    <div style={{ width: 50, textAlign: 'center' }}>
                      <button
                        style={styles.trashButton}
                        onClick={() => handleDeleteClick(item)}
                        onMouseEnter={() => setHoverTrashId(item.food_id)}
                        onMouseLeave={() => setHoverTrashId(null)}
                      >
                        <AnimatedTrashIcon
                          isHovered={hoverTrashId === item.food_id}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Add Menu Item</h3>
            <label>
              Name:
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                style={styles.inputField}
              />
            </label>
            <label>
              Category:
              <select
                value={newCategoryId || ''}
                onChange={(e) => setNewCategoryId(+e.target.value)}
                style={styles.inputField}
              >
                <option value="" disabled>
                  — select —
                </option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price ($):
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                style={styles.inputField}
              />
            </label>
            <label>
              Ingredients:
              <input
                type="text"
                placeholder="e.g. chicken, garlic, cheese"
                value={newIngredientsText}
                onChange={(e) => setNewIngredientsText(e.target.value)}
                style={styles.inputField}
              />
            </label>
            <div style={{ marginTop: 12 }}>
              <button style={styles.createButton} onClick={handleCreateItem}>
                Create
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && itemToDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Confirm Delete</h3>
            <p>Remove "{itemToDelete.item_name}"?</p>
            <div style={{ marginTop: 12 }}>
              <button style={styles.deleteButton} onClick={handleConfirmDelete}>
                Delete
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && itemToEdit && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Edit Menu Item</h3>
            <label>
              Name:
              <input
                type="text"
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                style={styles.inputField}
              />
            </label>
            <label>
              Category:
              <select
                value={editCategoryId || ''}
                onChange={(e) => setEditCategoryId(+e.target.value)}
                style={styles.inputField}
              >
                <option value="" disabled>
                  — select —
                </option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price ($):
              <input
                type="number"
                min="0"
                step="0.01"
                value={editItemPrice}
                onChange={(e) => setEditItemPrice(e.target.value)}
                style={styles.inputField}
              />
            </label>
            <label>
              Ingredients (comma‑separated):
              <input
                type="text"
                value={editIngredientsText}
                onChange={(e) => setEditIngredientsText(e.target.value)}
                style={styles.inputField}
              />
            </label>

            <div style={{ marginTop: 12 }}>
              <button style={styles.createButton} onClick={handleUpdateItem}>
                Save
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Updated styles with 'menu' terminology instead of 'employee'
const styles = {
  container: {
    backgroundColor: '#F6F6F6',
    minHeight: '100vh',
    fontFamily: 'sans-serif',
  },
  header: { position: 'relative', textAlign: 'center', padding: '20px 0' },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 20,
    backgroundColor: '#45A8DA',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  title: { margin: 0, fontWeight: 'bold', color: '#3b3b3b' },
  title2: { margin: 0, fontWeight: 'bold', color: '#3b3b3b' },
  lightGreyBox: {
    backgroundColor: '#DDDDDD',
    margin: '20px',
    padding: '20px',
    borderRadius: '4px',
  },
  tableHeaderRow: {
    display: 'flex',
    borderBottom: '1px solid #bbb',
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerCell: { fontWeight: 'bold', color: '#3b3b3b' },
  categorySection: { marginBottom: 20 },
  menuRow: { display: 'flex', alignItems: 'center', marginBottom: 5 },
  menuCell: { color: '#3b3b3b' },
  addMenuButton: {
    backgroundColor: '#45A8DA',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  trashButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 4,
    minWidth: 300,
  },
  inputField: {
    display: 'block',
    margin: '5px 0 10px',
    width: '100%',
    padding: 8,
    boxSizing: 'border-box',
  },
  createButton: {
    backgroundColor: '#45A8DA',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: 4,
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: 4,
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: 4,
  },
  loadingContainer: { textAlign: 'center', padding: 20 },
  errorContainer: { textAlign: 'center', padding: 20, color: 'red' },
};
