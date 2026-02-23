import React, { useState } from 'react';
import { Home, CheckSquare, Package, ShoppingCart, Users, Plus, Clock, AlertTriangle, TrendingUp, Filter } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TaskManagement from './components/TaskManagement';
import InventoryManagement from './components/InventoryManagement';
import ShoppingList from './components/ShoppingList';
import UserManagement from './components/UserManagement';

// Sample inventory data for integration
const sampleInventoryItems = [
  {
    id: 1,
    name: 'Olive Oil',
    category: 'Food & Pantry',
    currentStock: 1,
    unit: 'Bottles',
    lowStockThreshold: 2,
    storageLocation: 'Kitchen pantry - top shelf',
    autoAddToShopping: true,
    dateAdded: '2025-01-15'
  },
  {
    id: 2,
    name: 'Dishwasher Tablets',
    category: 'Household Supplies',
    currentStock: 3,
    unit: 'Pieces',
    lowStockThreshold: 5,
    storageLocation: 'Kitchen cabinet under sink',
    autoAddToShopping: true,
    dateAdded: '2025-01-10'
  },
  {
    id: 3,
    name: 'Hand Soap',
    category: 'Toiletries & Personal Care',
    currentStock: 1,
    unit: 'Bars',
    lowStockThreshold: 3,
    storageLocation: 'Bathroom cabinet',
    autoAddToShopping: true,
    dateAdded: '2025-01-12'
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventoryItems, setInventoryItems] = useState(sampleInventoryItems);
  const [shoppingItems, setShoppingItems] = useState([]);

  // Handle inventory updates from shopping purchases
  const handleInventoryUpdate = (inventoryId, quantityPurchased) => {
    setInventoryItems(prev => prev.map(item => 
      item.id === inventoryId 
        ? { ...item, currentStock: item.currentStock + quantityPurchased }
        : item
    ));
  };

  // Handle shopping list generation from inventory
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

    // Prevent duplicates - check if items from this inventory item already exist
    const existingInventoryIds = shoppingItems
      .filter(item => item.fromInventory)
      .map(item => item.inventoryId);

    const uniqueNewItems = newShoppingItems.filter(item => 
      !existingInventoryIds.includes(item.inventoryId)
    );

    if (uniqueNewItems.length > 0) {
      setShoppingItems(prev => [...prev, ...uniqueNewItems]);
      // Switch to shopping tab to show the generated list
      setActiveTab('shopping');
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
    { id: 'users', label: 'Users', icon: Users }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'tasks':
        return <TaskManagement />;
      case 'inventory':
        return <InventoryManagement 
          inventoryItems={inventoryItems} 
          setInventoryItems={setInventoryItems}
          onGenerateShoppingList={handleGenerateShoppingList}
        />;
      case 'shopping':
        return <ShoppingList 
          inventoryItems={inventoryItems} 
          onUpdateInventory={handleInventoryUpdate}
          shoppingItems={shoppingItems}
          setShoppingItems={setShoppingItems}
        />;
      case 'users':
        return <UserManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-900 to-amber-400 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
                Mûcií
              </h1>
              <p className="text-xs text-gray-500">Home, simplified</p>
            </div>
            </div>

            {/* Navigation */}
            <nav className="flex space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-purple-900 to-purple-800 text-white shadow-lg shadow-purple-900/25'
                        : 'text-gray-600 hover:text-purple-800 hover:bg-white/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
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