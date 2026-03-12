import React, { useState, useEffect } from 'react';
import { Home, CheckSquare, Package, ShoppingCart, Settings, Users } from 'lucide-react';
import { supabase } from './utils/supabaseClient';
import AuthPage from './components/AuthPage';
import HouseholdSetup from './components/HouseholdSetup';
import HomeSelectionScreen, { Home as HomeType } from './components/HomeSelectionScreen';
import PinSelectionScreen from './components/PinSelectionScreen';
import Dashboard from './components/Dashboard';
import TaskManagement from './components/TaskManagement';
import InventoryManagement from './components/InventoryManagement';
import ShoppingList from './components/ShoppingList';
import SettingsPage from './components/SettingsPage';

type AppScreen = 'loading' | 'auth' | 'setup' | 'home_select' | 'pin' | 'app';

interface OwnerUser {
  id: string;
  email: string;
  full_name: string;
}

export interface ActiveUser {
  id: string;
  full_name: string;
  role: string;
  is_owner: boolean;
}

function App() {
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [ownerUser, setOwnerUser] = useState<OwnerUser | null>(null);
  const [activeUser, setActiveUser] = useState<ActiveUser | null>(null);
  const [activeHome, setActiveHome] = useState<HomeType | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'shopping', name: 'Shopping', icon: ShoppingCart },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleSessionUser(session.user);
      } else {
        setScreen('auth');
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleSessionUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setOwnerUser(null);
        setActiveUser(null);
        setActiveHome(null);
        setScreen('auth');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSessionUser = async (authUser: any) => {
    const owner: OwnerUser = {
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email
    };
    setOwnerUser(owner);
    // Check if they've set up their first home
    const { data: homes } = await supabase
      .from('homes')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (!homes || homes.length === 0) {
      setScreen('setup');
    } else {
      setScreen('home_select'); // HomeSelectionScreen handles skip-if-one-home
    }
  };

  const handleAuthSuccess = () => {};

  const handleSetupComplete = async (name: string) => {
    // Create first home and add owner as member
    const { data: { user } } = await supabase.auth.getUser();
    const { data: home } = await supabase
      .from('homes')
      .insert({ name, owner_id: user?.id })
      .select('id, name')
      .single();
    if (home && user) {
      await supabase.from('home_members').insert({
        home_id: home.id,
        user_id: user.id,
        display_order: 0,
      });
      setActiveHome(home);
    }
    setScreen('pin');
  };

  const handleHomeSelected = (home: HomeType) => {
    setActiveHome(home);
    setScreen('pin');
  };

  const handleUserSelected = (user: ActiveUser) => {
    setActiveUser(user);
    setActiveTab('dashboard');
    setScreen('app');
  };

  const handleSwitchUser = () => {
    setActiveUser(null);
    setScreen('pin');
  };

  const handleSwitchHome = () => {
    setActiveHome(null);
    setScreen('home_select');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setActiveUser(null);
    setOwnerUser(null);
    setActiveHome(null);
    setScreen('auth');
  };

  const performedBy = () => activeUser?.id ?? ownerUser?.id ?? null;

  const handleAddToShoppingList = async (item: any) => {
    const alreadyAdded = shoppingItems.some((s: any) => s.fromInventory && s.inventoryId === item.id && !s.completed);
    if (alreadyAdded) return;
    const newItem = {
      id: `inv-${item.id}-${Date.now()}`,
      name: item.name, category: item.category,
      quantity: Math.max(item.lowStockThreshold - item.currentStock + 1, 1).toString(),
      unit: item.unit, preferredBrand: '', preferredStore: '',
      fromInventory: true, inventoryId: item.id,
      completed: false, dateAdded: new Date().toISOString()
    };
    setShoppingItems((prev: any[]) => [...prev, newItem]);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('shopping_items').insert({
        name: newItem.name, category: newItem.category, quantity: newItem.quantity,
        unit: newItem.unit, preferred_brand: '', preferred_store: '',
        from_inventory: true, inventory_id: item.id, completed: false,
        user_id: user?.id, performed_by: performedBy()
      }).select().single();
      if (error) throw error;
      setShoppingItems((prev: any[]) => prev.map((s: any) => s.id === newItem.id ? {
        id: data.id, name: data.name, category: data.category, quantity: data.quantity,
        unit: data.unit, preferredBrand: data.preferred_brand || '',
        preferredStore: data.preferred_store || '', fromInventory: data.from_inventory,
        inventoryId: data.inventory_id, completed: data.completed, dateAdded: data.created_at
      } : s));
    } catch (err: any) {
      console.error('Could not save to shopping list:', err.message);
    }
  };

  const handleUpdateInventory = (inventoryId: any, quantityPurchased: any) => {
    setInventoryItems((prev: any[]) => prev.map((item: any) =>
      item.id === inventoryId ? { ...item, currentStock: item.currentStock + quantityPurchased } : item
    ));
  };

  const handleGenerateShoppingList = async () => {
    const existingInventoryIds = shoppingItems
      .filter((item: any) => item.fromInventory && !item.completed).map((item: any) => item.inventoryId);
    const lowStockItems = (inventoryItems as any[]).filter((item: any) =>
      item.currentStock <= item.lowStockThreshold &&
      item.autoAddToShopping &&
      !existingInventoryIds.includes(item.id)
    );
    if (lowStockItems.length === 0) return;
    const newItems = lowStockItems.map((item: any) => ({
      id: `inv-${item.id}-${Date.now()}-${Math.random()}`,
      name: item.name, category: item.category,
      quantity: Math.max(item.lowStockThreshold - item.currentStock + 1, 1).toString(),
      unit: item.unit, preferredBrand: '', preferredStore: '',
      fromInventory: true, inventoryId: item.id, completed: false, dateAdded: new Date().toISOString()
    }));
    setShoppingItems((prev: any[]) => [...prev, ...newItems]);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = lowStockItems.map((item: any) => ({
        name: item.name, category: item.category,
        quantity: Math.max(item.lowStockThreshold - item.currentStock + 1, 1).toString(),
        unit: item.unit, preferred_brand: '', preferred_store: '',
        from_inventory: true, inventory_id: item.id, completed: false,
        user_id: user?.id, performed_by: performedBy()
      }));
      const { error } = await supabase.from('shopping_items').insert(payload);
      if (error) throw error;
    } catch (err: any) {
      console.error('Could not save generated shopping items:', err.message);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard tasks={tasks} inventoryItems={inventoryItems} shoppingItems={shoppingItems}
          onNavigateToTab={setActiveTab} onAddToShoppingList={handleAddToShoppingList} houseName={activeHome?.name || 'Mûcií'} />;
      case 'tasks':
        return <TaskManagement tasks={tasks} setTasks={setTasks} activeUserId={performedBy()} activeUserRole={activeUser?.role || 'viewer'} />;
      case 'inventory':
        return <InventoryManagement inventoryItems={inventoryItems} setInventoryItems={setInventoryItems}
          onGenerateShoppingList={handleGenerateShoppingList} activeUserId={performedBy()} activeUserRole={activeUser?.role || 'viewer'} />;
      case 'shopping':
        return <ShoppingList inventoryItems={inventoryItems} onUpdateInventory={handleUpdateInventory}
          shoppingItems={shoppingItems} setShoppingItems={setShoppingItems} activeUserId={performedBy()} activeUserRole={activeUser?.role || 'viewer'} />;
      case 'settings':
        return <SettingsPage houseName={activeHome?.name || ''} setHouseName={(name: string) => setActiveHome((h: HomeType | null) => h ? { ...h, name } : h)}
          tasks={tasks} activeUserRole={activeUser?.role || 'viewer'} activeHomeId={activeHome?.id} />;
      default:
        return <Dashboard tasks={tasks} inventoryItems={inventoryItems} shoppingItems={shoppingItems}
          onNavigateToTab={setActiveTab} onAddToShoppingList={handleAddToShoppingList} houseName={activeHome?.name || 'Mûcií'} />;
    }
  };

  // ── Screen routing ──────────────────────────────────────────

  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-900 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (screen === 'auth') return <AuthPage onAuthSuccess={handleAuthSuccess} />;

  if (screen === 'setup' && ownerUser) {
    return <HouseholdSetup userId={ownerUser.id} userFullName={ownerUser.full_name} onSetupComplete={handleSetupComplete} />;
  }

 if (screen === 'home_select') {
    return <HomeSelectionScreen
      onHomeSelected={handleHomeSelected}
      onSignOut={handleSignOut}
      activeUserId={activeUser?.id}
      isOwner={!activeUser || activeUser.is_owner}
    />;
  }

  if (screen === 'pin' && activeHome) {
    return (
      <PinSelectionScreen
        houseName={activeHome.name}
        homeId={activeHome.id}
        onUserSelected={handleUserSelected}
        onSignOut={handleSignOut}
      />
    );
  }

  // ── Main App ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img src="/assets/Mheaderlogo.png" alt="Mûcií" className="h-14 w-auto" />
            </div>

            {/* Nav */}
            <nav className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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

            {/* Active user + controls */}
{activeUser && (
  <div className="flex items-center space-x-2">
    {/* User pill */}
    <div className="flex items-center space-x-2 bg-white/70 border border-gray-200 rounded-full px-3 py-1.5">
      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
        {activeUser.full_name.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm font-medium text-gray-700">{activeUser.full_name.split(' ')[0]}</span>
      <span className="text-xs text-gray-400 capitalize">{activeUser.role}</span>
    </div>
   {/* Switch user */}
                <button onClick={handleSwitchUser}
                  className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-purple-900 transition-colors px-3 py-1.5 rounded-full hover:bg-purple-50"
                  title="Switch user">
                  <Users className="w-4 h-4" />
                  <span>Switch</span>
                </button>
                {/* Switch home — owner and admin only */}
                {(activeUser.is_owner || activeUser.role === 'admin') && (
                  <button onClick={handleSwitchHome}
                    className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-purple-900 transition-colors px-3 py-1.5 rounded-full hover:bg-purple-50"
                    title="Switch home">
                    <Home className="w-4 h-4" />
                    <span className="hidden sm:inline">{activeHome?.name}</span>
                  </button>
                )}
    {/* Switch home — only shown when owner */}
    
  </div>
)}

          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
