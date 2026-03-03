import React, { useState } from 'react';
import { Home, CheckSquare, Package, ShoppingCart, Settings } from 'lucide-react';
import { supabase } from './utils/supabaseClient';
import Dashboard from './components/Dashboard';
import TaskManagement from './components/TaskManagement';
import InventoryManagement from './components/InventoryManagement';
import ShoppingList from './components/ShoppingList';
import SettingsPage from './components/SettingsPage';
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Real data from database
  const [tasks, setTasks] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);

  // House customization
  const [houseName, setHouseName] = useState(() => {
    return localStorage.getItem('houseName') || 'Mûcií';
  });

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'shopping', name: 'Shopping', icon: ShoppingCart },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  const handleAddToShoppingList = async (item) => {
    const alreadyAdded = shoppingItems.some(s => s.fromInventory && s.inventoryId === item.id && !s.completed);
    if (alreadyAdded) return;
    const newItem = {
      id: `inv-${item.id}-${Date.now()}`,
      name: item.name,
      category: item.category,
      quantity: Math.max(item.lowStockThreshold - item.currentStock + 1, 1).toString(),
      unit: item.unit,
      preferredBrand: '',
      preferredStore: '',
      fromInventory: true,
      inventoryId: item.id,
      completed: false,
      dateAdded: new Date().toISOString()
    };
    // Optimistic update
    setShoppingItems(prev => [...prev, newItem]);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('shopping_items')
        .insert({
          name: newItem.name,
          category: newItem.category,
          quantity: newItem.quantity,
          unit: newItem.unit,
          preferred_brand: '',
          preferred_store: '',
          from_inventory: true,
          inventory_id: item.id,
          completed: false,
          user_id: user?.id
        })
        .select()
        .single();
      if (error) throw error;
      // Replace optimistic item with real DB item
      setShoppingItems(prev => prev.map(s =>
        s.id === newItem.id ? {
          id: data.id, name: data.name, category: data.category,
          quantity: data.quantity, unit: data.unit,
          preferredBrand: data.preferred_brand || '',
          preferredStore: data.preferred_store || '',
          fromInventory: data.from_inventory,
          inventoryId: data.inventory_id,
          completed: data.completed,
          dateAdded: data.created_at
        } : s
      ));
    } catch (err) {
      console.error('Could not save to shopping list:', err.message);
      // Keep optimistic item on failure
    }
  };

  const handleUpdateInventory = (inventoryId, quantityPurchased) => {
    setInventoryItems(prev => prev.map(item => 
      item.id === inventoryId 
        ? { ...item, currentStock: item.currentStock + quantityPurchased }
        : item
    ));
  };

  const handleGenerateShoppingList = async () => {
    const existingInventoryIds = shoppingItems
      .filter(item => item.fromInventory && !item.completed)
      .map(item => item.inventoryId);

    const lowStockItems = inventoryItems.filter(item =>
      item.currentStock <= item.lowStockThreshold &&
      item.autoAddToShopping &&
      !existingInventoryIds.includes(item.id)
    );

    if (lowStockItems.length === 0) return;

    const newItems = lowStockItems.map(item => ({
      id: `inv-${item.id}-${Date.now()}-${Math.random()}`,
      name: item.name,
      category: item.category,
      quantity: Math.max(item.lowStockThreshold - item.currentStock + 1, 1).toString(),
      unit: item.unit,
      preferredBrand: '',
      preferredStore: '',
      fromInventory: true,
      inventoryId: item.id,
      completed: false,
      dateAdded: new Date().toISOString()
    }));

    // Optimistic update
    setShoppingItems(prev => [...prev, ...newItems]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = lowStockItems.map(item => ({
        name: item.name,
        category: item.category,
        quantity: Math.max(item.lowStockThreshold - item.currentStock + 1, 1).toString(),
        unit: item.unit,
        preferred_brand: '',
        preferred_store: '',
        from_inventory: true,
        inventory_id: item.id,
        completed: false,
        user_id: user?.id
      }));
      const { error } = await supabase.from('shopping_items').insert(payload);
      if (error) throw error;
    } catch (err) {
      console.error('Could not save generated shopping items:', err.message);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            tasks={tasks}
            inventoryItems={inventoryItems}
            shoppingItems={shoppingItems}
            onNavigateToTab={setActiveTab}
            onAddToShoppingList={handleAddToShoppingList}
            houseName={houseName}
          />
        );
      case 'tasks':
        return <TaskManagement tasks={tasks} setTasks={setTasks} />;
      case 'inventory':
        return (
          <InventoryManagement 
            inventoryItems={inventoryItems}
            setInventoryItems={setInventoryItems}
            onGenerateShoppingList={handleGenerateShoppingList}
          />
        );
      case 'shopping':
        return (
          <ShoppingList 
            inventoryItems={inventoryItems}
            onUpdateInventory={handleUpdateInventory}
            shoppingItems={shoppingItems}
            setShoppingItems={setShoppingItems}
          />
        );
      case 'settings':
        return (
          <SettingsPage 
            houseName={houseName}
            setHouseName={setHouseName}
            tasks={tasks}
          />
        );
      default:
        return (
          <Dashboard 
            tasks={tasks}
            inventoryItems={inventoryItems}
            shoppingItems={shoppingItems}
            onNavigateToTab={setActiveTab}
            onAddToShoppingList={handleAddToShoppingList}
            houseName={houseName}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-900 to-amber-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
                  Mûcií
                </h1>
                <p className="text-xs text-gray-600">Home, simplified</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-900 to-purple-800 text-white shadow-lg shadow-purple-900/25'
                        : 'text-gray-600 hover:text-purple-900 hover:bg-purple-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
