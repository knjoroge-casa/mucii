import React, { useState, useEffect } from 'react';
import { Plus, ShoppingCart, Check, X, Filter, Trash2, Calendar, Package, Store, Tag, Edit3 } from 'lucide-react';

const ShoppingList = ({ inventoryItems = [], onUpdateInventory, shoppingItems: propShoppingItems = [], setShoppingItems: setPropShoppingItems }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newCategory, setNewCategory] = useState('');
  const [customCategories, setCustomCategories] = useState([]);

  const [newItem, setNewItem] = useState({ 
    name: '', 
    category: '', 
    quantity: '1', 
    unit: '', 
    preferredBrand: '', 
    preferredStore: '',
    fromInventory: false,
    inventoryId: null
  });

  // Use props for shopping items
  const shoppingItems = propShoppingItems;
  const setShoppingItems = setPropShoppingItems || (() => {});
  const [purchasedItems, setPurchasedItems] = useState([]);

  // Categories matching inventory system
  const defaultCategories = [
    'Food & Pantry',
    'Fresh Produce',
    'Meat, Dairy & Eggs',
    'Beverages',
    'Household Supplies',
    'Toiletries & Personal Care',
    'Wine & Spirits',
    'Other'
  ];

  const allCategories = [...defaultCategories, ...customCategories];

  // Units matching inventory system
  const units = [
    'Packets',
    'Boxes',
    'Cans',
    'Jars',
    'Litres',
    'Bottles',
    'Bars',
    'Rolls',
    'Tubes',
    'Kg',
    'Bunches',
    'Pieces',
    'Packs'
  ];

  // Generate shopping list from inventory low stock items
  const generateFromInventory = () => {
    const lowStockItems = inventoryItems.filter(item => 
      item.currentStock <= item.lowStockThreshold && item.autoAddToShopping
    );

    const newShoppingItems = lowStockItems.map(item => ({
      id: `inv-${item.id}-${Date.now()}`,
      name: item.name,
      category: item.category,
      quantity: (item.lowStockThreshold - item.currentStock + 1).toString(),
      unit: item.unit,
      preferredBrand: '',
      preferredStore: '',
      fromInventory: true,
      inventoryId: item.id,
      dateAdded: new Date().toISOString()
    }));

    // Prevent duplicates - check if items from this inventory item already exist
    const existingInventoryIds = shoppingItems
      .filter(item => item.fromInventory)
      .map(item => item.inventoryId);

    const uniqueNewItems = newShoppingItems.filter(item => 
      !existingInventoryIds.includes(item.inventoryId)
    );

    if (uniqueNewItems.length > 0) {
      setShoppingItems(prev => [...prev, ...uniqueNewItems]);
    }
  };

  // Filter shopping items
  const filteredItems = shoppingItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesCategory;
  });

  const uniqueCategories = [...new Set(shoppingItems.map(item => item.category))];

  const handleAddItem = (e) => {
    e.preventDefault();
    
    if (editingItem) {
      setShoppingItems(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...item, ...newItem, id: editingItem.id }
          : item
      ));
      setEditingItem(null);
    } else {
      const item = {
        ...newItem,
        id: Date.now(),
        dateAdded: new Date().toISOString()
      };
      setShoppingItems(prev => [...prev, item]);
    }
    
    setNewItem({ 
      name: '', 
      category: '', 
      quantity: '1', 
      unit: '', 
      preferredBrand: '', 
      preferredStore: '',
      fromInventory: false,
      inventoryId: null
    });
    setShowAddForm(false);
  };

  const handleEdit = (item) => {
    setNewItem({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      preferredBrand: item.preferredBrand || '',
      preferredStore: item.preferredStore || '',
      fromInventory: item.fromInventory,
      inventoryId: item.inventoryId
    });
    setEditingItem(item);
    setShowAddForm(true);
  };

  const handleDeleteConfirm = (itemId) => {
    setShoppingItems(prev => prev.filter(item => item.id !== itemId));
    setDeleteConfirmItem(null);
  };

  const handleMarkPurchased = (item) => {
    // Move to purchased items
    const purchasedItem = {
      ...item,
      purchaseDate: new Date().toISOString()
    };
    setPurchasedItems(prev => [...prev, purchasedItem]);
    
    // Remove from shopping list
    setShoppingItems(prev => prev.filter(i => i.id !== item.id));
    
    // Update inventory if item came from inventory
    if (item.fromInventory && item.inventoryId && onUpdateInventory) {
      onUpdateInventory(item.inventoryId, parseInt(item.quantity) || 1);
    }
  };

  const addCustomCategory = () => {
    if (newCategory.trim() && !allCategories.includes(newCategory.trim())) {
      setCustomCategories(prev => [...prev, newCategory.trim()]);
      setNewItem(prev => ({ ...prev, category: newCategory.trim() }));
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
            Shopping List
          </h1>
          <p className="text-gray-600 mt-1">{shoppingItems.length} items to purchase</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={generateFromInventory}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
          >
            <Package className="w-5 h-5" />
            <span>Generate from Inventory</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white/70 border border-gray-200 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Shopping List */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <div className="flex items-center">
            <ShoppingCart className="w-5 h-5 text-blue-600 mr-3" />
            <h2 className="text-lg font-semibold text-blue-900">Shopping List ({filteredItems.length} items)</h2>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50/50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        {item.category}
                      </span>
                      {item.fromInventory && (
                        <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                          From Inventory
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4" />
                        <span>{item.quantity} {item.unit}</span>
                      </div>
                      {item.preferredBrand && (
                        <div className="flex items-center space-x-2">
                          <Tag className="w-4 h-4" />
                          <span>{item.preferredBrand}</span>
                        </div>
                      )}
                      {item.preferredStore && (
                        <div className="flex items-center space-x-2">
                          <Store className="w-4 h-4" />
                          <span>{item.preferredStore}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Added {formatDate(item.dateAdded)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit item"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                    <button
                      onClick={() => handleMarkPurchased(item)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      title="Mark as purchased"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmItem(item)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Shopping list is empty</h3>
            <p className="text-gray-500 mb-6">Add items manually or generate from low inventory stock</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Add Items Manually
              </button>
              <button 
                onClick={generateFromInventory}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Generate from Inventory
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Purchased Items Section */}
      {purchasedItems.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Purchase History ({purchasedItems.length} items)</h2>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-green-900">Recently Purchased</h3>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {purchasedItems.slice().reverse().map((item) => (
                <div key={`purchased-${item.id}`} className="p-4 hover:bg-gray-50/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 line-through opacity-75">
                        {item.name}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{item.quantity} {item.unit}</span>
                        <span>•</span>
                        <span>Purchased {formatDate(item.purchaseDate)}</span>
                        {item.preferredStore && (
                          <>
                            <span>•</span>
                            <span>at {item.preferredStore}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Item</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{deleteConfirmItem.name}" from your shopping list?
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setDeleteConfirmItem(null)}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteConfirm(deleteConfirmItem.id)}
                  className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingItem ? 'Edit Shopping Item' : 'Add Shopping Item'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                  setNewItem({ 
                    name: '', 
                    category: '', 
                    quantity: '1', 
                    unit: '', 
                    preferredBrand: '', 
                    preferredStore: '',
                    fromInventory: false,
                    inventoryId: null
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-6">
              {/* Item Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name *</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Milk, Bread, Detergent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                <div className="flex space-x-2">
                  <select
                    required
                    value={newItem.category}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select category</option>
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(true)}
                    className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                    title="Add custom category"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quantity and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unit *</label>
                  <select
                    required
                    value={newItem.unit}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select unit</option>
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preferred Brand */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Brand</label>
                <input
                  type="text"
                  value={newItem.preferredBrand}
                  onChange={(e) => setNewItem(prev => ({ ...prev, preferredBrand: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Heinz, Coca-Cola, Tide"
                />
              </div>

              {/* Preferred Store */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Store</label>
                <input
                  type="text"
                  value={newItem.preferredStore}
                  onChange={(e) => setNewItem(prev => ({ ...prev, preferredStore: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Walmart, Target, Local grocery store"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingItem(null);
                    setNewItem({ 
                      name: '', 
                      category: '', 
                      quantity: '1', 
                      unit: '', 
                      preferredBrand: '', 
                      preferredStore: '',
                      fromInventory: false,
                      inventoryId: null
                    });
                  }}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {editingItem ? 'Update Item' : 'Add to List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Custom Category</h2>
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category Name</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategory('');
                  }}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addCustomCategory}
                  disabled={!newCategory.trim()}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingList;