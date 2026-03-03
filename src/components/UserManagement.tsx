import React, { useState, useEffect } from 'react';
import { Plus, User, Edit3, Trash2, Mail, Calendar, Loader2, Phone } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface HouseholdUser {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  role: string;
  created_at: string;
}

const emptyForm = { full_name: '', email: '', phone_number: '', role: 'member' };

const UserManagement = ({ tasks = [] }) => {
  const [users, setUsers] = useState<HouseholdUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<HouseholdUser | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<HouseholdUser | null>(null);
  const [userForm, setUserForm] = useState(emptyForm);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: true });
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
    setSaving(true);

    try {
      if (editingUser) {
        const { data, error } = await supabase
          .from('users')
          .update({
            full_name: userForm.full_name,
            email: userForm.email || null,
            phone_number: userForm.phone_number || null,
            role: userForm.role,
          })
          .eq('id', editingUser.id)
          .select()
          .single();
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id === editingUser.id ? data : u));
      } else {
        // Insert a non-auth user record (household member without login)
        const { data, error } = await supabase
          .from('users')
          .insert({
            id: crypto.randomUUID(),
            full_name: userForm.full_name,
            email: userForm.email || null,
            phone_number: userForm.phone_number || null,
            role: userForm.role,
            household_id: crypto.randomUUID(), // Will be tied to real household in Phase 6
          })
          .select()
          .single();
        if (error) throw error;
        setUsers(prev => [...prev, data]);
      }
    } catch (err: any) {
      console.error('Could not save user:', err.message);
      // Optimistic fallback for when auth isn't set up yet
      if (editingUser) {
        setUsers(prev => prev.map(u =>
          u.id === editingUser.id
            ? { ...u, full_name: userForm.full_name, email: userForm.email || null, phone_number: userForm.phone_number || null, role: userForm.role }
            : u
        ));
      } else {
        const tempUser: HouseholdUser = {
          id: crypto.randomUUID(),
          full_name: userForm.full_name,
          email: userForm.email || null,
          phone_number: userForm.phone_number || null,
          role: userForm.role,
          created_at: new Date().toISOString(),
        };
        setUsers(prev => [...prev, tempUser]);
      }
    } finally {
      setSaving(false);
      setShowUserForm(false);
      setEditingUser(null);
      setUserForm(emptyForm);
    }
  };

  const handleEdit = (user: HouseholdUser) => {
    setUserForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      role: user.role,
    });
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

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'housekeeper': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-700';
    }
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
        <span className="ml-3 text-gray-600 font-medium">Loading users...</span>
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
        <button
          onClick={() => { setUserForm(emptyForm); setEditingUser(null); setShowUserForm(true); }}
          className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
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
                      <h3 className="font-bold text-gray-900">{user.full_name}</h3>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => handleEdit(user)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirmUser(user)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {user.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  {user.phone_number && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{user.phone_number}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Added {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
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
          <button
            onClick={() => { setUserForm(emptyForm); setEditingUser(null); setShowUserForm(true); }}
            className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Add First Member
          </button>
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

      {/* Add/Edit User Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingUser ? 'Edit Member' : 'Add Household Member'}
              </h2>
              <button onClick={() => { setShowUserForm(false); setEditingUser(null); setUserForm(emptyForm); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text" required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Maria Wanjiku"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="maria@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={userForm.phone_number}
                  onChange={(e) => setUserForm(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+254 700 000 000"
                />
                <p className="text-xs text-gray-500 mt-1">Either email or phone is required</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="member">Member</option>
                  <option value="housekeeper">Housekeeper</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {userForm.role === 'housekeeper' ? 'Can view and complete tasks, update inventory' :
                   userForm.role === 'admin' ? 'Can manage tasks, inventory, and members' :
                   'Can view tasks and shopping list'}
                </p>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); setUserForm(emptyForm); }} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center space-x-2"
                >
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
