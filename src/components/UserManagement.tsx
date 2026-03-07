import React, { useState, useEffect } from 'react';
import { Plus, User, Edit3, Trash2, Calendar, Loader2, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface HouseholdUser {
  id: string;
  full_name: string;
  role: string;
  is_owner: boolean;
  hashed_pin: string | null;
  display_order: number;
  created_at: string;
}

interface UserManagementProps {
  tasks?: any[];
  activeUserRole?: string;
}

const emptyForm = { full_name: '', role: 'member', pin: '', confirmPin: '' };

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  housekeeper: 'bg-amber-100 text-amber-800',
  viewer: 'bg-gray-100 text-gray-600',
  member: 'bg-gray-100 text-gray-600',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access except user management',
  housekeeper: 'Tasks, inventory stock, shopping list',
  viewer: 'Read-only access to all pages',
  member: 'Read-only access to all pages',
};

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

const UserManagement: React.FC<UserManagementProps> = ({ tasks = [], activeUserRole = 'owner' }) => {
  const [users, setUsers] = useState<HouseholdUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<HouseholdUser | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<HouseholdUser | null>(null);
  const [pinResetUser, setPinResetUser] = useState<HouseholdUser | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [userForm, setUserForm] = useState(emptyForm);
  const [formPinError, setFormPinError] = useState('');
  const [ownerHouseholdId, setOwnerHouseholdId] = useState<string | null>(null);

  const isOwner = activeUserRole === 'owner';
  const isAdmin = activeUserRole === 'admin';

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Not authenticated');

        // Get owner's household_id
        const { data: ownerRow } = await supabase
          .from('users')
          .select('household_id')
          .eq('id', authUser.id)
          .single();

        if (ownerRow?.household_id) setOwnerHouseholdId(ownerRow.household_id);

        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, role, is_owner, hashed_pin, display_order, created_at')
          .order('display_order', { ascending: true })
          .order('full_name', { ascending: true });

        if (error) throw error;
        setUsers(data || []);
      } catch (err: any) {
        console.error('Could not load users:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormPinError('');

    // Validate PIN
    if (!editingUser) {
      if (userForm.pin.length !== 4 || !/^\d{4}$/.test(userForm.pin)) {
        setFormPinError('PIN must be exactly 4 digits.');
        return;
      }
      if (userForm.pin !== userForm.confirmPin) {
        setFormPinError('PINs do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const hashed = userForm.pin ? await hashPin(userForm.pin) : undefined;

      if (editingUser) {
        const updateData: any = {
          full_name: userForm.full_name,
          role: userForm.role,
        };
        // Only update PIN if a new one was provided
        if (userForm.pin) {
          if (userForm.pin !== userForm.confirmPin) {
            setFormPinError('PINs do not match.');
            setSaving(false);
            return;
          }
          if (!/^\d{4}$/.test(userForm.pin)) {
            setFormPinError('PIN must be exactly 4 digits.');
            setSaving(false);
            return;
          }
          updateData.hashed_pin = await hashPin(userForm.pin);
        }
        const { data, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id)
          .select()
          .single();
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...data } : u));
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        // Get household_id fresh — state may not be populated yet
        let householdId = ownerHouseholdId;
        if (!householdId && authUser) {
          const { data: ownerRow } = await supabase
            .from('users')
            .select('household_id')
            .eq('id', authUser.id)
            .single();
          householdId = ownerRow?.household_id ?? null;
        }
        const { data, error } = await supabase
          .from('users')
          .insert({
            id: crypto.randomUUID(),
            full_name: userForm.full_name,
            role: userForm.role,
            is_owner: false,
            hashed_pin: hashed,
            household_id: householdId,
            display_order: users.length,
          })
          .select()
          .single();
        if (error) throw error;
        setUsers(prev => [...prev, data]);
      }

      setShowUserForm(false);
      setEditingUser(null);
      setUserForm(emptyForm);
    } catch (err: any) {
      console.error('Could not save user:', err.message);
      setFormPinError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: HouseholdUser) => {
    setUserForm({ full_name: user.full_name, role: user.role, pin: '', confirmPin: '' });
    setFormPinError('');
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteConfirm = async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    setDeleteConfirmUser(null);
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Could not delete user:', err.message);
    }
  };

  const handlePinReset = async () => {
    if (!pinResetUser) return;
    setPinError('');
    if (!/^\d{4}$/.test(newPin)) { setPinError('PIN must be exactly 4 digits.'); return; }
    if (newPin !== confirmNewPin) { setPinError('PINs do not match.'); return; }

    setPinSaving(true);
    try {
      const hashed = await hashPin(newPin);
      const { error } = await supabase
        .from('users')
        .update({ hashed_pin: hashed })
        .eq('id', pinResetUser.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === pinResetUser.id ? { ...u, hashed_pin: hashed } : u));
      setPinResetUser(null);
      setNewPin('');
      setConfirmNewPin('');
    } catch (err: any) {
      setPinError('Could not update PIN. Please try again.');
    } finally {
      setPinSaving(false);
    }
  };

  const canResetPin = (targetUser: HouseholdUser) => {
    if (isOwner) return true;
    if (isAdmin && !targetUser.is_owner) return true;
    return false;
  };

  const getTaskStats = (userName: string) => {
    const userTasks = tasks.filter((t: any) => t.assignee === userName);
    return {
      active: userTasks.filter((t: any) => !t.completed).length,
      completed: userTasks.filter((t: any) => t.completed).length,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600 font-medium">Loading members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Household Members</h3>
          <p className="text-gray-500 text-sm mt-1">Manage who has access and what they can do</p>
        </div>
        {isOwner && (
          <button
            onClick={() => { setUserForm(emptyForm); setFormPinError(''); setEditingUser(null); setShowUserForm(true); }}
            className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {users.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {users.map((user) => {
            const stats = getTaskStats(user.full_name);
            return (
              <div key={user.id} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-gray-900">{user.full_name}</h3>
                        {user.hashed_pin ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-green-500" title="PIN set" />
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">No PIN</span>
                        )}
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${ROLE_COLORS[user.role] || ROLE_COLORS.member}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {canResetPin(user) && (
                      <button
                        onClick={() => { setPinResetUser(user); setNewPin(''); setConfirmNewPin(''); setPinError(''); }}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                        title="Set / Reset PIN"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    )}
                    {isOwner && !user.is_owner && (
                      <>
                        <button onClick={() => handleEdit(user)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirmUser(user)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Added {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>

                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-900">{stats.active}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Active Tasks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Completed</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/50 rounded-2xl p-12 border border-white/50 text-center">
          <User className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No members yet</h3>
          <p className="text-gray-500 mb-6 text-sm">Add household members to assign tasks and track activity</p>
          {isOwner && (
            <button
              onClick={() => { setUserForm(emptyForm); setFormPinError(''); setEditingUser(null); setShowUserForm(true); }}
              className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Add First Member
            </button>
          )}
        </div>
      )}

      {/* PIN Reset Modal */}
      {pinResetUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {pinResetUser.hashed_pin ? 'Reset PIN' : 'Set PIN'} — {pinResetUser.full_name}
              </h2>
              <button onClick={() => setPinResetUser(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New 4-digit PIN</label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                    placeholder="••••"
                    maxLength={4}
                  />
                  <button type="button" onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={confirmNewPin}
                  onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                  placeholder="••••"
                  maxLength={4}
                />
              </div>
              {pinError && <p className="text-red-600 text-sm font-medium">{pinError}</p>}
              <div className="flex justify-end space-x-4 pt-2">
                <button onClick={() => setPinResetUser(null)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button onClick={handlePinReset} disabled={pinSaving || newPin.length !== 4}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center space-x-2">
                  {pinSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{pinSaving ? 'Saving...' : 'Save PIN'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Remove Member</h2>
              <p className="text-gray-600 mb-6">
                Remove <span className="font-semibold">{deleteConfirmUser.full_name}</span> from your household? This cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button onClick={() => setDeleteConfirmUser(null)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button onClick={() => handleDeleteConfirm(deleteConfirmUser.id)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-all">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingUser ? 'Edit Member' : 'Add Member'}
              </h2>
              <button onClick={() => { setShowUserForm(false); setEditingUser(null); setUserForm(emptyForm); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input type="text" required
                  value={userForm.full_name}
                  onChange={e => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Maria Wanjiku"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <select value={userForm.role}
                  onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="housekeeper">Housekeeper</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[userForm.role]}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {editingUser ? 'New PIN (leave blank to keep current)' : '4-digit PIN *'}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={userForm.pin}
                    onChange={e => setUserForm(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    required={!editingUser}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                    placeholder="••••"
                    maxLength={4}
                  />
                  <button type="button" onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {userForm.pin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={userForm.confirmPin}
                    onChange={e => setUserForm(prev => ({ ...prev, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                    placeholder="••••"
                    maxLength={4}
                  />
                </div>
              )}

              {formPinError && <p className="text-red-600 text-sm font-medium">{formPinError}</p>}

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); setUserForm(emptyForm); }}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center space-x-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{saving ? 'Saving...' : editingUser ? 'Update Member' : 'Add Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
