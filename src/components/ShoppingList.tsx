import React, { useState, useEffect } from 'react';
import { Plus, ShoppingCart, Check, X, Filter, Trash2, Package, Store, Tag, Edit3, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { getPermissions } from '../utils/permissions';

const ShoppingList = ({ inventoryItems = [], onUpdateInventory, shoppingItems, setShoppingItems, activeUserRole = 'viewer' }) => {
  const can = getPermissions(activeUserRole);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPurchased, setShowPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');

  const emptyForm = {
    name: '', category: '', quantity: '1', unit: '',
    preferredBrand: '', preferredStore: '', fromInventory: false, inventoryId: null
  };
  const [itemForm, setItemForm] = useState(emptyForm);

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
    quantity: row.quantity || '1',
    unit: row.unit,
    preferredBrand: row.preferred_brand || '',
    preferredStore: row.preferred_store || '',
    fromInventory: row.from_inventory,
    inventoryId: row.inventory_id,
    completed: row.completed,
    dateAdded: row.created_at
  });

  // Load shopping items from Supabase
  useEffect(() => {
    const loadItems = async () => {
      try {
        const { data, error } = await supabase
          .from('shopping_items')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setShoppingItems((data || []).map(mapDbItem));
      } catch (err) {
        console.error('Could not load shopping list:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  // Derived lists
  const items = shoppingItems || [];
  const pendingItems = items.filter(i => !i.completed);
  const purchasedItems = items.filter(i => i.completed);
  const uniqueCategories = [...new Set(pendingItems.map(i => i.category).filter(Boolean))];
  const filteredPending = pendingItems.filter(i =>
    selectedCategory === 'all' || i.category === selectedCategory
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: itemForm.name,
      category: itemForm.category,
      quantity: itemForm.quantity,
      unit: itemForm.unit,
      preferred_brand: itemForm.preferredBrand,
      preferred_store: itemForm.preferredStore,
      from_inventory: itemForm.fromInventory,
      inventory_id: itemForm.inventoryId || null,
      completed: false,
    };

    try {
      if (editingItem) {
        const { data, error } = await supabase
          .from('shopping_items')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id)
          .select()
          .single();
        if (error) throw error;
        setShoppingItems(prev => prev.map(i => i.id === editingItem.id ? mapDbItem(data) : i));
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('shopping_items')
          .insert({ ...payload, user_id: user?.id })
          .select()
          .single();
        if (error) throw error;
        setShoppingItems(prev => [mapDbItem(data), ...prev]);
      }
    } catch (err) {
      console.error('Could not save item:', err.message);
      // Optimistic fallback
      if (editingItem) {
        setShoppingItems(prev => prev.map(i =>
          i.id === editingItem.id ? { ...i, ...itemForm } : i
        ));
      } else {
        setShoppingItems(prev => [{
          ...itemForm, id: Date.now(), completed: false, dateAdded: new Date().toISOString()
        }, ...prev]);
      }
    } finally {
      setSaving(false);
      setShowAddForm(false);
      setEditingItem(null);
      setItemForm(emptyForm);
    }
  };

  const handleMarkPurchased = async (item) => {
    // Optimistic update
    setShoppingItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, completed: true } : i
    ));

    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
    } catch (err) {
      console.error('Could not mark as purchased:', err.message);
      setShoppingItems(prev => prev.map(i => i.id === item.id ? item : i));
    }

    // Update inventory stock if item came from inventory
    if (item.fromInventory && item.inventoryId && onUpdateInventory) {
      const qty = parseInt(item.quantity) || 1;
      onUpdateInventory(item.inventoryId, qty);

      // Also update in Supabase
      try {
        const invItem = inventoryItems.find(inv => inv.id === item.inventoryId);
        if (invItem) {
          await supabase
            .from('inventory_items')
            .update({
              current_stock: invItem.currentStock + qty,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.inventoryId);
        }
      } catch (err) {
        console.error('Could not update inventory stock:', err.message);
      }
    }
  };

  const handleUndoPurchased = async (item) => {
    setShoppingItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, completed: false } : i
    ));
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ completed: false, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
    } catch (err) {
      console.error('Could not undo purchase:', err.message);
      setShoppingItems(prev => prev.map(i => i.id === item.id ? item : i));
    }
  };

  const handleDelete = async (itemId) => {
    setShoppingItems(prev => prev.filter(i => i.id !== itemId));
    setDeleteConfirmItem(null);
    try {
      const { error } = await supabase.from('shopping_items').delete().eq('id', itemId);
      if (error) throw error;
    } catch (err) {
      console.error('Could not delete item:', err.message);
    }
  };

  const handleEdit = (item) => {
    setItemForm({
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

  const addCustomCategory = () => {
    if (newCategory.trim() && !allCategories.includes(newCategory.trim())) {
      setCustomCategories(prev => [...prev, newCategory.trim()]);
      setItemForm(prev => ({ ...prev, category: newCategory.trim() }));
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600 font-medium">Loading shopping list...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
            Shopping List
          </h1>
          <p className="text-gray-600 mt-1">
            {pendingItems.length} {pendingItems.length === 1 ? 'item' : 'items'} to buy
            {purchasedItems.length > 0 && ` · ${purchasedItems.length} purchased`}
          </p>
        </div>
        {can.canAddShoppingItem && (
          <button
            onClick={() => { setItemForm(emptyForm); setEditingItem(null); setShowAddForm(true); }}
            className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-lg flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white/70 border border-gray-200 rounded-xl px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        {purchasedItems.length > 0 && (
          <button
            onClick={() => setShowPurchased(!showPurchased)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              showPurchased ? 'bg-green-200 text-green-800' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{showPurchased ? 'Hide' : 'Show'} Purchased ({purchasedItems.length})</span>
          </button>
        )}
      </div>

      {/* Pending Items */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              To Buy ({filteredPending.length})
            </h2>
          </div>
        </div>

        {filteredPending.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredPending.map((item) => (
              <div key={item.id} className="p-5 hover:bg-gray-50/50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1.5">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        {item.category}
                      </span>
                      {item.fromInventory && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          From Inventory
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        {item.quantity} {item.unit}
                      </span>
                      {item.preferredBrand && (
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" />
                          {item.preferredBrand}
                        </span>
                      )}
                      {item.preferredStore && (
                        <span className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5" />
                          {item.preferredStore}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-4">
                    {can.canEditShoppingItem && (
                      <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {can.canMarkPurchased && (
                      <button onClick={() => handleMarkPurchased(item)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Mark as purchased">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {can.canDeleteShoppingItem && (
                      <button onClick={() => setDeleteConfirmItem(item)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">All done!</h3>
            <p className="text-gray-500 mb-6">
              {selectedCategory !== 'all' ? 'No items in this category' : 'Your shopping list is empty'}
            </p>
            <button
              onClick={() => { setItemForm(emptyForm); setEditingItem(null); setShowAddForm(true); }}
              className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Add Items
            </button>
          </div>
        )}
      </div>

      {/* Purchased Items */}
      {showPurchased && purchasedItems.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Purchased ({purchasedItems.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {purchasedItems.map((item) => (
              <div key={item.id} className="p-5 hover:bg-gray-50/50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-400 line-through">{item.name}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{item.quantity} {item.unit}
                      {item.preferredStore && ` · ${item.preferredStore}`}
                    </p>
                  </div>
                  <div className="flex space-x-1 ml-4">
                    <button onClick={() => handleUndoPurchased(item)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="Move back to list">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirmItem(item)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">Remove Item</h2>
              <p className="text-gray-600 mb-6">
                Remove <span className="font-semibold">"{deleteConfirmItem.name}"</span> from your shopping list?
              </p>
              <div className="flex justify-center space-x-4">
                <button onClick={() => setDeleteConfirmItem(null)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirmItem.id)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-all">Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingItem ? 'Edit Item' : 'Add to Shopping List'}
              </h2>
              <button onClick={() => { setShowAddForm(false); setEditingItem(null); setItemForm(emptyForm); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
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
                  placeholder="e.g., Milk, Bread, Detergent"
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

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
                  <input
                    type="number" required min="1"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
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

              {/* Brand + Store */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Brand</label>
                  <input
                    type="text"
                    value={itemForm.preferredBrand}
                    onChange={(e) => setItemForm(prev => ({ ...prev, preferredBrand: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Heinz"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Store</label>
                  <input
                    type="text"
                    value={itemForm.preferredStore}
                    onChange={(e) => setItemForm(prev => ({ ...prev, preferredStore: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Naivas"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" onClick={() => { setShowAddForm(false); setEditingItem(null); setItemForm(emptyForm); }} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center space-x-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add to List'}</span>
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
            <input
              type="text" value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
              placeholder="Enter category name"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            />
            <div className="flex justify-end space-x-4">
              <button onClick={() => { setShowAddCategory(false); setNewCategory(''); }} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={addCustomCategory} disabled={!newCategory.trim()} className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingList;
