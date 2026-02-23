import React, { useState } from 'react';
import { Home, CheckSquare, Package, ShoppingCart, Settings, LogOut } from 'lucide-react';
import HomePage from './components/HomePage';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import TaskManagement from './components/TaskManagement';
import InventoryManagement from './components/InventoryManagement';
import ShoppingList from './components/ShoppingList';
import SettingsPage from './components/SettingsPage';
import { supabase } from './utils/supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showHomePage, setShowHomePage] = useState(true);
  
  // Real data from database
  const [inventoryItems, setInventoryItems] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // House customization
  const [houseName, setHouseName] = useState(() => {
    return localStorage.getItem('houseName') || 'Mûcií';
  });

  // Check for existing session on app load
  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        setCurrentUser(session.user);
        setShowHomePage(false);
        // Load user data here
      }
    };
    checkSession();
  }, []);

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

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowAuth(false);
    setShowHomePage(false);
  };

  const handleGetStarted = () => {
    setShowAuth(true);
    setShowHomePage(false);
  };

  const handleBackToHome = () => {
    setShowAuth(false);
    setShowHomePage(true);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setActiveTab('dashboard');
      setInventoryItems([]);
      setShoppingItems([]);
      setShowHomePage(true);
    }
  };

  // Show home page by default
  if (showHomePage && !isLoggedIn) {
    return <HomePage onGetStarted={handleGetStarted} />;
  }

  // Show auth page when requested
  if (!isLoggedIn) {
    if (showAuth) {
      return (
        <LandingPage 
          onLoginSuccess={handleLoginSuccess} 
          onBackToHome={handleBackToHome}
        />
      );
    }
  }

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
              <div className="flex items-center space-x-1 mr-4">
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
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