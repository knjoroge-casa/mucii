import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Loader2, Home } from 'lucide-react';

interface HouseholdSetupProps {
  userId: string;
  userFullName: string;
  onSetupComplete: (houseName: string) => void;
}

const HouseholdSetup: React.FC<HouseholdSetupProps> = ({ userId, userFullName, onSetupComplete }) => {
  const [houseName, setHouseName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const firstName = userFullName?.split(' ')[0] || 'there';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseName.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Save household name to Supabase
      const { error: upsertError } = await supabase
        .from('household_settings')
        .upsert({
          owner_id: userId,
          house_name: houseName.trim(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'owner_id' });

      if (upsertError) throw upsertError;

      // Also persist to localStorage as fallback
      localStorage.setItem('houseName', houseName.trim());
      onSetupComplete(houseName.trim());
    } catch (err: any) {
      console.error('Could not save household name:', err.message);
      // Still proceed — localStorage fallback is set
      localStorage.setItem('houseName', houseName.trim());
      onSetupComplete(houseName.trim());
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ["The Kamau Home", "Casa Njoroge", "The Wanjiku Residence", "Home Sweet Home"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center space-x-3 mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-900 to-amber-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">Mûcií</h1>
            <p className="text-xs text-gray-500">Home, simplified</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Home className="w-8 h-8 text-purple-700" />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {firstName}! 🎉
            </h2>
            <p className="text-gray-500">
              Let's start by giving your home a name. This will appear throughout the app.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                House name
              </label>
              <input
                type="text"
                required
                value={houseName}
                onChange={e => setHouseName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                placeholder="e.g. The Kamau Home"
                maxLength={50}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{houseName.length}/50</p>
            </div>

            {/* Suggestions */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Need inspiration?</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setHouseName(s)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-100 transition-all border border-purple-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !houseName.trim()}
              className="w-full bg-gradient-to-r from-purple-900 to-purple-800 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Setting up...' : "Let's go →"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HouseholdSetup;
