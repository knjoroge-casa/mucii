import React, { useState, useEffect } from 'react';
import { Plus, User, Edit3, Trash2, Calendar, Loader2, KeyRound, Eye, EyeOff, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
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

interface HomeGroup {
  id: string;
  name: string;
  members: HouseholdUser[];
}

interface UserManagementProps {
  tasks?: any[];
  activeUserRole?: string;
  activeHomeId?: string;
}

const emptyForm = { full_name: '', role: 'viewer', pin: '', confirmPin: '' };

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
};

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

const UserManagement: React.FC<UserManagementProps> = ({ tasks = [], activeUserRole = 'owner', activeHomeId }) => {
  const [homeGroups, setHomeGroups] = useState<HomeGroup[]>([]);
  const [allUsers, setAllUsers] = useState<HouseholdUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsedHomes, setCollapsedHomes] = useState<Set<string>>(new Set());
  const [targetHomeId, setTargetHomeId] = useState<string | null>(null);

  // Modals
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<HouseholdUser | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<HouseholdUser | null>(null);
  const [pinResetUser, setPinResetUser] = useState<HouseholdUser | null>(null);
  const [showAddExisting, setShowAddExisting] = useState(false);

  // PIN state
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  // Form
  const [userForm, setUserForm] = useState(emptyForm);
  const [formPinError, setFormPinError] = useState('');

  const isOwner = activeUserRole === 'owner';
  const isAdmin = activeUserRole === 'admin';

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: homesData } = await supabase
        .from('homes').select('id, name').order('created_at', { ascending: true });

      const { data: membersData } = await supabase
        .from('home_members')
        .select('home_id, display_order, users(id, full_name, role, is_owner, hashed_pin, created_at)')
        .order('display_order', { ascending: true });

      const { data: usersData } = await supabase
        .from('users').select('id, full_name, role, is_owner, hashed_pin, display_order, created_at')
        .order('full_name', { ascending: true });

      setAllUsers(usersData || []);

      const groups: HomeGroup[] = (homesData || []).map(home => {
        const members = (membersData || [])
          .filter((row: any) => row.home_id === home.id)
          .map((row: any) => ({ ...row.users, display_order: row.display_order }))
          .filter(Boolean) as HouseholdUser[];
        return { id: home.id, name: home.name, members };
      });

      setHomeGroups(groups);
    } catch (err: any) {
      console.error('Could not load data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollapse = (homeId: string) => {
    setCollapsedHomes(prev => {
      const next = new Set(prev);
      next.has(homeId) ? next.delete(homeId) : next.add(homeId);
      return next;
    });
  };

  const membersInHome = (homeId: string) =>
    homeGroups.find(g => g.id === homeId)?.members || [];

  const usersNotInHome = (homeId: string) => {
    const inHome = new Set(membersInHome(homeId).map(m => m.id));
    return allUsers.filter(u => !inHome.has(u.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormPinError('');
    if (!editingUser) {
      if (!/^\d{4}$/.test(userForm.pin)) { setFormPinError('PIN must be exactly 4 digits.'); return; }
      if (userForm.pin !== userForm.confirmPin) { setFormPinError('PINs do not match.'); return; }
    }
    setSaving(true);
    try {
      if (editingUser) {
        const updateData: any = { full_name: userForm.full_name, role: userForm.role };
        if (userForm.pin) {
          if (userForm.pin !== userForm.confirmPin) { setFormPinError('PINs do not match.'); setSaving(false); return; }
          if (!/^\d{4}$/.test(userForm.pin)) { setFormPinError('PIN must be 4 digits.'); setSaving(false); return; }
          updateData.hashed_pin = await hashPin(userForm.pin);
        }
        const { data, error } = await supabase.from('users').update(updateData).eq('id', editingUser.id).select().single();
        if (error) throw error;
        setHomeGroups(prev => prev.map(g => ({
          ...g, members: g.members.map(m => m.id === editingUser.id ? { ...m, ...data } : m)
        })));
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const hashed = await hashPin(userForm.pin);
        const { data, error } = await supabase.from('users').insert({
          id: crypto.randomUUID(),
          full_name: userForm.full_name,
          email: null,
          role: userForm.role,
          is_owner: false,
          hashed_pin: hashed,
          household_id: authUser?.id,
          display_order: allUsers.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select().single();
        if (error) throw error;

        const homeId = targetHomeId || activeHomeId;
        if (homeId) {
          const currentMembers = membersInHome(homeId);
          await supabase.from('home_members').insert({
            home_id: homeId, user_id: data.id, display_order: currentMembers.length
          });
          setHomeGroups(prev => prev.map(g =>
            g.id === homeId ? { ...g, members: [...g.members, data] } : g
          ));
        }
        setAllUsers(prev => [...prev, data]);
      }
      setShowUserForm(false);
      setEditingUser(null);
      setUserForm(emptyForm);
      setTargetHomeId(null);
    } catch (err: any) {
      setFormPinError(`Could not save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddExisting = async (user: HouseholdUser) => {
    if (!targetHomeId) return;
    try {
      const currentMembers = membersInHome(targetHomeId);
      await supabase.from('home_members').insert({
        home_id: targetHomeId, user_id: user.id, display_order: currentMembers.length
      });
      setHomeGroups(prev => prev.map(g =>
        g.id === targetHomeId ? { ...g, members: [...g.members, user] } : g
      ));
      setShowAddExisting(false);
      setTargetHomeId(null);
    } catch (err: any) {
      console.error('Could not add existing user:', err.message);
    }
  };

  const handleEdit = (user: HouseholdUser) => {
    setUserForm({ full_name: user.full_name, role: user.role, pin: '', confirmPin: '' });
    setFormPinError('');
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteConfirm = async (userId: string) => {
    setDeleteConfirmUser(null);
    try {
      await supabase.from('users').delete().eq('id', userId);
      setHomeGroups(prev => prev.map(g => ({ ...g, members: g.members.filter(m => m.id !== userId) })));
      setAllUsers(prev => prev.filter(u => u.id !== userId));
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
      const { error } = await supabase.from('users').update({ hashed_pin: hashed }).eq('id', pinResetUser.id);
      if (error) throw error;
      setHomeGroups(prev => prev.map(g => ({
        ...g, members: g.members.map(m => m.id === pinResetUser.id ? { ...m, hashed_pin: hashed } : m)
      })));
      setPinResetUser(null);
      setNewPin('');
      setConfirmNewPin('');
    } catch {
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
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Household Members</h3>
        <p className="text-gray-500 text-sm mt-1">All members across your homes</p>
      </div>

      {homeGroups.map(group => {
        const isCurrentHome = group.id === activeHomeId;
        const isCollapsed = collapsedHomes.has(group.id);
        const available = usersNotInHome(group.id);

        return (
          <div key={group.id} className={`rounded-2xl border overflow-hidden transition-all ${
            isCurrentHome ? 'border-purple-200 shadow-md' : 'border-gray-200/70 shadow-sm'
          }`}>
            {/* Home header row */}
            <div className={`flex items-center justify-between px-6 py-4 ${
              isCurrentHome ? 'bg-purple-50/60' : 'bg-gray-50/60'
            }`}>
              <button onClick={() => toggleCollapse(group.id)}
                className="flex items-center space-x-3 flex-1 text-left min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                  isCurrentHome ? 'bg-gradient-to-br from-purple-900 to-amber-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="font-bold text-gray-900 truncate">{group.name}</span>
                  {isCurrentHome && (
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Current</span>
                  )}
                  <span className="text-sm text-gray-400 flex-shrink-0">· {group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
                </div>
                {isCollapsed
                  ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                  : <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                }
              </button>

              {isOwner && !isCollapsed && (
                <div className="flex space-x-2 ml-4 flex-shrink-0">
                  {available.length > 0 && (
                    <button
                      onClick={() => { setTargetHomeId(group.id); setShowAddExisting(true); }}
                      className="text-sm text-purple-700 border border-purple-200 bg-white px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-all font-medium flex items-center space-x-1">
                      <Plus className="w-3.5 h-3.5" /><span>Add Existing</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setTargetHomeId(group.id); setUserForm(emptyForm); setFormPinError(''); setEditingUser(null); setShowUserForm(true); }}
                    className="text-sm text-white bg-gradient-to-r from-purple-900 to-purple-800 px-3 py-1.5 rounded-lg shadow hover:shadow-md transition-all font-medium flex items-center space-x-1">
                    <Plus className="w-3.5 h-3.5" /><span>Add New</span>
                  </button>
                </div>
              )}
            </div>

            {/* Members */}
            {!isCollapsed && (
              <div className="p-5 bg-white/40">
                {group.members.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No members yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.members.map(user => {
                      const stats = getTaskStats(user.full_name);
                      return (
                        <div key={user.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                                {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <h4 className="font-bold text-gray-900 text-sm">{user.full_name}</h4>
                                  {user.hashed_pin
                                    ? <ShieldCheck className="w-3.5 h-3.5 text-green-500" title="PIN set" />
                                    : <span className="text-xs text-amber-600 font-medium">No PIN</span>
                                  }
                                </div>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${ROLE_COLORS[user.role] || ROLE_COLORS.member}`}>
                                  {user.role}
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-0.5">
                              {canResetPin(user) && (
                                <button onClick={() => { setPinResetUser(user); setNewPin(''); setConfirmNewPin(''); setPinError(''); }}
                                  className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="Set / Reset PIN">
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isOwner && !user.is_owner && (
                                <>
                                  <button onClick={() => handleEdit(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setDeleteConfirmUser(user)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 text-xs text-gray-400 mb-3">
                            <Calendar className="w-3 h-3" />
                            <span>Added {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>

                          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
                            <div>
                              <div className="text-xl font-bold text-purple-900">{stats.active}</div>
                              <div className="text-xs text-gray-400">Active</div>
                            </div>
                            <div>
                              <div className="text-xl font-bold text-green-600">{stats.completed}</div>
                              <div className="text-xs text-gray-400">Done</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Add Existing Modal ─────────────────────────── */}
      {showAddExisting && targetHomeId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Existing Member</h2>
              <button onClick={() => { setShowAddExisting(false); setTargetHomeId(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Adding to <span className="font-semibold text-gray-700">{homeGroups.find(g => g.id === targetHomeId)?.name}</span>.
            </p>
            <div className="space-y-2">
              {usersNotInHome(targetHomeId).map(user => (
                <button key={user.id} onClick={() => handleAddExisting(user)}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-all text-left">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                  </div>
                </button>
              ))}
              {usersNotInHome(targetHomeId).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">All your members are already in this home.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PIN Reset Modal ────────────────────────────── */}
      {pinResetUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]">
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
                  <input type={showPin ? 'text' : 'password'} value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                    placeholder="••••" maxLength={4} />
                  <button type="button" onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
                <input type={showPin ? 'text' : 'password'} value={confirmNewPin}
                  onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                  placeholder="••••" maxLength={4} />
              </div>
              {pinError && <p className="text-red-600 text-sm font-medium">{pinError}</p>}
              <div className="flex justify-end space-x-4 pt-2">
                <button onClick={() => setPinResetUser(null)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={handlePinReset} disabled={pinSaving || newPin.length !== 4}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg disabled:opacity-60 flex items-center space-x-2">
                  {pinSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{pinSaving ? 'Saving...' : 'Save PIN'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────── */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Remove Member</h2>
              <p className="text-gray-600 mb-6">
                Remove <span className="font-semibold">{deleteConfirmUser.full_name}</span> from all homes? This cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button onClick={() => setDeleteConfirmUser(null)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={() => handleDeleteConfirm(deleteConfirmUser.id)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-all">Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Member Modal ────────────────────── */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{editingUser ? 'Edit Member' : 'Add Member'}</h2>
                {!editingUser && targetHomeId && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    Adding to <span className="font-medium text-purple-700">{homeGroups.find(g => g.id === targetHomeId)?.name}</span>
                  </p>
                )}
              </div>
              <button onClick={() => { setShowUserForm(false); setEditingUser(null); setUserForm(emptyForm); setTargetHomeId(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input type="text" required value={userForm.full_name}
                  onChange={e => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Maria Wanjiku" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <select value={userForm.role}
                  onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500">
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
                  <input type={showPin ? 'text' : 'password'} value={userForm.pin}
                    onChange={e => setUserForm(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    required={!editingUser}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                    placeholder="••••" maxLength={4} />
                  <button type="button" onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {userForm.pin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
                  <input type={showPin ? 'text' : 'password'} value={userForm.confirmPin}
                    onChange={e => setUserForm(prev => ({ ...prev, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                    placeholder="••••" maxLength={4} />
                </div>
              )}

              {formPinError && <p className="text-red-600 text-sm font-medium">{formPinError}</p>}

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); setUserForm(emptyForm); setTargetHomeId(null); }}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">Cancel</button>
                <button type="submit" disabled={saving}
                  className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg disabled:opacity-60 flex items-center space-x-2">
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
