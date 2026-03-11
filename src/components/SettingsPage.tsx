import React, { useState, useEffect } from 'react';
import { Home, Users, Save, Plus, Edit3, Check, Loader2 } from 'lucide-react';
import UserManagement from './UserManagement';
import { getPermissions } from '../utils/permissions';
import { supabase } from '../utils/supabaseClient';

interface HomeEntry {
  id: string;
  name: string;
}

interface SettingsPageProps {
  houseName: string;
  setHouseName: (name: string) => void;
  tasks?: any[];
  activeUserRole?: string;
  activeHomeId?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  houseName, setHouseName, tasks = [], activeUserRole = 'viewer', activeHomeId
}) => {
  const can = getPermissions(activeUserRole);
  const [activeSection, setActiveSection] = useState('house');

  // House Customization state
  const [homes, setHomes] = useState<HomeEntry[]>([]);
  const [homesLoading, setHomesLoading] = useState(true);
  const [editingHomeId, setEditingHomeId] = useState<string | null>(null);
  const [editingHomeName, setEditingHomeName] = useState('');
  const [savingHomeId, setSavingHomeId] = useState<string | null>(null);
  const [savedHomeId, setSavedHomeId] = useState<string | null>(null);
  const [showAddHome, setShowAddHome] = useState(false);
  const [newHomeName, setNewHomeName] = useState('');
  const [addingHome, setAddingHome] = useState(false);
  const [homeError, setHomeError] = useState('');

  useEffect(() => {
    if (activeSection !== 'house' || !can.canEditHouseName) return;
    const load = async () => {
      setHomesLoading(true);
      const { data } = await supabase
        .from('homes')
        .select('id, name')
        .order('created_at', { ascending: true });
      setHomes(data || []);
      setHomesLoading(false);
    };
    load();
  }, [activeSection]);

  const handleStartEdit = (home: HomeEntry) => {
    setEditingHomeId(home.id);
    setEditingHomeName(home.name);
  };

  const handleSaveHome = async (homeId: string) => {
    if (!editingHomeName.trim()) return;
    setSavingHomeId(homeId);
    const { error } = await supabase
      .from('homes')
      .update({ name: editingHomeName.trim() })
      .eq('id', homeId);
    if (!error) {
      setHomes(prev => prev.map(h => h.id === homeId ? { ...h, name: editingHomeName.trim() } : h));
      if (homeId === activeHomeId) setHouseName(editingHomeName.trim());
      setSavedHomeId(homeId);
      setTimeout(() => setSavedHomeId(null), 2000);
    }
    setEditingHomeId(null);
    setSavingHomeId(null);
  };

  const handleAddHome = async () => {
    if (!newHomeName.trim()) return;
    setAddingHome(true);
    setHomeError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('homes')
        .insert({ name: newHomeName.trim(), owner_id: user?.id })
        .select('id, name')
        .single();
      if (error) throw error;
      // Add owner as member of new home
      await supabase.from('home_members').insert({
        home_id: data.id, user_id: user?.id, display_order: 0
      });
      setHomes(prev => [...prev, data]);
      setNewHomeName('');
      setShowAddHome(false);
    } catch (err: any) {
      setHomeError(`Could not add home: ${err.message}`);
    } finally {
      setAddingHome(false);
    }
  };

  const sections = [
    { id: 'house', name: 'House Customization', icon: Home },
    ...(can.canManageUsers ? [{ id: 'users', name: 'User Management', icon: Users }] : [])
  ];

  const renderHouseCustomization = () => {
    if (!can.canEditHouseName) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Home className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Only the Owner can edit house settings.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">Your Homes</h3>
          <p className="text-gray-500 text-sm mb-6">Rename your homes or add a new one.</p>

          {homesLoading ? (
            <div className="flex items-center space-x-3 py-8">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              <span className="text-gray-500 text-sm">Loading homes...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {homes.map(home => (
                <div key={home.id}
                  className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all ${
                    home.id === activeHomeId
                      ? 'bg-purple-50/60 border-purple-200'
                      : 'bg-white/70 border-white/50'
                  }`}>
                  {/* Home initial */}
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-900 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {home.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name / edit field */}
                  <div className="flex-1 min-w-0">
                    {editingHomeId === home.id ? (
                      <input
                        type="text"
                        value={editingHomeName}
                        onChange={e => setEditingHomeName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveHome(home.id);
                          if (e.key === 'Escape') setEditingHomeId(null);
                        }}
                        autoFocus
                        className="w-full px-3 py-1.5 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                      />
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">{home.name}</span>
                        {home.id === activeHomeId && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-medium">Current</span>
                        )}
                        {savedHomeId === home.id && (
                          <span className="text-xs text-green-600 font-medium">Saved!</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {editingHomeId === home.id ? (
                    <div className="flex space-x-2">
                      <button onClick={() => setEditingHomeId(null)}
                        className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={() => handleSaveHome(home.id)} disabled={!!savingHomeId}
                        className="px-3 py-1.5 text-sm text-white bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg disabled:opacity-60 flex items-center space-x-1">
                        {savingHomeId === home.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Check className="w-3 h-3" />}
                        <span>Save</span>
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleStartEdit(home)}
                      className="p-2 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add home row */}
              {!showAddHome ? (
                <button onClick={() => setShowAddHome(true)}
                  className="w-full flex items-center space-x-3 p-4 rounded-2xl border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50/30 transition-all text-purple-400 hover:text-purple-700">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-50">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-sm">Add another home</span>
                </button>
              ) : (
                <div className="p-4 rounded-2xl border border-purple-200 bg-white/70 space-y-3">
                  <input
                    type="text"
                    value={newHomeName}
                    onChange={e => setNewHomeName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddHome();
                      if (e.key === 'Escape') { setShowAddHome(false); setNewHomeName(''); }
                    }}
                    placeholder="e.g. Nairobi, The Farm..."
                    autoFocus
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                  {homeError && <p className="text-red-500 text-sm">{homeError}</p>}
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => { setShowAddHome(false); setNewHomeName(''); setHomeError(''); }}
                      className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleAddHome} disabled={addingHome || !newHomeName.trim()}
                      className="px-4 py-2 text-sm text-white bg-gradient-to-r from-purple-900 to-purple-800 rounded-xl disabled:opacity-60 flex items-center space-x-2">
                      {addingHome && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Add Home</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-600 mt-1">Customize your home management experience</p>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button key={section.id} onClick={() => setActiveSection(section.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-purple-900 to-purple-800 text-white'
                    : 'text-gray-600 hover:text-purple-900 hover:bg-purple-50'
                }`}>
                <Icon className="w-5 h-5" />
                <span>{section.name}</span>
              </button>
            );
          })}
        </div>

        <div className="p-8">
          {activeSection === 'house' && renderHouseCustomization()}
          {activeSection === 'users' && (
            <UserManagement tasks={tasks} activeUserRole={activeUserRole} activeHomeId={activeHomeId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
