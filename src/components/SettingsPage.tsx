import React, { useState, useEffect } from 'react';
import { Home, Users, Plus, Edit3, Check, Loader2, Trash2, KeyRound, Eye, EyeOff } from 'lucide-react';
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

  // Homes state
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
  const [deleteConfirmHomeId, setDeleteConfirmHomeId] = useState<string | null>(null);
  const [deletingHomeId, setDeletingHomeId] = useState<string | null>(null);

  // Owner PIN state
  const [ownerPin, setOwnerPin] = useState('');
  const [ownerPinConfirm, setOwnerPinConfirm] = useState('');
  const [showOwnerPin, setShowOwnerPin] = useState(false);
  const [ownerPinError, setOwnerPinError] = useState('');
  const [ownerPinSaving, setOwnerPinSaving] = useState(false);
  const [ownerPinSaved, setOwnerPinSaved] = useState(false);

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

  const handleDeleteHome = async (homeId: string) => {
    setDeletingHomeId(homeId);
    try {
      const { error } = await supabase.from('homes').delete().eq('id', homeId);
      if (error) throw error;
      setHomes(prev => prev.filter(h => h.id !== homeId));
      setDeleteConfirmHomeId(null);
    } catch (err: any) {
      setHomeError(`Could not delete home: ${err.message}`);
    } finally {
      setDeletingHomeId(null);
    }
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

  const handleSaveOwnerPin = async () => {
    setOwnerPinError('');
    if (!/^\d{4}$/.test(ownerPin)) { setOwnerPinError('PIN must be exactly 4 digits.'); return; }
    if (ownerPin !== ownerPinConfirm) { setOwnerPinError('PINs do not match.'); return; }
    setOwnerPinSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(ownerPin));
      const hashed = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      const { error } = await supabase.from('users').update({ hashed_pin: hashed }).eq('id', user?.id);
      if (error) throw error;
      setOwnerPin('');
      setOwnerPinConfirm('');
      setOwnerPinSaved(true);
      setTimeout(() => setOwnerPinSaved(false), 2000);
    } catch (err: any) {
      setOwnerPinError(`Could not save PIN: ${err.message}`);
    } finally {
      setOwnerPinSaving(false);
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

    const deleteConfirmHome = homes.find(h => h.id === deleteConfirmHomeId);

    return (
      <div className="space-y-6">

        {/* Homes list */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">Your Homes</h3>
          <p className="text-gray-500 text-sm mb-6">Rename, add, or remove your homes.</p>

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

                  <div className="w-10 h-10 bg-gradient-to-br from-purple-900 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {home.name.charAt(0).toUpperCase()}
                  </div>

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
                    <div className="flex space-x-1">
                      <button onClick={() => handleStartEdit(home)}
                        className="p-2 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {/* Can't delete the current home or the only home */}
                      {home.id !== activeHomeId && homes.length > 1 && (
                        <button onClick={() => setDeleteConfirmHomeId(home.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add home */}
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

        {/* Owner PIN */}
        <div className="pt-8 border-t border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">Your PIN</h3>
          <p className="text-gray-500 text-sm mb-6">Set or update your 4-digit PIN for the home screen.</p>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New PIN</label>
              <div className="relative">
                <input
                  type={showOwnerPin ? 'text' : 'password'}
                  value={ownerPin}
                  onChange={e => setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                  placeholder="••••"
                  maxLength={4}
                />
                <button type="button" onClick={() => setShowOwnerPin(!showOwnerPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showOwnerPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
              <input
                type={showOwnerPin ? 'text' : 'password'}
                value={ownerPinConfirm}
                onChange={e => setOwnerPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                placeholder="••••"
                maxLength={4}
              />
            </div>
            {ownerPinError && <p className="text-red-600 text-sm font-medium">{ownerPinError}</p>}
            <div className="flex justify-end">
              <button
                onClick={handleSaveOwnerPin}
                disabled={ownerPinSaving || ownerPin.length !== 4}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  ownerPinSaved
                    ? 'bg-green-600 text-white'
                    : 'bg-gradient-to-r from-purple-900 to-purple-800 text-white shadow-lg hover:shadow-xl disabled:opacity-60'
                }`}>
                {ownerPinSaving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <KeyRound className="w-4 h-4" />}
                <span>{ownerPinSaved ? 'Saved!' : ownerPinSaving ? 'Saving...' : 'Save PIN'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Delete confirm modal */}
        {deleteConfirmHomeId && deleteConfirmHome && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Home</h2>
                <p className="text-gray-600 mb-2">
                  Delete <span className="font-semibold">{deleteConfirmHome.name}</span>?
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  This will remove the home and all its member associations. This cannot be undone.
                </p>
                {homeError && <p className="text-red-600 text-sm mb-4">{homeError}</p>}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => { setDeleteConfirmHomeId(null); setHomeError(''); }}
                    className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteHome(deleteConfirmHomeId)}
                    disabled={!!deletingHomeId}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-60 flex items-center space-x-2">
                    {deletingHomeId && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{deletingHomeId ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
