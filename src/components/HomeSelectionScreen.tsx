import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Loader2, LogOut, Plus } from 'lucide-react';

export interface Home {
  id: string;
  name: string;
}

interface HomeSelectionScreenProps {
  onHomeSelected: (home: Home) => void;
  onSignOut: () => void;
  activeUserId?: string;
  isOwner?: boolean;
}

const HomeSelectionScreen: React.FC<HomeSelectionScreenProps> = ({
  onHomeSelected,
  onSignOut,
  activeUserId,
  isOwner = true,
}) => {
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHomeName, setNewHomeName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        let list: Home[] = [];

        if (isOwner) {
          // Owner — fetch all homes they own
          const { data, error } = await supabase
            .from('homes')
            .select('id, name')
            .order('created_at', { ascending: true });
          if (error) throw error;
          list = data || [];
        } else {
          // Admin — fetch only homes they are a member of
          const { data, error } = await supabase
            .from('home_members')
            .select('homes(id, name)')
            .eq('user_id', activeUserId);
          if (error) throw error;
          list = (data || []).map((row: any) => row.homes).filter(Boolean);
        }

        setHomes(list);

        // Single home — skip selection screen entirely
        if (list.length === 1) {
          onHomeSelected(list[0]);
          return;
        }
      } catch (err: any) {
        console.error('Could not load homes:', err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAddHome = async () => {
    if (!newHomeName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('homes')
        .insert({ name: newHomeName.trim(), owner_id: user?.id })
        .select('id, name')
        .single();
      if (error) throw error;
      await supabase.from('home_members').insert({
        home_id: data.id,
        user_id: user?.id,
        display_order: 0,
      });
      setHomes((prev: Home[]) => [...prev, data]);
      setNewHomeName('');
      setShowAddForm(false);
    } catch (err: any) {
      setError(`Could not add home: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/assets/Mheaderlogo.png" alt="Mûcií" className="h-14 w-auto mx-auto mb-4" />
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">
      <div className="flex items-center justify-between px-6 pt-8 pb-2 max-w-5xl mx-auto">
        <img src="/assets/Mheaderlogo.png" alt="Mûcií" className="h-10 w-auto" />
        <button
          onClick={onSignOut}
          className="flex items-center space-x-2 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{greeting()}</h2>
          <p className="text-gray-500 text-lg">Which home are you managing today?</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 justify-items-center">
          {homes.map((home: Home) => (
            <button
              key={home.id}
              onClick={() => onHomeSelected(home)}
              className="w-full max-w-[180px] bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-900 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-md">
                {home.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{home.name}</h3>
            </button>
          ))}

          {/* Add home — owner only */}
          {isOwner && (
            <>
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full max-w-[180px] bg-white/40 backdrop-blur-sm rounded-2xl p-6 border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-white/60 transition-all duration-200 text-center"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-purple-50">
                    <Plus className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="font-medium text-purple-400 text-sm">Add a home</h3>
                </button>
              ) : (
                <div className="w-full max-w-[180px] bg-white rounded-2xl p-4 border border-purple-200 shadow-lg">
                  <input
                    type="text"
                    value={newHomeName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewHomeName(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAddHome()}
                    placeholder="Home name"
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                  />
                  {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => { setShowAddForm(false); setNewHomeName(''); setError(''); }}
                      className="flex-1 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddHome}
                      disabled={saving || !newHomeName.trim()}
                      className="flex-1 py-1.5 text-xs text-white bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg disabled:opacity-50 flex items-center justify-center"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeSelectionScreen;
