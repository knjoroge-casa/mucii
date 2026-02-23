import React, { useState } from 'react';
import { Home, CheckSquare, Package, ShoppingCart, Settings, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TaskManagement from './components/TaskManagement';
import InventoryManagement from './components/InventoryManagement';
import ShoppingList from './components/ShoppingList';
import SettingsPage from './components/SettingsPage';
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Real data from database
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

  const handleUpdateInventory = (inventoryId, quantityPurchased) => {
    setInventoryItems(prev => prev.map(item => 
      item.id === inventoryId 
        ? { ...item, currentStock: item.currentStock + quantityPurchased }
        : item
    ));
  };

  const handleGenerateShoppingList = () => {
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

    // Prevent duplicates
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            inventoryItems={inventoryItems}
            shoppingItems={shoppingItems}
            onNavigateToTab={setActiveTab}
            houseName={houseName}
          />
        );
      case 'tasks':
        return <TaskManagement />;
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
          />
        );
      default:
        return (
          <Dashboard 
            inventoryItems={inventoryItems}
            shoppingItems={shoppingItems}
            onNavigateToTab={setActiveTab}
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
