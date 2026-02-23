import React from 'react';
import { Clock, AlertTriangle, ShoppingCart, TrendingUp, CheckCircle, Package } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    {
      title: 'Overdue Tasks',
      value: '3',
      icon: Clock,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      title: 'Low Stock Items',
      value: '5',
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      title: 'Shopping List',
      value: '12',
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Tasks This Week',
      value: '8',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    }
  ];

  const upcomingTasks = [
    { name: 'Deep clean bathroom', assignee: 'Maria', due: 'Tomorrow', priority: 'high' },
    { name: 'Grocery shopping', assignee: 'You', due: 'Today', priority: 'medium' },
    { name: 'Vacuum living room', assignee: 'John', due: 'Friday', priority: 'low' },
  ];

  const lowStockItems = [
    { name: 'Dishwasher detergent', current: '1 bottle', threshold: '2 bottles', category: 'Cleaning' },
    { name: 'Olive oil', current: '50ml', threshold: '200ml', category: 'Pantry' },
    { name: 'Hand soap', current: '1 bar', threshold: '3 bars', category: 'Toiletries' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent mb-2">
          Welcome back to Mûcií
        </h1>
        <p className="text-gray-600 text-lg">Your home management overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
            </div>
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
            <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">View All</button>
          </div>
          
          {upcomingTasks.length > 0 ? (
            <div className="space-y-4">
              {upcomingTasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-white/50 to-purple-50/50 rounded-xl border border-purple-100/50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{task.name}</h3>
                    <p className="text-sm text-gray-600">Assigned to {task.assignee} • Due {task.due}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-600' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {task.priority}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming tasks</p>
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
            <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">View All</button>
          </div>
          
          {lowStockItems.length > 0 ? (
            <div className="space-y-4">
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-white/50 to-amber-50/50 rounded-xl border border-amber-100/50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.current} remaining • {item.category}</p>
                  </div>
                  <button className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-3 py-1 rounded-lg text-xs font-medium hover:shadow-lg transition-all">
                    Add to List
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">All items well stocked</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;