import React from 'react';
import { Clock, AlertTriangle, ShoppingCart, CheckCircle, Package } from 'lucide-react';

interface Task {
  id: number | string;
  title: string;
  assignee: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  zone: string;
}

interface InventoryItem {
  id: number | string;
  name: string;
  category: string;
  currentStock: number;
  lowStockThreshold: number;
  unit: string;
  autoAddToShopping: boolean;
}

interface ShoppingItem {
  id: number | string;
  name: string;
  completed: boolean;
}

interface DashboardProps {
  tasks?: Task[];
  inventoryItems?: InventoryItem[];
  shoppingItems?: ShoppingItem[];
  onNavigateToTab: (tab: string) => void;
  onAddToShoppingList: (item: InventoryItem) => void;
  houseName?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  tasks = [],
  inventoryItems = [],
  shoppingItems = [],
  onNavigateToTab,
  onAddToShoppingList,
  houseName = 'Mûcií'
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTasks = tasks.filter(t => !t.completed);
  const overdueTasks = activeTasks.filter(t => {
    if (!t.date) return false;
    const due = new Date(t.date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
  const upcomingTasks = activeTasks
    .filter(t => {
      if (!t.date) return true;
      const due = new Date(t.date);
      due.setHours(0, 0, 0, 0);
      return due >= today;
    })
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .slice(0, 4);

  const lowStockItems = inventoryItems.filter(
    item => item.currentStock <= item.lowStockThreshold
  );
  const pendingShoppingItems = shoppingItems.filter(s => !s.completed);

  const stats = [
    {
      title: 'Active Tasks',
      value: activeTasks.length,
      icon: CheckCircle,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      tab: 'tasks'
    },
    {
      title: 'Overdue Tasks',
      value: overdueTasks.length,
      icon: Clock,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      tab: 'tasks'
    },
    {
      title: 'Low Stock Items',
      value: lowStockItems.length,
      icon: AlertTriangle,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      tab: 'inventory'
    },
    {
      title: 'Shopping List',
      value: pendingShoppingItems.length,
      icon: ShoppingCart,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      tab: 'shopping'
    }
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isOverdue = (dateString: string) => {
    if (!dateString) return false;
    const due = new Date(dateString);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent mb-2">
          Welcome back to {houseName}
        </h1>
        <p className="text-gray-600 text-lg">Your home management overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <button
              key={index}
              onClick={() => onNavigateToTab(stat.tab)}
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className={`text-3xl font-bold mt-1 ${
                    stat.value > 0 && (stat.title === 'Overdue Tasks' || stat.title === 'Low Stock Items')
                      ? 'text-red-600'
                      : 'text-gray-900'
                  }`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Upcoming Tasks */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-purple-600" />
              Upcoming Tasks
            </h2>
            <button
              onClick={() => onNavigateToTab('tasks')}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors"
            >
              View All
            </button>
          </div>

          {upcomingTasks.length > 0 ? (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    isOverdue(task.date)
                      ? 'bg-red-50/50 border-red-100'
                      : 'bg-gradient-to-r from-white/50 to-purple-50/50 border-purple-100/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {task.assignee && `${task.assignee} · `}
                      <span className={isOverdue(task.date) ? 'text-red-500 font-medium' : ''}>
                        {formatDate(task.date)}
                      </span>
                    </p>
                  </div>
                  <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    task.priority === 'high' ? 'bg-red-100 text-red-600' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No active tasks</p>
              <p className="text-gray-400 text-sm mt-1">Add a task to get started</p>
              <button
                onClick={() => onNavigateToTab('tasks')}
                className="mt-4 text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                Go to Tasks →
              </button>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2 text-amber-600" />
              Low Stock Alerts
            </h2>
            <button
              onClick={() => onNavigateToTab('inventory')}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors"
            >
              View All
            </button>
          </div>

          {lowStockItems.length > 0 ? (
            <div className="space-y-3">
              {lowStockItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-white/50 to-amber-50/50 rounded-xl border border-amber-100/50"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {item.currentStock} {item.unit} remaining · {item.category}
                    </p>
                  </div>
                  <button
                    onClick={() => onAddToShoppingList(item)}
                    className="ml-3 bg-gradient-to-r from-purple-900 to-purple-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:shadow-lg transition-all flex-shrink-0"
                  >
                    + Shopping
                  </button>
                </div>
              ))}
              {lowStockItems.length > 4 && (
                <button
                  onClick={() => onNavigateToTab('inventory')}
                  className="w-full text-center text-sm text-purple-600 hover:text-purple-800 font-medium pt-1"
                >
                  +{lowStockItems.length - 4} more low stock items →
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">All stocked up</p>
              <p className="text-gray-400 text-sm mt-1">No items are running low</p>
              <button
                onClick={() => onNavigateToTab('inventory')}
                className="mt-4 text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                Go to Inventory →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
