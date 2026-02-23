import React, { useState } from 'react';
import { Home, Users, Settings as SettingsIcon, Save, LogOut, User } from 'lucide-react';
import UserManagement from './UserManagement';

interface SettingsPageProps {
  houseName: string;
  setHouseName: (name: string) => void;
  onSignOut: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ houseName, setHouseName, onSignOut }) => {
  const [tempHouseName, setTempHouseName] = useState(houseName);
  const [activeSection, setActiveSection] = useState('house');
  const [saved, setSaved] = useState(false);

  const handleSaveHouseName = () => {
    setHouseName(tempHouseName);
    localStorage.setItem('houseName', tempHouseName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    { id: 'house', name: 'House Customization', icon: Home },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'account', name: 'Account', icon: User }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'house':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">House Name</h3>
              <p className="text-gray-600 mb-6">
                Customize your home's name. This will appear throughout the app to personalize your experience.
              </p>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      House Name
                    </label>
                    <input
                      type="text"
                      value={tempHouseName}
                      onChange={(e) => setTempHouseName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter your house name"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-gray-500">
                      Preview: "Welcome back to {tempHouseName || 'your home'}"
                    </p>
                    <button
                      onClick={handleSaveHouseName}
                      disabled={tempHouseName === houseName}
                      className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                        saved
                          ? 'bg-green-600 text-white'
                          : tempHouseName === houseName
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-900 to-purple-800 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>{saved ? 'Saved!' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'users':
        return <UserManagement />;
      
      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Account Settings</h3>
              <p className="text-gray-600 mb-6">
                Manage your account preferences and sign out of the application.
              </p>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Sign Out</h4>
                    <p className="text-gray-600 mb-4">
                      Sign out of your account and return to the home page.
                    </p>
                    <button
                      onClick={onSignOut}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-600 mt-1">Customize your home management experience</p>
      </div>

      {/* Settings Navigation */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-purple-900 to-purple-800 text-white'
                    : 'text-gray-600 hover:text-purple-900 hover:bg-purple-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{section.name}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Content */}
        <div className="p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;