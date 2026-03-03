import React, { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, Search, Filter, Edit3, Trash2, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const InventoryManagement = ({ inventoryItems, setInventoryItems, onGenerateShoppingList }) => {
  const [showItemForm, setShowItemForm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');

  const [itemForm, setItemForm] = useState({
    name: '',
    category: '',
    currentStock: '',
    unit: '',
    lowStockThreshold: '',
    storageLocation: '',
    autoAddToShopping: false
  });

  const defaultCategories = [
    'Food & Pantry', 'Fresh Produce', 'Meat, Dairy & Eggs',
    'Beverages', 'Household Supplies', 'Toiletries & Personal Care',
    'Wine & Spirits', 'Other'
  ];
  const allCategories = [...defaultCategories, ...customCategories];

  const units = [
    'Packets', 'Boxes', 'Cans', 'Jars', 'Litres', 'Bottles',
    'Bars', 'Rolls', 'Tubes', 'Kg', 'Bunches', 'Pieces', 'Packs'
  ];

  // Map DB row to local shape
  const mapDbItem = (row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    currentStock: row.current_stock,
    unit: row.unit,
    lowStockThreshold: row.low_stock_threshold,
    storageLocation: row.storage_location || '',
    autoAddToShopping: row.auto_add_to_shopping,
    createdAt: row.created_at
  });

  // Load inventory from Supabase
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .order('name', { ascending: true });
        if (error) throw error;
        setInventoryItems((data || []).map(mapDbItem));
      } catch (err) {
        console.error('Could not load inventory:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadInventory();
  }, []);

  // Derived data
  const items = inventoryItems || [];
  const lowStockItems = items.filter(item => item.currentStock <= item.lowStockThreshold);
  const uniqueCategories = [...new Set(items.map(item => item.category).filter(Boolean))];
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || item.currentStock <= item.lowStockThreshold;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: itemForm.name,
      category: itemForm.category,
      current_stock: parseInt(itemForm.currentStock) || 0,
      unit: itemForm.unit,
      low_stock_threshold: parseInt(itemForm.lowStockThreshold) || 0,
      storage_location: itemForm.storageLocation,
      auto_add_to_shopping: itemForm.autoAddToShopping,
    };

    try {
      if (editingItem) {
        const { data, error } = await supabase
          .from('inventory_items')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id)
          .select()
          .single();
        if (error) throw error;
        setInventoryItems(prev => prev.map(item =>
          item.id === editingItem.id ? mapDbItem(data) : item
        ));
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('inventory_items')
          .insert({ ...payload, user_id: user?.id })
          .select()
          .single();
        if (error) throw error;
        setInventoryItems(prev => [...prev, mapDbItem(data)]);
      }
    } catch (err) {
      console.error('Could not save item:', err.message);
      // Optimistic fallback
      if (editingItem) {
        setInventoryItems(prev => prev.map(item =>
          item.id === editingItem.id
            ? { ...item, ...itemForm, currentStock: parseInt(itemForm.currentStock) || 0, lowStockThreshold: parseInt(itemForm.lowStockThreshold) || 0 }
            : item
        ));
      } else {
        setInventoryItems(prev => [...prev, {
          ...itemForm,
          id: Date.now(),
          currentStock: parseInt(itemForm.currentStock) || 0,
          lowStockThreshold: parseInt(itemForm.lowStockThreshold) || 0,
          createdAt: new Date().toISOString()
        }]);
      }
    } finally {
      setSaving(false);
      setShowItemForm(false);
      setEditingItem(null);
      resetForm();
    }
  };

  const handleDeleteConfirm = async (itemId) => {
    setInventoryItems(prev => prev.filter(item => item.id !== itemId));
    setDeleteConfirmItem(null);
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
      if (error) throw error;
    } catch (err) {
      console.error('Could not delete item:', err.message);
    }
  };

  const handleEdit = (item) => {
    setItemForm({
      name: item.name,
      category: item.category,
      currentStock: item.currentStock.toString(),
      unit: item.unit,
      lowStockThreshold: item.lowStockThreshold.toString(),
      storageLocation: item.storageLocation || '',
      autoAddToShopping: item.autoAddToShopping
    });
    setEditingItem(item);
    setShowItemForm(true);
  };

  const resetForm = () => {
    setItemForm({ name: '', category: '', currentStock: '', unit: '', lowStockThreshold: '', storageLocation: '', autoAddToShopping: false });
  };

  const addCustomCategory = () => {
    if (newCategory.trim() && !allCategories.includes(newCategory.trim())) {
      setCustomCategories(prev => [...prev, newCategory.trim()]);
      setItemForm(prev => ({ ...prev, category: newCategory.trim() }));
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const getStockStatus = (item) => {
    if (item.currentStock === 0) return { label: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50 border-red-100' };
    if (item.currentStock <= item.lowStockThreshold) return { label: 'Low Stock', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' };
    return { label: 'In Stock', color: 'text-green-600', bg: 'bg-green-50 border-green-100' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600 font-medium">Loading inventory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
            Inventory
          </h1>
          <p className="text-gray-600 mt-1">Track and manage your household essentials</p>
        </div>
        <div className="flex space-x-3">
          {lowStockItems.length > 0 && (
            <button
              onClick={onGenerateShoppingList}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
            >
              <Package className="w-4 h-4" />
              <span>Generate Shopping List ({lowStockItems.length})</span>
            </button>
          )}
          <button
            onClick={() => { resetForm(); setEditingItem(null); setShowItemForm(true); }}
            className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white/70 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all font-medium ${
              showLowStockOnly ? 'bg-amber-200 text-amber-800' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Low Stock ({lowStockItems.length})</span>
          </button>
        </div>
      </div>

      {/* Inventory List */}
      {filteredItems.length > 0 ? (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => {
              const stockStatus = getStockStatus(item);
              return (
                <div key={item.id} className="p-6 hover:bg-gray-50/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                          {item.category}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${stockStatus.bg} ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                        {item.autoAddToShopping && (
                          <span className="flex items-center space-x-1 text-xs text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Auto-add</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className={`font-semibold ${stockStatus.color}`}>
                            {item.currentStock} {item.unit}
                          </span>
                          <span className="text-gray-400">· alert at ≤{item.lowStockThreshold}</span>
                        </div>
                        {item.storageLocation && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{item.storageLocation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-4">
                      <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirmItem(item)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-12 border border-white/50 shadow-lg text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {searchTerm || selectedCategory !== 'all' || showLowStockOnly ? 'No items match your filters' : 'No inventory items yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedCategory !== 'all' || showLowStockOnly
              ? 'Try adjusting your search or filters'
              : 'Start tracking your household essentials'}
          </p>
          {!searchTerm && selectedCategory === 'all' && !showLowStockOnly && (
            <button
              onClick={() => { resetForm(); setEditingItem(null); setShowItemForm(true); }}
              className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Add Your First Item
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Item</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold">"{deleteConfirmItem.name}"</span>? This cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button onClick={() => setDeleteConfirmItem(null)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button onClick={() => handleDeleteConfirm(deleteConfirmItem.id)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-all">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingItem ? 'Edit Item' : 'Add Inventory Item'}
              </h2>
              <button onClick={() => { setShowItemForm(false); setEditingItem(null); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name *</label>
                <input
                  type="text" required
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Olive Oil, Dishwasher Tablets"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                <div className="flex space-x-2">
                  <select
                    required
                    value={itemForm.category}
                    onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select category</option>
                    {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowAddCategory(true)} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stock + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Current Stock *</label>
                  <input
                    type="number" required min="0"
                    value={itemForm.currentStock}
                    onChange={(e) => setItemForm(prev => ({ ...prev, currentStock: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unit *</label>
                  <select
                    required
                    value={itemForm.unit}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select unit</option>
                    {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
              </div>

              {/* Low Stock Threshold */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Low Stock Alert Threshold *</label>
                <input
                  type="number" required min="0"
                  value={itemForm.lowStockThreshold}
                  onChange={(e) => setItemForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="2"
                />
                <p className="text-sm text-gray-500 mt-1">Alert when stock drops to or below this amount</p>
              </div>

              {/* Storage Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Storage Location</label>
                <input
                  type="text"
                  value={itemForm.storageLocation}
                  onChange={(e) => setItemForm(prev => ({ ...prev, storageLocation: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Kitchen pantry – top shelf"
                />
              </div>

              {/* Auto Add */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemForm.autoAddToShopping}
                  onChange={(e) => setItemForm(prev => ({ ...prev, autoAddToShopping: e.target.checked }))}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Automatically add to shopping list when stock is low</span>
              </label>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" onClick={() => { setShowItemForm(false); setEditingItem(null); resetForm(); }} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center space-x-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Custom Category</h2>
              <button onClick={() => { setShowAddCategory(false); setNewCategory(''); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
                placeholder="Enter category name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex justify-end space-x-4">
                <button onClick={() => { setShowAddCategory(false); setNewCategory(''); }} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button
                  onClick={addCustomCategory}
                  disabled={!newCategory.trim()}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
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

export default InventoryManagement;
